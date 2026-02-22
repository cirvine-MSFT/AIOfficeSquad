/**
 * building-routes.ts — REST endpoints for multi-squad building model.
 *
 * Endpoints:
 *   GET  /api/building/squads                              — list all squads
 *   GET  /api/building/squads/:squadId                     — squad details (roster, status)
 *   GET  /api/squads/:squadId/agents                       — agents for a squad
 *   GET  /api/squads/:squadId/decisions                    — parsed decisions
 *   GET  /api/squads/:squadId/status                       — detailed squad status
 *   POST /api/squads/:squadId/ceremonies/:type             — start a ceremony
 *   POST /api/squads/:squadId/ceremonies/:ceremonyId/end   — end a ceremony
 *   POST /api/squads/:squadId/agents/:agentId/chat         — chat with squad agent
 */
import { Router, type Request, type Response } from "express";
import { readFileSync, existsSync, watchFile, unwatchFile } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SquadInfo, SquadMember, SquadOfficeConfig, DecisionEntry, CeremonyConfig, CeremonyType, CeremonyState } from "../../../shared/src/squad-types";
import type { EventEnvelope } from "../../../shared/src/schema";
import { readSquadRoster, watchSquadRoster } from "./squad-reader";

// System agents to skip when auto-populating
const SYSTEM_AGENTS = new Set(["scribe", "ralph"]);

export interface BuildingState {
  squads: Map<string, SquadInfo>;
  rootDir: string;
}

/**
 * Load config from squadoffice.config.json or auto-detect from .squad/team.md
 */
export function loadBuildingConfig(rootDir: string): SquadOfficeConfig {
  const configPath = path.join(rootDir, "squadoffice.config.json");

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      return JSON.parse(raw) as SquadOfficeConfig;
    } catch (err) {
      console.error("[building] Failed to parse squadoffice.config.json:", err);
    }
  }

  // Auto-detect: look for .squad/team.md in root
  const teamFile = path.join(rootDir, ".squad", "team.md");
  if (existsSync(teamFile)) {
    console.log("[building] Auto-detected .squad/team.md — single-squad mode");
    return {
      squads: [{ id: "default", name: "Alpha Squad", path: "." }],
    };
  }

  // No squads found — empty config
  console.log("[building] No squad config found — no squads loaded");
  return { squads: [] };
}

/**
 * Initialize building state: load config, read rosters, set up watchers.
 */
export function initBuildingState(rootDir: string): BuildingState {
  const config = loadBuildingConfig(rootDir);
  const state: BuildingState = { squads: new Map(), rootDir };

  for (const entry of config.squads) {
    const squadPath = path.resolve(rootDir, entry.path);
    const members = readSquadRoster(squadPath);

    const info: SquadInfo = {
      id: entry.id,
      name: entry.name,
      path: squadPath,
      members,
      active: true,
    };
    state.squads.set(entry.id, info);

    console.log(
      `[building] Loaded squad "${entry.name}" (${entry.id}) — ${members.length} members: ${members.map((m) => m.name).join(", ")}`
    );

    // Watch for roster changes
    watchSquadRoster(squadPath, (updatedMembers) => {
      const squad = state.squads.get(entry.id);
      if (squad) {
        squad.members = updatedMembers;
        console.log(
          `[building] Squad "${entry.name}" roster updated — ${updatedMembers.length} members`
        );
      }
    });
  }

  return state;
}

/**
 * Desk positions for squad members in the office
 */
const SQUAD_DESKS: Array<{ x: number; y: number }> = [
  { x: 195, y: 617 },
  { x: 645, y: 618 },
  { x: 195, y: 450 },
  { x: 645, y: 450 },
  { x: 420, y: 530 },
  { x: 300, y: 350 },
  { x: 540, y: 350 },
];

function getDeskForIndex(index: number): { x: number; y: number } {
  const base = SQUAD_DESKS[index % SQUAD_DESKS.length];
  return { x: base.x, y: base.y };
}

/**
 * Convert squad members to agent records for seeding the agents list.
 */
export function squadMembersToAgentRecords(
  squadId: string,
  members: SquadMember[],
  rootDir: string
) {
  return members.map((m, i) => {
    const desk = getDeskForIndex(i);
    return {
      agentId: `squad-${squadId}-${m.id}`,
      name: m.name,
      desk,
      status: "available" as const,
      summary: `${m.badge} — ${m.scope}`,
      position: desk,
      cliType: "copilot-cli" as const,
      workingDirectory: rootDir,
      messages: [],
      lastSeen: new Date().toISOString(),
      // Squad metadata
      squadId,
      squadRole: m.role,
      squadBadge: m.badge,
      squadScope: m.scope,
      charterPath: m.charterPath,
      historyPath: m.historyPath,
    };
  });
}

/**
 * Read an agent's charter file for system prompt context.
 */
export function readAgentCharter(charterPath: string | undefined): string {
  if (!charterPath || !existsSync(charterPath)) return "";
  try {
    return readFileSync(charterPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Read an agent's history file for additional context.
 */
export function readAgentHistory(historyPath: string | undefined): string {
  if (!historyPath || !existsSync(historyPath)) return "";
  try {
    return readFileSync(historyPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Parse decisions.md into structured decision entries.
 * Each `### <timestamp>: <title>` section is a decision entry.
 */
export function parseDecisionsMd(content: string): DecisionEntry[] {
  const entries: DecisionEntry[] = [];
  const headerRe = /^### (\d{4}-\d{2}-\d{2}T[\d:.]+Z?):\s*(.+)$/;
  const lines = content.split("\n");

  let current: { timestamp: string; title: string; startLine: number } | null = null;
  let blockLines: string[] = [];

  function flushEntry() {
    if (!current) return;
    const raw = blockLines.join("\n").trim();
    // Extract **By:** field
    const byMatch = raw.match(/\*\*By:\*\*\s*(.+)/);
    const author = byMatch ? byMatch[1].trim() : "Unknown";
    // Content is everything after the **By:** line
    const contentLines = blockLines
      .filter((l) => !headerRe.test(l.trim()))
      .join("\n")
      .trim();
    entries.push({
      timestamp: current.timestamp,
      title: current.title,
      author,
      content: contentLines,
      raw,
    });
  }

  for (const line of lines) {
    const match = line.trim().match(headerRe);
    if (match) {
      flushEntry();
      current = { timestamp: match[1], title: match[2], startLine: entries.length };
      blockLines = [line];
    } else if (current) {
      // Stop accumulating at `---` separator (marks end of entry)
      if (/^---\s*$/.test(line.trim())) {
        flushEntry();
        current = null;
        blockLines = [];
      } else {
        blockLines.push(line);
      }
    }
  }
  // Flush last entry if file doesn't end with ---
  flushEntry();

  return entries;
}

/**
 * Watch decisions.md for changes per squad. Calls onUpdate with new entries.
 */
export function watchDecisionsFile(
  state: BuildingState,
  onUpdate: (squadId: string, decisions: DecisionEntry[]) => void
): void {
  for (const [squadId, squad] of state.squads) {
    const decisionsPath = path.join(squad.path, ".squad", "decisions.md");
    if (!existsSync(decisionsPath)) continue;

    let lastContent = readFileSync(decisionsPath, "utf-8");

    watchFile(decisionsPath, { interval: 2000 }, () => {
      try {
        const newContent = readFileSync(decisionsPath, "utf-8");
        if (newContent !== lastContent) {
          lastContent = newContent;
          const decisions = parseDecisionsMd(newContent);
          console.log(
            `[building] decisions.md changed for squad "${squadId}" — ${decisions.length} entries`
          );
          onUpdate(squadId, decisions);
        }
      } catch (err) {
        console.error(`[building] Error re-reading decisions.md for ${squadId}:`, err);
      }
    });

    console.log(`[building] Watching decisions.md for squad "${squadId}"`);
  }
}

/**
 * Parse ceremonies.md into structured ceremony configs.
 * Each `## <Name>` section with a table of fields is a ceremony.
 */
export function parseCeremoniesMd(content: string): CeremonyConfig[] {
  const configs: CeremonyConfig[] = [];
  const sections = content.split(/^## /m).slice(1); // skip preamble

  for (const section of sections) {
    const lines = section.split("\n");
    const name = lines[0].trim();

    // Map ceremony name to type
    let type: CeremonyType;
    const nameLower = name.toLowerCase();
    if (nameLower.includes("design review")) {
      type = "design-review";
    } else if (nameLower.includes("retro")) {
      type = "retro";
    } else {
      continue; // unknown ceremony type, skip
    }

    // Parse table fields
    const fields: Record<string, string> = {};
    for (const line of lines) {
      const tableMatch = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/);
      if (tableMatch) {
        fields[tableMatch[1].toLowerCase()] = tableMatch[2].trim();
      }
    }

    // Parse agenda items
    const agenda: string[] = [];
    let inAgenda = false;
    for (const line of lines) {
      if (line.includes("**Agenda:**")) {
        inAgenda = true;
        continue;
      }
      if (inAgenda) {
        const itemMatch = line.match(/^\d+\.\s+(.+)/);
        if (itemMatch) {
          agenda.push(itemMatch[1].trim());
        } else if (line.trim() === "" || line.startsWith("---")) {
          inAgenda = false;
        }
      }
    }

    const enabled = (fields["enabled"] || "").includes("yes");

    configs.push({
      type,
      name,
      trigger: fields["trigger"] || "manual",
      when: fields["when"] || "before",
      condition: fields["condition"] || "",
      facilitator: fields["facilitator"] || "lead",
      participants: fields["participants"] || "all-relevant",
      timeBudget: fields["time budget"] || "focused",
      enabled,
      agenda,
    });
  }

  return configs;
}

// In-memory ceremony state
const activeCeremonies = new Map<string, CeremonyState>();

/**
 * Agent record shape (matches index.ts AgentRecord for cross-referencing).
 */
interface AgentRecordRef {
  agentId: string;
  name?: string;
  status?: string;
  summary?: string;
  lastSeen?: string;
  squadId?: string;
  squadRole?: string;
  squadBadge?: string;
  squadScope?: string;
}

/**
 * Create Express router for building/squad endpoints.
 */
export function createBuildingRouter(
  state: BuildingState,
  opts?: {
    getAgents?: () => AgentRecordRef[];
    broadcast?: (event: EventEnvelope) => void;
  }
): Router {
  const router = Router();

  // GET /api/building/squads — list all squads
  router.get("/building/squads", (_req: Request, res: Response) => {
    const squads = Array.from(state.squads.values()).map((s) => ({
      id: s.id,
      name: s.name,
      memberCount: s.members.length,
      active: s.active,
    }));
    res.json({ squads });
  });

  // GET /api/building/squads/:squadId — squad details
  router.get("/building/squads/:squadId", (req: Request, res: Response) => {
    const squad = state.squads.get(req.params.squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }
    res.json({
      id: squad.id,
      name: squad.name,
      active: squad.active,
      members: squad.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        scope: m.scope,
        badge: m.badge,
        status: m.status,
        hasCharter: !!m.charterPath,
        hasHistory: !!m.historyPath,
      })),
    });
  });

  // GET /api/squads/:squadId/agents — agents in a squad (mapped to office agents)
  router.get("/squads/:squadId/agents", (req: Request, res: Response) => {
    const squad = state.squads.get(req.params.squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }
    const agentRecords = squadMembersToAgentRecords(
      squad.id,
      squad.members,
      state.rootDir
    );
    res.json(agentRecords);
  });

  // GET /api/squads/:squadId/decisions — parsed decisions for a squad
  router.get("/squads/:squadId/decisions", (req: Request, res: Response) => {
    const squad = state.squads.get(req.params.squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const decisionsPath = path.join(squad.path, ".squad", "decisions.md");
    if (!existsSync(decisionsPath)) {
      res.json({ squadId: squad.id, decisions: [] });
      return;
    }

    try {
      const content = readFileSync(decisionsPath, "utf-8");
      let decisions = parseDecisionsMd(content);

      // Filter by member if requested
      const memberFilter = req.query.member as string | undefined;
      if (memberFilter) {
        decisions = decisions.filter(
          (d) => d.author.toLowerCase().includes(memberFilter.toLowerCase())
        );
      }

      // Apply limit (default 10)
      const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
      decisions = decisions.slice(0, limit);

      res.json({ squadId: squad.id, decisions });
    } catch (err) {
      console.error(`[building] Error reading decisions.md for ${squad.id}:`, err);
      res.status(500).json({ error: "Failed to read decisions" });
    }
  });

  // POST /api/squads/:squadId/ceremonies/:type — Start a ceremony
  router.post("/squads/:squadId/ceremonies/:type", (req: Request, res: Response) => {
    const { squadId } = req.params;
    const ceremonyType = req.params.type as string;

    if (ceremonyType !== "design-review" && ceremonyType !== "retro") {
      res.status(400).json({ error: `Invalid ceremony type: ${ceremonyType}. Must be "design-review" or "retro".` });
      return;
    }

    const squad = state.squads.get(squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    // Read ceremony config
    const ceremoniesPath = path.join(squad.path, ".squad", "ceremonies.md");
    let participants: string[] = squad.members.map((m) => m.name);

    if (existsSync(ceremoniesPath)) {
      try {
        const content = readFileSync(ceremoniesPath, "utf-8");
        const configs = parseCeremoniesMd(content);
        const config = configs.find((c) => c.type === ceremonyType);
        if (config && !config.enabled) {
          res.status(400).json({ error: `Ceremony "${ceremonyType}" is not enabled` });
          return;
        }
        // If participants config says "all-relevant" or "all-involved", use all members
        // Otherwise, use all members as default
      } catch (err) {
        console.error(`[building] Error reading ceremonies.md for ${squadId}:`, err);
      }
    }

    const ceremonyId = randomUUID();
    const startedAt = new Date().toISOString();

    const ceremony: CeremonyState = {
      ceremonyId,
      type: ceremonyType as CeremonyType,
      squadId,
      participants,
      startedAt,
      active: true,
    };

    activeCeremonies.set(ceremonyId, ceremony);

    // Broadcast WebSocket event
    if (opts?.broadcast) {
      opts.broadcast({
        type: "ceremony.start",
        agentId: "system",
        timestamp: startedAt,
        payload: { squadId, ceremonyType, participants },
      });
    }

    console.log(`[building] Ceremony "${ceremonyType}" started for squad "${squadId}" — ${participants.length} participants`);

    res.json({
      ceremonyId,
      type: ceremonyType,
      participants,
      startedAt,
    });
  });

  // POST /api/squads/:squadId/ceremonies/:ceremonyId/end — End a ceremony
  router.post("/squads/:squadId/ceremonies/:ceremonyId/end", (req: Request, res: Response) => {
    const { squadId, ceremonyId } = req.params;

    const squad = state.squads.get(squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const ceremony = activeCeremonies.get(ceremonyId);
    if (!ceremony) {
      res.status(404).json({ error: "Ceremony not found" });
      return;
    }

    if (ceremony.squadId !== squadId) {
      res.status(400).json({ error: "Ceremony does not belong to this squad" });
      return;
    }

    ceremony.active = false;
    activeCeremonies.delete(ceremonyId);

    // Broadcast WebSocket event
    if (opts?.broadcast) {
      opts.broadcast({
        type: "ceremony.end",
        agentId: "system",
        timestamp: new Date().toISOString(),
        payload: { squadId, ceremonyId },
      });
    }

    console.log(`[building] Ceremony "${ceremony.type}" ended for squad "${squadId}"`);

    res.json({ ok: true, ceremonyId, squadId });
  });

  // GET /api/squads/:squadId/status — Detailed squad status
  router.get("/squads/:squadId/status", (req: Request, res: Response) => {
    const { squadId } = req.params;
    const squad = state.squads.get(squadId);
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const liveAgents = opts?.getAgents?.() ?? [];

    // Cross-reference squad members with live agent records
    const members = squad.members.map((m) => {
      const agentId = `squad-${squadId}-${m.id}`;
      const liveAgent = liveAgents.find((a) => a.agentId === agentId);

      const blockers: string[] = [];
      const agentStatus = liveAgent?.status ?? m.status ?? "available";
      if (agentStatus === "error") blockers.push("Agent in error state");
      if (agentStatus === "blocked") blockers.push("Agent is blocked");

      return {
        id: m.id,
        name: m.name,
        role: m.role,
        badge: m.badge,
        status: agentStatus,
        summary: m.scope,
        lastActivity: liveAgent?.lastSeen ?? new Date().toISOString(),
        blockers,
      };
    });

    // Find active ceremony for this squad
    let activeCeremony: CeremonyState | null = null;
    for (const c of activeCeremonies.values()) {
      if (c.squadId === squadId && c.active) {
        activeCeremony = c;
        break;
      }
    }

    // Count recent decisions
    let recentDecisions = 0;
    const decisionsPath = path.join(squad.path, ".squad", "decisions.md");
    if (existsSync(decisionsPath)) {
      try {
        const content = readFileSync(decisionsPath, "utf-8");
        const decisions = parseDecisionsMd(content);
        recentDecisions = decisions.length;
      } catch {
        // ignore read errors
      }
    }

    res.json({
      squadId: squad.id,
      squadName: squad.name,
      members,
      activeCeremony,
      recentDecisions,
    });
  });

  return router;
}
