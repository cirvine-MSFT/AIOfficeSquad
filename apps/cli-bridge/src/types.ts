import { z } from "zod";

// CLI types supported by the bridge
export type CLIType = "claude-code" | "copilot-cli";

// Session modes
export type SessionMode = "persistent" | "per-task";

// Agent configuration schema
export const CLIAgentConfigSchema = z.object({
  agentId: z.string().min(1),
  displayName: z.string().min(1),
  cliType: z.enum(["claude-code", "copilot-cli"]),
  workingDirectory: z.string().min(1),
  desk: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  env: z.record(z.string()).optional(),
  sessionMode: z.enum(["persistent", "per-task"]).default("per-task"),
  timeout: z.number().positive().default(300000), // 5 minutes default
});

export type CLIAgentConfig = z.infer<typeof CLIAgentConfigSchema>;

// Bridge configuration schema
export const BridgeConfigSchema = z.object({
  agents: z.array(CLIAgentConfigSchema),
  serverUrl: z.string().url().default("http://localhost:3003"),
  wsUrl: z.string().default("ws://localhost:3003/ws"),
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

// Parsed output from CLI
export interface ParsedOutput {
  type: "text" | "file-change" | "error" | "progress" | "completion";
  content: string;
  metadata?: Record<string, unknown>;
}

// Task assignment from server
export interface TaskAssignment {
  taskId: string;
  agentId: string;
  title: string;
  details?: string;
}

// Agent status values (matching server schema)
export type AgentStatus = "idle" | "working" | "blocked" | "finished" | "reviewed";

// Event envelope for server communication
export interface EventEnvelope {
  type: "agent.status" | "agent.message" | "agent.position" | "task.assign" | "snapshot";
  agentId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// Process state tracking
export interface ProcessState {
  agentId: string;
  config: CLIAgentConfig;
  pid?: number;
  isRunning: boolean;
  currentTask?: TaskAssignment;
  outputBuffer: string;
  lastActivity: Date;
}

// CLI adapter interface
export interface CLIAdapter {
  readonly cliType: CLIType;
  readonly command: string;

  // Build the full command to execute
  buildCommand(task: TaskAssignment, config: CLIAgentConfig): string;

  // Parse raw output into structured data
  parseOutput(output: string): ParsedOutput[];

  // Detect if the CLI has finished processing
  detectCompletion(output: string, fullBuffer: string): {
    done: boolean;
    summary?: string;
    error?: string;
  };

  // Get shell prompt pattern for detection
  getPromptPattern(): RegExp;
}

// Server client interface
export interface ServerClient {
  // Register agent with the server
  register(config: CLIAgentConfig): Promise<void>;

  // Connect to WebSocket for task assignments
  connect(agentId: string, onTask: (task: TaskAssignment) => void): Promise<void>;

  // Post status update
  postStatus(agentId: string, status: AgentStatus, summary: string): Promise<void>;

  // Post message to chat
  postMessage(agentId: string, text: string, channel: "log" | "reply" | "task", collapsible?: boolean): Promise<void>;

  // Disconnect from server
  disconnect(): void;
}

// Process manager interface
export interface ProcessManager {
  // Initialize agent state
  spawn(config: CLIAgentConfig): Promise<void>;

  // Run a command (spawns new process)
  runCommand(agentId: string, command: string): void;

  // Send command to running process (legacy, calls runCommand)
  sendCommand(agentId: string, command: string): void;

  // Terminate process
  terminate(agentId: string): void;

  // Get process state
  getState(agentId: string): ProcessState | undefined;

  // Check if process is running
  isRunning(agentId: string): boolean;

  // Check if agent has state initialized
  hasState(agentId: string): boolean;

  // Event handlers
  onOutput(agentId: string, handler: (data: string) => void): void;
  onExit(agentId: string, handler: (code: number) => void): void;
}
