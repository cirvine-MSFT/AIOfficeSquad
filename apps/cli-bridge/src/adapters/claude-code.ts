import { BaseAdapter } from "./base-adapter.js";
import {
  CLIType,
  CLIAgentConfig,
  TaskAssignment,
  ParsedOutput,
} from "../types.js";

/**
 * Adapter for Claude Code CLI (claude command)
 * Uses single-prompt mode: `claude -p "prompt"`
 */
export class ClaudeCodeAdapter extends BaseAdapter {
  readonly cliType: CLIType = "claude-code";
  readonly command = "claude";

  // Track if we're in a session
  private inSession = false;

  /**
   * Build command for Claude Code CLI
   * Uses -p flag for single prompt mode with --dangerously-skip-permissions
   */
  buildCommand(task: TaskAssignment, _config: CLIAgentConfig): string {
    // Combine title and details into prompt
    const prompt = task.details
      ? `${task.title}\n\n${task.details}`
      : task.title;

    // Use -p for print mode, --verbose --output-format stream-json to get structured output
    // --dangerously-skip-permissions to avoid interactive prompts
    const escapedPrompt = this.escapeShellArg(prompt);
    return `claude -p ${escapedPrompt} --dangerously-skip-permissions --verbose --output-format stream-json`;
  }

  /**
   * Get shell prompt pattern for Claude Code
   * Detects both bash prompts and claude command completion
   */
  getPromptPattern(): RegExp {
    // Match common shell prompts or Claude's completion indicator
    return /^[$%>#]\s*$|^\s*claude[^:]*:\s*$|^Done\.$|^Task completed/i;
  }

  /**
   * Parse Claude Code output with specialized patterns
   */
  parseOutput(output: string): ParsedOutput[] {
    const results: ParsedOutput[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const stripped = this.stripAnsi(line).trim();
      if (!stripped) continue;

      // Detect Claude-specific patterns
      if (this.isClaudeProgress(stripped)) {
        results.push({
          type: "progress",
          content: stripped,
          metadata: { source: "claude" },
        });
        continue;
      }

      if (this.isClaudeFileChange(stripped)) {
        const metadata = this.parseClaudeFileChange(stripped);
        results.push({
          type: "file-change",
          content: stripped,
          metadata,
        });
        continue;
      }

      if (this.isClaudeError(stripped)) {
        results.push({
          type: "error",
          content: stripped,
        });
        continue;
      }

      // Detect completion
      if (this.isClaudeCompletion(stripped)) {
        results.push({
          type: "completion",
          content: stripped,
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
   * Detect completion with Claude-specific patterns
   */
  detectCompletion(output: string, fullBuffer: string): {
    done: boolean;
    summary?: string;
    error?: string;
  } {
    const stripped = this.stripAnsi(fullBuffer);

    // Check for Claude completion patterns
    const completionPatterns = [
      /Done\.$/m,
      /Task completed/im,
      /Successfully/im,
      /finished/im,
    ];

    // Check for errors
    const errorPatterns = [
      /Error:/im,
      /Failed to/im,
      /Cannot/im,
      /Invalid/im,
    ];

    // Check if returned to shell prompt
    const promptPattern = this.getPromptPattern();
    const lines = stripped.split("\n");
    const lastLines = lines.slice(-10);

    // Look for prompt at end
    for (const line of lastLines.reverse()) {
      const trimmed = line.trim();
      if (promptPattern.test(trimmed)) {
        // Check for errors in output
        for (const pattern of errorPatterns) {
          const match = stripped.match(pattern);
          if (match) {
            const errorLine = lines.find((l) => pattern.test(l)) || match[0];
            return {
              done: true,
              error: errorLine,
            };
          }
        }

        // Check for completion
        for (const pattern of completionPatterns) {
          if (pattern.test(stripped)) {
            return {
              done: true,
              summary: this.extractClaudeSummary(stripped),
            };
          }
        }

        // Assume done if at prompt
        return {
          done: true,
          summary: this.extractClaudeSummary(stripped),
        };
      }
    }

    return { done: false };
  }

  /**
   * Check if line is Claude progress indicator
   */
  private isClaudeProgress(line: string): boolean {
    const patterns = [
      /^Reading/i,
      /^Analyzing/i,
      /^Writing/i,
      /^Creating/i,
      /^Editing/i,
      /^Searching/i,
      /^Running/i,
      /^Executing/i,
      /^\[.*\]/,
      /^•/,
      /^→/,
      /thinking/i,
      /processing/i,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Check if line indicates a file change
   */
  private isClaudeFileChange(line: string): boolean {
    const patterns = [
      /^Wrote:/i,
      /^Created:/i,
      /^Modified:/i,
      /^Deleted:/i,
      /^Edited:/i,
      /^\+\s+\S+\.\w+/,
      /^-\s+\S+\.\w+/,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Parse file change details
   */
  private parseClaudeFileChange(line: string): Record<string, unknown> {
    const patterns = [
      { pattern: /^(Wrote|Created):\s*(.+)/i, action: "create" },
      { pattern: /^(Modified|Edited):\s*(.+)/i, action: "modify" },
      { pattern: /^Deleted:\s*(.+)/i, action: "delete" },
    ];

    for (const { pattern, action } of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          action,
          file: match[2] || match[1],
        };
      }
    }

    return {};
  }

  /**
   * Check if line is an error
   */
  private isClaudeError(line: string): boolean {
    const patterns = [
      /^Error:/i,
      /^Failed:/i,
      /^Cannot/i,
      /^Invalid/i,
      /^fatal/i,
      /permission denied/i,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Check if line indicates completion
   */
  private isClaudeCompletion(line: string): boolean {
    const patterns = [
      /^Done\.$/,
      /^Task completed/i,
      /^Finished/i,
      /^Successfully/i,
    ];
    return patterns.some((p) => p.test(line));
  }

  /**
   * Extract summary from Claude output
   */
  private extractClaudeSummary(output: string): string {
    const lines = output.split("\n");

    // Look for summary-like lines
    const summaryPatterns = [
      /^Done\./,
      /^Created/i,
      /^Modified/i,
      /^Wrote/i,
      /^Successfully/i,
      /^Finished/i,
    ];

    // Find relevant lines
    const relevantLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !this.getPromptPattern().test(trimmed) &&
        (summaryPatterns.some((p) => p.test(trimmed)) ||
          this.isClaudeFileChange(trimmed))
      );
    });

    if (relevantLines.length > 0) {
      return relevantLines.slice(-3).join(". ").substring(0, 200);
    }

    // Fallback to last meaningful lines
    const meaningfulLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !this.getPromptPattern().test(trimmed) &&
        trimmed.length > 5
      );
    });

    return meaningfulLines.slice(-2).join(" ").substring(0, 200);
  }
}
