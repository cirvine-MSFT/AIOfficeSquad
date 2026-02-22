import { ipcMain, app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { readFile } from "fs/promises";
import { execSync } from "child_process";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
class SquadRuntime {
  client = null;
  eventBus = null;
  pipeline = null;
  monitor = null;
  squadRoot;
  _isReady = false;
  sessions = /* @__PURE__ */ new Map();
  eventHandlers = /* @__PURE__ */ new Set();
  deltaHandlers = /* @__PURE__ */ new Set();
  usageHandlers = /* @__PURE__ */ new Set();
  readyHandlers = /* @__PURE__ */ new Set();
  _initAttempted = false;
  _initPromise = null;
  constructor(squadRoot) {
    if (squadRoot) {
      this.squadRoot = squadRoot;
    } else {
      try {
        this.squadRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
      } catch {
        this.squadRoot = process.cwd();
      }
    }
  }
  get isReady() {
    return this._isReady;
  }
  // ── Lifecycle ──────────────────────────────────────────────────
  /**
   * Initialize the Squad SDK components. Safe to call — if SDK is unavailable
   * or auth fails, logs error but doesn't crash. Roster reading always works.
   */
  async initialize() {
    if (this._initAttempted) return this._initPromise ?? Promise.resolve();
    this._initAttempted = true;
    this._initPromise = (async () => {
      try {
        const { SquadClientWithPool } = await import("@bradygaster/squad-sdk/client");
        const { EventBus } = await import("@bradygaster/squad-sdk/runtime/event-bus");
        const { StreamingPipeline } = await import("@bradygaster/squad-sdk/runtime/streaming");
        const { RalphMonitor } = await import("@bradygaster/squad-sdk/ralph");
        this.eventBus = new EventBus();
        this.client = new SquadClientWithPool({});
        await this.client.connect();
        this.pipeline = new StreamingPipeline();
        this.monitor = new RalphMonitor();
        this.eventBus.subscribeAll((event) => {
          for (const handler of this.eventHandlers) {
            try {
              handler(event);
            } catch {
            }
          }
        });
        if (this.pipeline.onDelta) {
          this.pipeline.onDelta((delta) => {
            for (const handler of this.deltaHandlers) {
              try {
                handler(delta);
              } catch {
              }
            }
          });
        }
        if (this.pipeline.onUsage) {
          this.pipeline.onUsage((usage) => {
            for (const handler of this.usageHandlers) {
              try {
                handler(usage);
              } catch {
              }
            }
          });
        }
        this._isReady = true;
        console.log("[SquadRuntime] initialized successfully");
        for (const handler of this.readyHandlers) {
          try {
            handler();
          } catch {
          }
        }
      } catch (err) {
        console.error("[SquadRuntime] initialize failed (SDK unavailable or auth issue):", err);
        console.log("[SquadRuntime] continuing without SDK — roster reading still works");
      }
    })();
    return this._initPromise;
  }
  async cleanup() {
    try {
      if (this.pipeline?.stop) await this.pipeline.stop();
      if (this.monitor?.stop) await this.monitor.stop();
      if (this.client?.shutdown) await this.client.shutdown();
      this.sessions.clear();
      this.eventHandlers.clear();
      this.deltaHandlers.clear();
      this.usageHandlers.clear();
      this.readyHandlers.clear();
      this.client = null;
      this.eventBus = null;
      this.pipeline = null;
      this.monitor = null;
      this._isReady = false;
      console.log("[SquadRuntime] cleanup complete");
    } catch (err) {
      console.error("[SquadRuntime] cleanup error:", err);
    }
  }
  // ── Session management ─────────────────────────────────────────
  async createSession(agentName, config) {
    if (this._initAttempted && !this._isReady) {
      throw new Error("SDK not connected — Copilot CLI is not running");
    }
    if (!this.client) throw new Error("SDK not available");
    const session = await this.client.createSession({
      agent: agentName,
      ...config
    });
    const id = session.id ?? session.sessionId;
    this.sessions.set(id, session);
    return { sessionId: id };
  }
  async sendMessage(sessionId, prompt) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    await session.sendAndWait(prompt);
  }
  async listSessions() {
    if (!this._isReady || !this.client) throw new Error("SDK not available");
    return await this.client.listSessions();
  }
  async deleteSession(id) {
    const session = this.sessions.get(id);
    if (session?.destroy) {
      await session.destroy();
    }
    this.sessions.delete(id);
    if (this.client) {
      await this.client.deleteSession(id);
    }
  }
  async getStatus() {
    if (!this._isReady || !this.client) throw new Error("SDK not available");
    return await this.client.getStatus();
  }
  async getAuthStatus() {
    if (!this._isReady || !this.client) throw new Error("SDK not available");
    return await this.client.getAuthStatus();
  }
  async listModels() {
    if (!this._isReady || !this.client) throw new Error("SDK not available");
    return await this.client.listModels();
  }
  // ── Decisions & connection info ─────────────────────────────────
  async getDecisions() {
    const decPath = join(this.squadRoot, ".squad", "decisions.md");
    try {
      return await readFile(decPath, "utf-8");
    } catch {
      return "";
    }
  }
  getConnectionInfo() {
    return {
      connected: this._isReady,
      error: this._initAttempted && !this._isReady ? "SDK not connected" : void 0,
      squadRoot: this.squadRoot
    };
  }
  // ── Squad config & roster ──────────────────────────────────────
  async loadSquadConfig() {
    try {
      const members = await this.getRoster();
      const teamPath = join(this.squadRoot, ".squad", "team.md");
      let name = "Squad Office";
      try {
        const content = await readFile(teamPath, "utf-8");
        const nameMatch = content.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
      } catch {
      }
      return {
        name,
        root: this.squadRoot,
        members
      };
    } catch (err) {
      console.error("[SquadRuntime] loadSquadConfig failed:", err);
      throw err;
    }
  }
  async getRoster() {
    try {
      const teamPath = join(this.squadRoot, ".squad", "team.md");
      const content = await readFile(teamPath, "utf-8");
      return parseTeamMd(content);
    } catch (err) {
      console.error("[SquadRuntime] getRoster failed:", err);
      return [];
    }
  }
  async getAgentStatuses() {
    if (!this.monitor?.getStatus) return [];
    try {
      return await this.monitor.getStatus();
    } catch {
      return [];
    }
  }
  // ── Event subscriptions ────────────────────────────────────────
  onEvent(handler) {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }
  onStreamDelta(handler) {
    this.deltaHandlers.add(handler);
    return () => {
      this.deltaHandlers.delete(handler);
    };
  }
  onUsage(handler) {
    this.usageHandlers.add(handler);
    return () => {
      this.usageHandlers.delete(handler);
    };
  }
  onReady(handler) {
    this.readyHandlers.add(handler);
    if (this._isReady) {
      try {
        handler();
      } catch {
      }
    }
    return () => {
      this.readyHandlers.delete(handler);
    };
  }
}
function parseTeamMd(content) {
  const members = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|[\s-:]+\|/.test(trimmed) && trimmed.includes("---")) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    const cells = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3) {
      members.push({
        name: cells[0],
        role: cells[1],
        agent: cells[2],
        status: cells[3] ?? "active"
      });
    }
  }
  return members;
}
function registerIpcHandlers(runtime2, getMainWindow) {
  function handle(channel, fn) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        const data = await fn(...args);
        return { ok: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[IPC] ${channel} error:`, message);
        return { ok: false, error: message };
      }
    });
  }
  handle(
    "squad:get-ready-state",
    () => Promise.resolve({ ready: runtime2.isReady, squadRoot: runtime2["squadRoot"] })
  );
  handle(
    "squad:create-session",
    (agentName, config) => runtime2.createSession(agentName, config)
  );
  handle(
    "squad:send-message",
    (sessionId, prompt) => runtime2.sendMessage(sessionId, prompt)
  );
  handle("squad:list-sessions", () => runtime2.listSessions());
  handle("squad:delete-session", (id) => runtime2.deleteSession(id));
  handle("squad:get-status", () => runtime2.getStatus());
  handle("squad:get-auth-status", () => runtime2.getAuthStatus());
  handle("squad:list-models", () => runtime2.listModels());
  handle("squad:load-config", () => runtime2.loadSquadConfig());
  handle("squad:get-roster", () => runtime2.getRoster());
  handle("squad:get-agent-statuses", () => runtime2.getAgentStatuses());
  handle("squad:get-decisions", () => runtime2.getDecisions());
  handle(
    "squad:get-connection-info",
    () => Promise.resolve(runtime2.getConnectionInfo())
  );
  handle("squad:get-session-detail", async (sessionId) => {
    const sessions = await runtime2.listSessions();
    const session = sessions.find(
      (s) => (s.id ?? s.sessionId) === sessionId
    );
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    const config = await runtime2.loadSquadConfig();
    const agentStatuses = await runtime2.getAgentStatuses();
    const agentNames = session.agents ?? (session.agent ? [session.agent] : []);
    const agents = agentNames.map((name) => {
      const member = config.members.find((m) => m.name === name);
      const status = agentStatuses.find((a) => a.name === name);
      return {
        name,
        role: member?.role ?? "unknown",
        status: status?.status === "busy" ? "active" : status?.status === "error" ? "error" : "idle",
        model: session.model,
        activity: status?.lastActivity,
        lastActivityAt: void 0
      };
    });
    return {
      id: session.id ?? session.sessionId,
      name: session.name ?? `Session ${sessionId.slice(0, 8)}`,
      status: session.status === "active" ? "active" : session.status === "error" ? "error" : "idle",
      task: session.task ?? session.systemPrompt,
      squadId: config.root,
      squadName: config.name,
      agents,
      createdAt: session.createdAt ?? Date.now()
    };
  });
  const send = (channel, payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };
  runtime2.onEvent((event) => send("squad:event", event));
  runtime2.onStreamDelta((delta) => send("squad:stream-delta", delta));
  runtime2.onUsage((usage) => send("squad:stream-usage", usage));
  runtime2.onReady(() => {
    send("squad:connection-state", { connected: true });
  });
}
function removeIpcHandlers() {
  const channels = [
    "squad:get-ready-state",
    "squad:create-session",
    "squad:send-message",
    "squad:list-sessions",
    "squad:delete-session",
    "squad:get-status",
    "squad:get-auth-status",
    "squad:list-models",
    "squad:load-config",
    "squad:get-roster",
    "squad:get-agent-statuses",
    "squad:get-decisions",
    "squad:get-connection-info",
    "squad:get-session-detail"
  ];
  for (const ch of channels) {
    ipcMain.removeHandler(ch);
  }
}
process.on("uncaughtException", (err) => {
  console.error("[Main] UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Main] UNHANDLED REJECTION:", reason);
});
let mainWindow = null;
let runtime = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f172a",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[Main] RENDERER CRASHED:", details.reason, details.exitCode);
  });
  mainWindow.webContents.on("unresponsive", () => {
    console.error("[Main] RENDERER UNRESPONSIVE");
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, desc) => {
    console.error("[Main] RENDERER FAILED TO LOAD:", code, desc);
  });
  if (is.dev && process.env.NODE_ENV !== "test") {
    mainWindow.webContents.openDevTools({ mode: "bottom" });
  }
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(async () => {
  runtime = new SquadRuntime();
  registerIpcHandlers(runtime, () => mainWindow);
  runtime.initialize().catch((err) => {
    console.error("[Main] SDK initialization failed:", err);
  });
  runtime.onReady(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      runtime.loadSquadConfig().then((config) => {
        mainWindow?.webContents.send("squad:config-loaded", config);
      }).catch((err) => {
        console.error("[Main] Failed to load config:", err);
      });
      mainWindow.webContents.send("squad:connection-state", { connected: true });
    }
  });
  createWindow();
  mainWindow?.webContents.once("did-finish-load", async () => {
    try {
      const config = await runtime.loadSquadConfig();
      mainWindow?.webContents.send("squad:config-loaded", config);
      if (runtime.isReady) {
        mainWindow?.webContents.send("squad:connection-state", { connected: true });
      }
    } catch (err) {
      console.error("[Main] Failed to load initial config:", err);
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("will-quit", async () => {
  removeIpcHandlers();
  if (runtime) {
    await runtime.cleanup();
    runtime = null;
  }
});
