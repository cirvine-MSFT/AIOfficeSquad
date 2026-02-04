import WebSocket from "ws";
import {
  CLIAgentConfig,
  AgentStatus,
  TaskAssignment,
  EventEnvelope,
  ServerClient,
} from "./types.js";

// Module-level task deduplication (persists across all instances and reconnections)
const globalProcessedTaskIds = new Set<string>();

/**
 * Client for communicating with the Office server
 * Handles HTTP registration and WebSocket event streaming
 */
export class OfficeServerClient implements ServerClient {
  private serverUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private taskHandlers: Map<string, (task: TaskAssignment) => void> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private isProcessingSnapshot = false;
  private instanceId = Math.random().toString(36).substring(7);

  constructor(serverUrl: string, wsUrl: string) {
    this.serverUrl = serverUrl;
    this.wsUrl = wsUrl;
  }

  /**
   * Register an agent with the server
   */
  async register(config: CLIAgentConfig): Promise<void> {
    const response = await fetch(`${this.serverUrl}/agents/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: config.agentId,
        name: config.displayName,
        desk: config.desk,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to register agent ${config.agentId}: ${response.status} ${text}`);
    }

    console.log(`Registered agent: ${config.agentId} (${config.displayName})`);
  }

  /**
   * Connect to WebSocket and listen for task assignments
   */
  async connect(agentId: string, onTask: (task: TaskAssignment) => void): Promise<void> {
    this.taskHandlers.set(agentId, onTask);

    // Only connect once for all agents
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on("open", () => {
          console.log("WebSocket connected to server");
          this.isConnecting = false;
          resolve();
        });

        this.ws.on("message", (data: WebSocket.RawData) => {
          try {
            const event = JSON.parse(data.toString()) as EventEnvelope;
            this.handleEvent(event);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        });

        this.ws.on("close", () => {
          console.log("WebSocket disconnected");
          this.isConnecting = false;
          this.scheduleReconnect();
        });

        this.ws.on("error", (error) => {
          console.error("WebSocket error:", error);
          this.isConnecting = false;
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            reject(error);
          }
        });
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming events from WebSocket
   */
  private handleEvent(event: EventEnvelope): void {
    // Handle task assignments - skip duplicates
    if (event.type === "task.assign") {
      const payload = event.payload as {
        taskId: string;
        title: string;
        details?: string;
      };

      // Skip if already processed
      if (globalProcessedTaskIds.has(payload.taskId)) {
        return;
      }
      globalProcessedTaskIds.add(payload.taskId);

      const handler = this.taskHandlers.get(event.agentId);
      if (handler) {
        handler({
          taskId: payload.taskId,
          agentId: event.agentId,
          title: payload.title,
          details: payload.details,
        });
      }
    }

    // Handle chat messages as tasks (channel: "task" = user message)
    if (event.type === "agent.message") {
      const payload = event.payload as {
        text: string;
        channel: string;
      };

      // Only respond to user messages (channel: "task")
      if (payload.channel === "task") {
        // Create unique task ID from timestamp, agent, and message hash
        const taskId = `${event.timestamp}-${event.agentId}-${payload.text}`;

        // Atomic check-and-add to prevent race conditions
        if (globalProcessedTaskIds.has(taskId)) {
          return; // Already processed
        }
        globalProcessedTaskIds.add(taskId);

        // Only process messages from the last 3 seconds
        const messageTime = new Date(event.timestamp).getTime();
        const age = Date.now() - messageTime;
        if (age > 3000) {
          return; // Too old, likely from snapshot replay
        }

        console.log(`[${event.agentId}] New message: ${payload.text.substring(0, 50)}`);

        const handler = this.taskHandlers.get(event.agentId);
        if (handler) {
          handler({
            taskId,
            agentId: event.agentId,
            title: payload.text,
          });
        }
      }
    }

    // Handle snapshot (initial state) - ignore messages inside snapshots
    if (event.type === "snapshot") {
      this.isProcessingSnapshot = true;
      console.log("Received server snapshot");
      // Reset flag after processing
      setTimeout(() => {
        this.isProcessingSnapshot = false;
      }, 100);
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log("Attempting to reconnect WebSocket...");
      // Reconnect for all registered agents
      const agentIds = Array.from(this.taskHandlers.keys());
      if (agentIds.length > 0) {
        const firstHandler = this.taskHandlers.get(agentIds[0]);
        if (firstHandler) {
          this.connect(agentIds[0], firstHandler).catch((error) => {
            console.error("Reconnection failed:", error);
            this.scheduleReconnect();
          });
        }
      }
    }, 2000);
  }

  /**
   * Post a status update event
   */
  async postStatus(agentId: string, status: AgentStatus, summary: string): Promise<void> {
    const event: EventEnvelope = {
      type: "agent.status",
      agentId,
      timestamp: new Date().toISOString(),
      payload: {
        status,
        summary,
      },
    };

    await this.postEvent(event);
  }

  /**
   * Post a message event
   */
  async postMessage(
    agentId: string,
    text: string,
    channel: "log" | "reply" | "task",
    collapsible?: boolean
  ): Promise<void> {
    const event: EventEnvelope = {
      type: "agent.message",
      agentId,
      timestamp: new Date().toISOString(),
      payload: {
        text,
        channel,
        ...(collapsible !== undefined && { collapsible }),
      },
    };

    await this.postEvent(event);
  }

  /**
   * Post an event to the server via HTTP
   */
  private async postEvent(event: EventEnvelope): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to post event: ${response.status} ${text}`);
      } else {
        console.log(`[POSTED] ${event.type} for ${event.agentId}`);
      }
    } catch (error) {
      console.error("Error posting event:", error);
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.taskHandlers.clear();
  }
}
