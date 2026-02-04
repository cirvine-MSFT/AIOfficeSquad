import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { BridgeConfig, BridgeConfigSchema } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const DEFAULT_CONFIG: BridgeConfig = {
  agents: [],
  serverUrl: "http://localhost:3003",
  wsUrl: "ws://localhost:3003/ws",
};

/**
 * Load and validate bridge configuration from cli-bridge.config.json
 */
export function loadConfig(configPath?: string): BridgeConfig {
  // Resolve config path
  const resolvedPath = configPath
    ? resolve(configPath)
    : resolve(__dirname, "..", "cli-bridge.config.json");

  // Check if config file exists
  if (!existsSync(resolvedPath)) {
    console.warn(`Config file not found at ${resolvedPath}, using defaults`);
    return DEFAULT_CONFIG;
  }

  try {
    // Read and parse config file
    const rawConfig = readFileSync(resolvedPath, "utf-8");
    const parsedConfig = JSON.parse(rawConfig);

    // Validate with Zod schema
    const validatedConfig = BridgeConfigSchema.parse(parsedConfig);

    // Resolve working directories relative to config file location
    const configDir = dirname(resolvedPath);
    validatedConfig.agents = validatedConfig.agents.map((agent) => ({
      ...agent,
      workingDirectory: resolve(configDir, agent.workingDirectory),
    }));

    console.log(`Loaded config from ${resolvedPath}`);
    console.log(`Found ${validatedConfig.agents.length} agent(s)`);

    return validatedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in config file: ${error.message}`);
    } else if (error instanceof Error && error.name === "ZodError") {
      console.error(`Config validation failed:`, error);
    } else {
      console.error(`Error loading config:`, error);
    }
    throw error;
  }
}

/**
 * Get environment variables for a CLI agent
 * Merges process.env with agent-specific env vars
 */
export function getAgentEnv(
  agentConfig: { env?: Record<string, string> },
  additionalEnv?: Record<string, string>
): Record<string, string> {
  // Filter out undefined values from process.env
  const cleanEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      cleanEnv[key] = value;
    }
  }

  return {
    ...cleanEnv,
    ...agentConfig.env,
    ...additionalEnv,
    // Force non-interactive mode for CLIs
    CI: "true",
    TERM: "xterm-256color",
  };
}
