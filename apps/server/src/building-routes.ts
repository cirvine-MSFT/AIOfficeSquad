/**
 * building-routes.ts — REST endpoints for multi-squad building model.
 *
 * Endpoints:
 *   GET  /api/building/squads           — list all squads
 *   GET  /api/building/squads/:squadId  — squad details (roster, status)
 *   GET  /api/squads/:squadId/agents    — agents for a squad
 *   POST /api/squads/:squadId/agents/:agentId/chat — chat with squad agent
 */
import { Router, type Request, type Response } from "express";
import { readFileSync, existsSync } from "fs";
import path from "path";
import type { SquadInfo, SquadMember, SquadOfficeConfig } from "../../../shared/src/squad-types";
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
 * Create Express router for building/squad endpoints.
 */
export function createBuildingRouter(state: BuildingState): Router {
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

  return router;
}
