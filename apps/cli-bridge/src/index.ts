import { loadConfig } from "./config.js";
import { OfficeServerClient } from "./server-client.js";
import { PTYProcessManager } from "./process-manager.js";
import { CLIAgentConfig, BridgeConfig } from "./types.js";

// Global state
let serverClient: OfficeServerClient;
let processManager: PTYProcessManager;
let config: BridgeConfig;
let isShuttingDown = false;

// Track which agents are currently processing a message
const busyAgents = new Set<string>();

/**
 * Handle an incoming chat message for an agent
 * Simple flow: message in → Claude responds → response out
 */
async function handleMessage(agentId: string, message: string, agentConfig: CLIAgentConfig): Promise<void> {
  // Skip if already processing
  if (busyAgents.has(agentId)) {
    console.log(`[${agentId}] Busy, skipping: ${message.substring(0, 30)}...`);
    return;
  }

  busyAgents.add(agentId);
  console.log(`\n[${agentId}] Message: ${message}`);

  try {
    // Update status to thinking
    await serverClient.postStatus(agentId, "thinking", "Thinking...");

    // Ensure session is running
    if (!processManager.isRunning(agentId)) {
      console.log(`[${agentId}] Starting session...`);
      await processManager.spawn(agentConfig);
    }

    // Send message and wait for response
    const response = await processManager.sendMessage(agentId, message);
    console.log(`[${agentId}] Response: ${response.substring(0, 100)}...`);

    // Post response to chat
    await serverClient.postMessage(agentId, response, "reply");
    await serverClient.postStatus(agentId, "replied", "New message");

  } catch (error) {
    console.error(`[${agentId}] Error:`, error);
    await serverClient.postMessage(agentId, `Error: ${error}`, "reply");
    await serverClient.postStatus(agentId, "error", "Something went wrong");
  } finally {
    busyAgents.delete(agentId);
  }
}

/**
 * Register all agents with the server
 */
async function registerAgents(agentConfigs: CLIAgentConfig[]): Promise<void> {
  for (const agentConfig of agentConfigs) {
    try {
      await serverClient.register(agentConfig);
      await serverClient.postStatus(agentConfig.agentId, "available", "Ready");
    } catch (error) {
      console.error(`Failed to register agent ${agentConfig.agentId}:`, error);
    }
  }
}

/**
 * Setup message handlers for all agents
 */
async function setupMessageHandlers(agentConfigs: CLIAgentConfig[]): Promise<void> {
  for (const agentConfig of agentConfigs) {
    await serverClient.connect(agentConfig.agentId, (task) => {
      // task.title is the message text
      handleMessage(task.agentId, task.title, agentConfig).catch((error) => {
        console.error(`Error handling message for ${task.agentId}:`, error);
      });
    });
  }
}

/**
 * Start persistent sessions for all agents
 */
async function startSessions(agentConfigs: CLIAgentConfig[]): Promise<void> {
  for (const agentConfig of agentConfigs) {
    try {
      await processManager.spawn(agentConfig);
      console.log(`[${agentConfig.agentId}] Session started`);
    } catch (error) {
      console.error(`Failed to start session for ${agentConfig.agentId}:`, error);
    }
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\nShutting down...");

  for (const agentConfig of config.agents) {
    try {
      await serverClient.postStatus(agentConfig.agentId, "available", "Offline");
    } catch {
      // Ignore
    }
  }

  processManager.terminateAll();
  serverClient.disconnect();

  console.log("Bye!");
  process.exit(0);
}

/**
 * Wait for server
 */
async function waitForServer(url: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${url}/agents`);
      if (res.ok) {
        console.log("Server ready");
        return;
      }
    } catch {
      // Not ready
    }
    console.log(`Waiting for server... (${i + 1}/30)`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server not available");
}

/**
 * Main
 */
async function main(): Promise<void> {
  console.log("CLI Bridge\n");

  // Load config
  config = loadConfig();
  if (config.agents.length === 0) {
    console.log("No agents configured");
    process.exit(0);
  }

  // Initialize
  serverClient = new OfficeServerClient(config.serverUrl, config.wsUrl);
  processManager = new PTYProcessManager();

  // Signal handlers
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start
  await waitForServer(config.serverUrl);

  console.log("Registering agents...");
  await registerAgents(config.agents);

  console.log("Starting sessions...");
  await startSessions(config.agents);

  console.log("Connecting to server...");
  await setupMessageHandlers(config.agents);

  console.log("\nReady! Agents:");
  for (const agent of config.agents) {
    console.log(`  - ${agent.displayName} @ ${agent.workingDirectory}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
