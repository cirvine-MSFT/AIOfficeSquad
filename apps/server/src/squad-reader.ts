/**
 * squad-reader.ts — Parses .squad/team.md to extract squad roster.
 * Watches for file changes and re-reads automatically.
 */
import { readFileSync, existsSync, watchFile, unwatchFile } from "fs";
import path from "path";
import type { SquadMember } from "../../../shared/src/squad-types";

// System agents that shouldn't appear as visible NPCs
const HIDDEN_AGENTS = new Set(["scribe", "ralph"]);

/**
 * Parse the ## Members table from a team.md file.
 * Expected format:
 *   | Name | Role | Scope | Badge |
 *   |------|------|-------|-------|
 *   | Dutch | Lead | Architecture, scope, code review | 🏗️ Lead |
 */
export function readSquadRoster(squadPath: string): SquadMember[] {
  const teamFile = path.join(squadPath, ".squad", "team.md");
  if (!existsSync(teamFile)) {
    console.log(`[squad-reader] No team.md found at ${teamFile}`);
    return [];
  }

  const content = readFileSync(teamFile, "utf-8");
  return parseTeamMd(content, squadPath);
}

export function parseTeamMd(content: string, squadPath: string): SquadMember[] {
  const members: SquadMember[] = [];
  const lines = content.split("\n");

  let inMembersSection = false;
  let headerParsed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect ## Members heading
    if (/^##\s+Members/i.test(trimmed)) {
      inMembersSection = true;
      headerParsed = false;
      continue;
    }

    // Exit members section on next heading
    if (inMembersSection && /^##\s+/.test(trimmed) && !/^##\s+Members/i.test(trimmed)) {
      break;
    }

    if (!inMembersSection) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Must be a table row (starts with |)
    if (!trimmed.startsWith("|")) continue;

    // Skip header row (first table row) and separator row (|----|)
    if (!headerParsed) {
      // First row is column headers
      headerParsed = true;
      continue;
    }
    if (/^\|[\s-|]+\|$/.test(trimmed)) continue;

    // Parse table row: | Name | Role | Scope | Badge |
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 4) continue;

    const [name, role, scope, badge] = cells;
    const id = name.toLowerCase();

    // Skip hidden system agents
    if (HIDDEN_AGENTS.has(id)) continue;

    const agentsDir = path.join(squadPath, ".squad", "agents", id);
    const charterPath = path.join(agentsDir, "charter.md");
    const historyPath = path.join(agentsDir, "history.md");

    members.push({
      id,
      name,
      role,
      scope,
      badge,
      status: "available",
      charterPath: existsSync(charterPath) ? charterPath : undefined,
      historyPath: existsSync(historyPath) ? historyPath : undefined,
    });
  }

  return members;
}

/**
 * Watch team.md for changes. Calls onChange with the new roster.
 * Returns a cleanup function to stop watching.
 */
export function watchSquadRoster(
  squadPath: string,
  onChange: (members: SquadMember[]) => void
): () => void {
  const teamFile = path.join(squadPath, ".squad", "team.md");
  if (!existsSync(teamFile)) return () => {};

  let lastContent = readFileSync(teamFile, "utf-8");

  watchFile(teamFile, { interval: 2000 }, () => {
    try {
      const newContent = readFileSync(teamFile, "utf-8");
      if (newContent !== lastContent) {
        lastContent = newContent;
        const members = parseTeamMd(newContent, squadPath);
        console.log(`[squad-reader] team.md changed, ${members.length} members`);
        onChange(members);
      }
    } catch (err) {
      console.error(`[squad-reader] Error re-reading team.md:`, err);
    }
  });

  return () => unwatchFile(teamFile);
}
