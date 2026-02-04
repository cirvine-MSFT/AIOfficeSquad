import { spawn } from "child_process";
import { EventEmitter } from "events";
import { CLIAgentConfig, ProcessState, ProcessManager } from "./types.js";
import { getAgentEnv } from "./config.js";

/**
 * Manages CLI processes for agents
 * Supports both Claude Code and GitHub Copilot CLI
 */
export class PTYProcessManager extends EventEmitter implements ProcessManager {
  private states: Map<string, ProcessState> = new Map();

  /**
   * Initialize state for an agent (no process spawned yet)
   */
  async spawn(config: CLIAgentConfig): Promise<void> {
    const state: ProcessState = {
      agentId: config.agentId,
      config,
      isRunning: false,
      outputBuffer: "",
      lastActivity: new Date(),
    };
    this.states.set(config.agentId, state);
    console.log(`[${config.agentId}] Initialized (${config.cliType})`);
  }

  /**
   * Send a message and get response
   * Handles both Claude and Copilot CLIs
   */
  sendMessage(agentId: string, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const state = this.states.get(agentId);
      if (!state) {
        reject(new Error(`No state for agent ${agentId}`));
        return;
      }

      state.lastActivity = new Date();
      state.isRunning = true;

      const cliType = state.config.cliType;
      let command: string;
      let args: string[];

      if (cliType === "copilot-cli") {
        // GitHub Copilot CLI
        command = "copilot";
        args = [
          "-p", message,
          "--continue",
          "--allow-all",
          "--silent"
        ];
      } else {
        // Claude Code CLI (default)
        command = "claude";
        args = [
          "-p", message,
          "--continue",
          "--dangerously-skip-permissions",
          "--output-format", "stream-json",
          "--verbose"
        ];
      }

      console.log(`[${agentId}] Running: ${command} ${args.slice(0, 4).join(" ")}...`);

      const child = spawn(command, args, {
        cwd: state.config.workingDirectory,
        env: getAgentEnv(state.config),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let result: string | null = null;

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;

        if (cliType === "copilot-cli") {
          // Copilot with --silent outputs plain text
          result = stdout.trim();
        } else {
          // Claude outputs stream-json, parse for result
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.type === "result" && json.result) {
                result = json.result;
              }
            } catch {
              // Not JSON - might be plain text from Claude
              if (!result) {
                result = stdout.trim();
              }
            }
          }
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        state.isRunning = false;
        reject(error);
      });

      child.on("exit", (code) => {
        state.isRunning = false;
        state.lastActivity = new Date();

        if (code === 0 && result) {
          resolve(result);
        } else if (code === 0 && stdout.trim()) {
          // Fallback to raw stdout if no parsed result
          resolve(stdout.trim());
        } else if (stderr) {
          reject(new Error(stderr.trim()));
        } else {
          reject(new Error(`Exit code ${code}`));
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (state.isRunning) {
          child.kill("SIGTERM");
          reject(new Error("Timeout"));
        }
      }, 300000);
    });
  }

  isRunning(agentId: string): boolean {
    return this.states.has(agentId);
  }

  hasState(agentId: string): boolean {
    return this.states.has(agentId);
  }

  getState(agentId: string): ProcessState | undefined {
    return this.states.get(agentId);
  }

  terminate(agentId: string): void {
    this.states.delete(agentId);
  }

  terminateAll(): void {
    this.states.clear();
  }

  // Legacy methods (not used in new flow)
  runCommand(): void {}
  sendCommand(): void {}
  clearBuffer(): void {}
  setCurrentTask(): void {}
  onOutput(): void {}
  onExit(): void {}
}
