import { BaseAdapter } from "./base-adapter.js";
import {
  CLIType,
  CLIAgentConfig,
  TaskAssignment,
  ParsedOutput,
} from "../types.js";

/**
 * Adapter for GitHub Copilot CLI
 * Uses the `copilot` command for code suggestions
 */
export class CopilotCLIAdapter extends BaseAdapter {
  readonly cliType: CLIType = "copilot-cli";
  readonly command = "copilot";

  /**
   * Build command for Copilot CLI
   * Uses autopilot mode with the prompt
   */
  buildCommand(task: TaskAssignment, _config: CLIAgentConfig): string {
    // Combine title and details into prompt
    const prompt = task.details
      ? `${task.title}\n\n${task.details}`
      : task.title;

    // Escape the prompt and use ghcs for code suggestions
    const escapedPrompt = this.escapeShellArg(prompt);

    // GitHub Copilot CLI uses `ghcs` (copilot suggest) or `gh copilot suggest`
    // We'll use the simpler ghcs if available
    return `gh copilot suggest ${escapedPrompt}`;
  }

  /**
   * Get shell prompt pattern for Copilot CLI
   */
  getPromptPattern(): RegExp {
    // Match shell prompts or copilot completion
    return /^[$%>#]\s*$|^Suggestion:|^Command:/i;
  }

  /**
   * Parse Copilot CLI output with specialized patterns
   */
  parseOutput(output: string): ParsedOutput[] {
    const results: ParsedOutput[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const stripped = this.stripAnsi(line).trim();
      if (!stripped) continue;

      // Detect Copilot-specific patterns
      if (this.isCopilotSuggestion(stripped)) {
        results.push({
          type: "text",
          content: stripped,
          metadata: { source: "copilot", type: "suggestion" },
        });
        continue;
      }

      if (this.isCopilotProgress(stripped)) {
        results.push({
          type: "progress",
          content: stripped,
          metadata: { source: "copilot" },
        });
        continue;
      }

      if (this.isCopilotError(stripped)) {
        results.push({
          type: "error",
          content: stripped,
        });
        continue;
      }

      // Detect code blocks
      if (this.isCodeBlock(stripped)) {
        results.push({
          type: "text",
          content: stripped,
          metadata: { source: "copilot", type: "code" },
        });
        continue;
      }

      // Default to text
      results.push({
        type: "text",
        content: stripped,
      });
    }

    return results;
  }

  /**
   * Detect completion with Copilot-specific patterns
   */
  detectCompletion(output: string, fullBuffer: string): {
    done: boolean;
    summary?: string;
    error?: string;
  } {
    const stripped = this.stripAnsi(fullBuffer);

    // Check for Copilot completion patterns
    const completionPatterns = [
      /Suggestion:/im,
      /Command:/im,
      /^>\s*$/m,
      /Press Enter to run/im,
      /\?\s*Run this command/im,
    ];

    // Check for errors
    const errorPatterns = [
      /Error:/im,
      /Failed/im,
      /not authenticated/im,
      /GH_TOKEN/im,
      /Please authenticate/im,
    ];

    const lines = stripped.split("\n");

    // Check for errors first
    for (const pattern of errorPatterns) {
      if (pattern.test(stripped)) {
        const errorLine = lines.find((l) => pattern.test(l)) || "Copilot error";
        return {
          done: true,
          error: errorLine,
        };
      }
    }

    // Check for completion
    const promptPattern = this.getPromptPattern();
    const lastLines = lines.slice(-10);

    for (const line of lastLines.reverse()) {
      const trimmed = line.trim();
      if (promptPattern.test(trimmed)) {
        return {
          done: true,
          summary: this.extractCopilotSummary(stripped),
        };
      }
    }

    // Check for waiting state (copilot waiting for user input)
    for (const pattern of completionPatterns) {
      if (pattern.test(stripped)) {
        return {
          done: true,
          summary: this.extractCopilotSummary(stripped),
        };
      }
    }

    return { done: false };
  }

  /**
   * Check if line is a Copilot suggestion
   */
  private isCopilotSuggestion(line: string): boolean {
    const patterns = [
      /^Suggestion:/i,
      /^Command:/i,
      /^>\s+/,
      /^\$\s+/,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Check if line is Copilot progress indicator
   */
  private isCopilotProgress(line: string): boolean {
    const patterns = [
      /Thinking/i,
      /Generating/i,
      /Loading/i,
      /Analyzing/i,
      /^\.\.\./,
      /^⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/, // Spinner characters
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Check if line is a Copilot error
   */
  private isCopilotError(line: string): boolean {
    const patterns = [
      /^Error:/i,
      /Failed/i,
      /not authenticated/i,
      /GH_TOKEN.*required/i,
      /Please authenticate/i,
      /could not/i,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Check if line is a code block
   */
  private isCodeBlock(line: string): boolean {
    return line.startsWith("```") || line.startsWith("    ");
  }

  /**
   * Extract summary from Copilot output
   */
  private extractCopilotSummary(output: string): string {
    const lines = output.split("\n");

    // Look for suggestion lines
    const suggestionPattern = /^(Suggestion|Command):\s*(.+)/i;
    const commandPattern = /^[>$]\s+(.+)/;

    for (const line of lines) {
      const trimmed = line.trim();

      const suggestionMatch = trimmed.match(suggestionPattern);
      if (suggestionMatch) {
        return `Suggested: ${suggestionMatch[2]}`;
      }

      const commandMatch = trimmed.match(commandPattern);
      if (commandMatch && commandMatch[1].length > 5) {
        return `Command: ${commandMatch[1].substring(0, 100)}`;
      }
    }

    // Fallback to last meaningful lines
    const meaningfulLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !this.getPromptPattern().test(trimmed) &&
        trimmed.length > 5 &&
        !this.isCopilotProgress(trimmed)
      );
    });

    return meaningfulLines.slice(-2).join(" ").substring(0, 200);
  }

  /**
   * Check if GH_TOKEN is set for authentication
   */
  static hasAuthentication(): boolean {
    return !!(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  }
}
