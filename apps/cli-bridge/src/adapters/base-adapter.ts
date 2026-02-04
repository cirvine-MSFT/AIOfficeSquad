import {
  CLIAdapter,
  CLIType,
  CLIAgentConfig,
  TaskAssignment,
  ParsedOutput,
} from "../types.js";

/**
 * Abstract base class for CLI adapters
 * Provides common functionality for parsing and detecting completion
 */
export abstract class BaseAdapter implements CLIAdapter {
  abstract readonly cliType: CLIType;
  abstract readonly command: string;

  /**
   * Build the full command to execute for a task
   */
  abstract buildCommand(task: TaskAssignment, config: CLIAgentConfig): string;

  /**
   * Get the shell prompt pattern for detecting completion
   */
  abstract getPromptPattern(): RegExp;

  /**
   * Parse raw output into structured data
   * Can be overridden by specific adapters for custom parsing
   */
  parseOutput(output: string): ParsedOutput[] {
    const results: ParsedOutput[] = [];

    // Split by lines and process each
    const lines = output.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect errors
      if (this.isErrorLine(trimmed)) {
        results.push({
          type: "error",
          content: trimmed,
        });
        continue;
      }

      // Detect file changes
      const fileChange = this.parseFileChange(trimmed);
      if (fileChange) {
        results.push(fileChange);
        continue;
      }

      // Detect progress indicators
      const progress = this.parseProgress(trimmed);
      if (progress) {
        results.push(progress);
        continue;
      }

      // Default to text
      results.push({
        type: "text",
        content: trimmed,
      });
    }

    return results;
  }

  /**
   * Detect if the CLI has finished processing
   * Default implementation checks for shell prompt
   */
  detectCompletion(output: string, fullBuffer: string): {
    done: boolean;
    summary?: string;
    error?: string;
  } {
    const promptPattern = this.getPromptPattern();

    // Check if we've returned to a shell prompt
    const lines = fullBuffer.split("\n");
    const lastLines = lines.slice(-5);

    for (const line of lastLines) {
      if (promptPattern.test(line.trim())) {
        // Look for errors in the output
        const errorLine = lines.find((l) => this.isErrorLine(l));
        if (errorLine) {
          return {
            done: true,
            error: errorLine,
          };
        }

        // Extract summary from output
        const summary = this.extractSummary(fullBuffer);
        return {
          done: true,
          summary,
        };
      }
    }

    return { done: false };
  }

  /**
   * Check if a line indicates an error
   */
  protected isErrorLine(line: string): boolean {
    const errorPatterns = [
      /^error:/i,
      /^fatal:/i,
      /^exception:/i,
      /failed/i,
      /cannot find/i,
      /not found/i,
      /permission denied/i,
    ];

    return errorPatterns.some((pattern) => pattern.test(line));
  }

  /**
   * Parse file change indicators
   */
  protected parseFileChange(line: string): ParsedOutput | null {
    // Common patterns for file changes
    const patterns = [
      /^(created|wrote|modified|deleted|renamed):\s*(.+)/i,
      /^(create|write|modify|delete|rename)\s+(.+)/i,
      /^\+\+\+\s*(.+)/,
      /^---\s*(.+)/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          type: "file-change",
          content: line,
          metadata: {
            action: match[1]?.toLowerCase(),
            file: match[2],
          },
        };
      }
    }

    return null;
  }

  /**
   * Parse progress indicators
   */
  protected parseProgress(line: string): ParsedOutput | null {
    // Common progress patterns
    const patterns = [
      /(\d+)%/,
      /\[=+\s*\]/,
      /\((\d+)\/(\d+)\)/,
      /step\s+(\d+)/i,
      /processing/i,
      /loading/i,
      /analyzing/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return {
          type: "progress",
          content: line,
        };
      }
    }

    return null;
  }

  /**
   * Extract a summary from the full output
   * Can be overridden by specific adapters
   */
  protected extractSummary(fullBuffer: string): string {
    // Find the last meaningful non-prompt line
    const lines = fullBuffer.split("\n").filter((l) => {
      const trimmed = l.trim();
      return (
        trimmed &&
        !this.getPromptPattern().test(trimmed) &&
        !trimmed.startsWith("$") &&
        !trimmed.startsWith(">")
      );
    });

    // Return last few lines as summary
    const summaryLines = lines.slice(-3);
    return summaryLines.join(" ").substring(0, 200);
  }

  /**
   * Escape special characters for shell commands
   */
  protected escapeShellArg(arg: string): string {
    // Replace single quotes with escaped single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Strip ANSI escape codes from output
   */
  protected stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  }
}
