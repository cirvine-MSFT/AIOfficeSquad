import { ipcMain, app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { readFile } from "fs/promises";
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
  eventHandlers = /* @__PURE__ */ new Set();
  deltaHandlers = /* @__PURE__ */ new Set();
  usageHandlers = /* @__PURE__ */ new Set();
  constructor(squadRoot) {
    this.squadRoot = squadRoot ?? process.cwd();
  }
  // ── Lifecycle ──────────────────────────────────────────────────
  async connect() {
    try {
      const { SquadClientWithPool } = await import("@bradygaster/squad-sdk/client");
      const { EventBus } = await import("@bradygaster/squad-sdk/runtime/event-bus");
      const { StreamingPipeline } = await import("@bradygaster/squad-sdk/runtime/streaming");
      const { RalphMonitor } = await import("@bradygaster/squad-sdk/ralph");
      this.eventBus = new EventBus();
      this.client = new SquadClientWithPool();
      this.pipeline = new StreamingPipeline();
      this.monitor = new RalphMonitor();
      this.eventBus.onAny((event) => {
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
      console.log("[SquadRuntime] connected");
    } catch (err) {
      console.error("[SquadRuntime] connect failed:", err);
      throw err;
    }
  }
  async shutdown() {
    try {
      if (this.pipeline?.stop) await this.pipeline.stop();
      if (this.monitor?.stop) await this.monitor.stop();
      if (this.client?.close) await this.client.close();
      this.eventHandlers.clear();
      this.deltaHandlers.clear();
      this.usageHandlers.clear();
      this.client = null;
      this.eventBus = null;
      this.pipeline = null;
      this.monitor = null;
      console.log("[SquadRuntime] shutdown complete");
    } catch (err) {
      console.error("[SquadRuntime] shutdown error:", err);
    }
  }
  // ── Session management ─────────────────────────────────────────
  async createSession(agentName, config) {
    if (!this.client) throw new Error("Runtime not connected");
    const session = await this.client.createSession({
      agent: agentName,
      ...config
    });
    return { sessionId: session.id ?? session.sessionId };
  }
  async sendMessage(sessionId, prompt) {
    if (!this.client) throw new Error("Runtime not connected");
    await this.client.sendMessage(sessionId, prompt);
  }
  async listSessions() {
    if (!this.client) throw new Error("Runtime not connected");
    return await this.client.listSessions();
  }
  async deleteSession(id) {
    if (!this.client) throw new Error("Runtime not connected");
    await this.client.deleteSession(id);
  }
  async getStatus() {
    if (!this.client) throw new Error("Runtime not connected");
    return await this.client.getStatus();
  }
  async getAuthStatus() {
    if (!this.client) throw new Error("Runtime not connected");
    return await this.client.getAuthStatus();
  }
  async listModels() {
    if (!this.client) throw new Error("Runtime not connected");
    return await this.client.listModels();
  }
  // ── Squad config & roster ──────────────────────────────────────
  async loadSquadConfig() {
    try {
      const { resolveSquad, loadConfig } = await import("@bradygaster/squad-sdk");
      const squadDir = await resolveSquad(this.squadRoot);
      const config = await loadConfig(squadDir);
      const members = await this.getRoster();
      return {
        name: config?.name ?? "unknown",
        root: squadDir,
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
  handle("squad:connect", (config) => runtime2.connect());
  handle("squad:disconnect", () => runtime2.shutdown());
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
  const send = (channel, payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };
  runtime2.onEvent((event) => send("squad:event", event));
  runtime2.onStreamDelta((delta) => send("squad:stream-delta", delta));
  runtime2.onUsage((usage) => send("squad:stream-usage", usage));
}
function removeIpcHandlers() {
  const channels = [
    "squad:connect",
    "squad:disconnect",
    "squad:create-session",
    "squad:send-message",
    "squad:list-sessions",
    "squad:delete-session",
    "squad:get-status",
    "squad:get-auth-status",
    "squad:list-models",
    "squad:load-config",
    "squad:get-roster",
    "squad:get-agent-statuses"
  ];
  for (const ch of channels) {
    ipcMain.removeHandler(ch);
  }
}
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
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
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
  runtime = new SquadRuntime(process.cwd());
  registerIpcHandlers(runtime, () => mainWindow);
  createWindow();
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
    await runtime.shutdown();
    runtime = null;
  }
});
