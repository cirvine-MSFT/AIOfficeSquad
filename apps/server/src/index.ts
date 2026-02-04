import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { spawn, ChildProcess } from "child_process";
import {
  EventEnvelopeSchema,
  validatePayload,
  type EventEnvelope,
  type AgentStatusPayload,
  type AgentMessagePayload,
  type AgentPositionPayload,
  type TaskAssignPayload
} from "../../../shared/src/schema";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.." );
const dataDir = path.join(rootDir, "data");
const agentsPath = path.join(dataDir, "agents.json");
const tasksPath = path.join(dataDir, "tasks.json");
const eventsPath = path.join(dataDir, "events.jsonl");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  const raw = readFileSync(filePath, "utf-8");
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

function writeJsonFile<T>(filePath: string, data: T) {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const AgentRecordSchema = z.object({
  agentId: z.string(),
  name: z.string().optional(),
  desk: z.object({ x: z.number(), y: z.number() }).optional(),
  status: z.enum(["idle", "working", "blocked", "finished", "reviewed", "available", "thinking", "replied", "error"]).optional(),
  summary: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  cliType: z.enum(["claude-code", "copilot-cli"]).optional(),
  workingDirectory: z.string().optional(),
  messages: z
    .array(
      z.object({
        text: z.string(),
        channel: z.enum(["log", "reply", "task"]),
        timestamp: z.string(),
        collapsible: z.boolean().optional()
      })
    )
    .default([]),
  lastSeen: z.string().optional()
});

type AgentRecord = z.infer<typeof AgentRecordSchema>;

const TaskRecordSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  title: z.string(),
  details: z.string().optional(),
  status: z.enum(["assigned", "done"]).default("assigned"),
  createdAt: z.string()
});

type TaskRecord = z.infer<typeof TaskRecordSchema>;

let agents = readJsonFile<AgentRecord[]>(agentsPath, []);
let tasks = readJsonFile<TaskRecord[]>(tasksPath, []);

function persistAgents() {
  writeJsonFile(agentsPath, agents);
}

function persistTasks() {
  writeJsonFile(tasksPath, tasks);
}

function appendEvent(event: EventEnvelope) {
  appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
}

function upsertAgent(agentId: string, update: Partial<AgentRecord>) {
  const existing = agents.find((a) => a.agentId === agentId);
  if (existing) {
    Object.assign(existing, update);
  } else {
    agents.push({ agentId, messages: [], ...update });
  }
  persistAgents();
}

function applyEvent(event: EventEnvelope) {
  const now = new Date().toISOString();
  const { agentId } = event;
  if (event.type === "agent.status") {
    const payload = validatePayload(event.type, event.payload) as AgentStatusPayload;
    upsertAgent(agentId, { status: payload.status, summary: payload.summary, lastSeen: now });
  }
  if (event.type === "agent.message") {
    const payload = validatePayload(event.type, event.payload) as AgentMessagePayload;
    const existing = agents.find((a) => a.agentId === agentId);
    const messages = existing?.messages ?? [];
    messages.push({
      text: payload.text,
      channel: payload.channel,
      timestamp: event.timestamp,
      collapsible: payload.collapsible
    });
    const trimmed = messages.slice(-20);
    upsertAgent(agentId, { messages: trimmed, lastSeen: now });
  }
  if (event.type === "agent.position") {
    const payload = validatePayload(event.type, event.payload) as AgentPositionPayload;
    upsertAgent(agentId, { position: payload, lastSeen: now });
  }
  if (event.type === "task.assign") {
    const payload = validatePayload(event.type, event.payload) as TaskAssignPayload;
    const existing = tasks.find((t) => t.taskId === payload.taskId);
    if (existing) {
      existing.title = payload.title;
      existing.details = payload.details;
      existing.status = "assigned";
    } else {
      tasks.push({
        taskId: payload.taskId,
        agentId,
        title: payload.title,
        details: payload.details,
        status: "assigned",
        createdAt: now
      });
    }
    persistTasks();
  }
}

const RegisterSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().optional(),
  desk: z.object({ x: z.number(), y: z.number() }).optional(),
  cliType: z.enum(["claude-code", "copilot-cli"]).optional(),
  workingDirectory: z.string().optional()
});

app.post("/agents/register", (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { agentId, name, desk, cliType, workingDirectory } = parsed.data;
  const existing = agents.find((a) => a.agentId === agentId);
  const next = {
    agentId,
    name: name ?? existing?.name,
    desk: desk ?? existing?.desk,
    status: existing?.status ?? "idle",
    summary: existing?.summary ?? "",
    position: existing?.position ?? desk ?? existing?.desk,
    cliType: cliType ?? existing?.cliType,
    workingDirectory: workingDirectory ?? existing?.workingDirectory,
    messages: existing?.messages ?? [],
    lastSeen: new Date().toISOString()
  } satisfies AgentRecord;
  upsertAgent(agentId, next);
  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  broadcast(snapshot);
  res.json(next);
});

app.get("/agents", (_req, res) => {
  res.json(agents);
});

// Delete an agent
app.delete("/agents/:agentId", (req, res) => {
  const { agentId } = req.params;

  // Send delete command to agent via WebSocket
  const controlEvent: EventEnvelope = {
    type: "agent.control" as any,
    agentId,
    timestamp: new Date().toISOString(),
    payload: { command: "delete" }
  };
  broadcast(controlEvent);

  // Remove from agents list
  const index = agents.findIndex((a) => a.agentId === agentId);
  if (index !== -1) {
    agents.splice(index, 1);
    persistAgents();
  }

  // Kill spawned process if we have it
  const proc = spawnedProcesses.get(agentId);
  if (proc) {
    proc.kill("SIGTERM");
    spawnedProcesses.delete(agentId);
  }

  // Broadcast updated snapshot
  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  broadcast(snapshot);

  res.json({ ok: true });
});

// Send control command to agent (reset, etc.)
app.post("/agents/:agentId/control", (req, res) => {
  const { agentId } = req.params;
  const { command } = req.body;

  if (!["reset", "delete"].includes(command)) {
    res.status(400).json({ error: "Invalid command" });
    return;
  }

  // If reset, also clear messages in server state
  if (command === "reset") {
    const agent = agents.find((a) => a.agentId === agentId);
    if (agent) {
      agent.messages = [];
      persistAgents();
    }
  }

  const controlEvent: EventEnvelope = {
    type: "agent.control" as any,
    agentId,
    timestamp: new Date().toISOString(),
    payload: { command }
  };
  broadcast(controlEvent);

  // Broadcast updated snapshot after reset
  if (command === "reset") {
    const snapshot: EventEnvelope = {
      type: "snapshot",
      agentId: "system",
      timestamp: new Date().toISOString(),
      payload: { agents, tasks }
    };
    broadcast(snapshot);
  }

  res.json({ ok: true });
});

const TaskCreateSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  details: z.string().optional()
});

app.post("/tasks", (req, res) => {
  const parsed = TaskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { agentId, title, details } = parsed.data;
  const taskId = randomUUID();
  const event: EventEnvelope = {
    type: "task.assign",
    agentId,
    timestamp: new Date().toISOString(),
    payload: { taskId, title, details }
  };
  applyEvent(event);
  appendEvent(event);
  broadcast(event);
  res.json({ taskId });
});

app.get("/tasks", (_req, res) => {
  res.json(tasks);
});

app.post("/events", (req, res) => {
  const parsed = EventEnvelopeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const envelope = parsed.data;
  try {
    validatePayload(envelope.type, envelope.payload);
  } catch (error) {
    res.status(400).json({ error: String(error) });
    return;
  }
  applyEvent(envelope);
  appendEvent(envelope);
  broadcast(envelope);
  res.json({ ok: true });
});

// Track spawned agent processes
const spawnedProcesses = new Map<string, ChildProcess>();

// Random name generator for agents
const adjectives = ["Swift", "Clever", "Brave", "Calm", "Eager", "Fancy", "Jolly", "Lucky", "Noble", "Quick", "Sharp", "Witty", "Zen", "Bold", "Cool"];
const nouns = ["Fox", "Owl", "Bear", "Wolf", "Hawk", "Lion", "Tiger", "Panda", "Raven", "Falcon", "Phoenix", "Dragon", "Ninja", "Coder", "Dev"];
function randomAgentName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

const SpawnSchema = z.object({
  name: z.string().optional(),
  cliType: z.enum(["claude-code", "copilot-cli"]).default("claude-code"),
  workingDirectory: z.string().min(1),
  personality: z.string().optional()
});

app.post("/agents/spawn", (req, res) => {
  const parsed = SpawnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { cliType, workingDirectory, personality } = parsed.data;
  // Always ensure we have a name
  const name = parsed.data.name?.trim() || randomAgentName();

  // Build the command arguments - always pass name
  const args: string[] = ["--name", name];
  if (cliType === "copilot-cli") {
    args.push("--cli", "copilot");
  }
  if (personality?.trim()) {
    args.push("--personality", personality.trim());
  }

  // Path to officeagent
  const officeagentPath = path.join(rootDir, "apps", "officeagent", "src", "index.ts");

  // Spawn the officeagent process
  const child = spawn("npx", ["tsx", officeagentPath, ...args], {
    cwd: workingDirectory,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true // Allow process to run independently
  });

  // Generate an ID for tracking
  const processId = `spawn-${Date.now()}`;
  spawnedProcesses.set(processId, child);

  child.stdout?.on("data", (data) => {
    // eslint-disable-next-line no-console
    console.log(`[spawn:${name || processId}] ${data.toString().trim()}`);
  });

  child.stderr?.on("data", (data) => {
    // eslint-disable-next-line no-console
    console.error(`[spawn:${name || processId}] ${data.toString().trim()}`);
  });

  child.on("exit", (code) => {
    // eslint-disable-next-line no-console
    console.log(`[spawn:${name || processId}] Exited with code ${code}`);
    spawnedProcesses.delete(processId);
  });

  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(`[spawn:${name || processId}] Error:`, err);
  });

  // Unref so parent can exit independently
  child.unref();

  res.json({ ok: true, processId, message: `Agent spawned in ${workingDirectory}` });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Set<WebSocket>();

function broadcast(event: EventEnvelope) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

wss.on("connection", (socket) => {
  clients.add(socket);
  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  socket.send(JSON.stringify(snapshot));

  socket.on("message", (data) => {
    try {
      const parsed = EventEnvelopeSchema.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) {
        socket.send(JSON.stringify({ error: parsed.error.message }));
        return;
      }
      const envelope = parsed.data;
      validatePayload(envelope.type, envelope.payload);
      applyEvent(envelope);
      appendEvent(envelope);
      broadcast(envelope);
    } catch (error) {
      socket.send(JSON.stringify({ error: String(error) }));
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
  });
});

const PORT = Number(process.env.PORT ?? 3003);
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
