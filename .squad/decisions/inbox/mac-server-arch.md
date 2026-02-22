# Decision: Multi-Squad Server Architecture

**Date:** 2026-02-22
**By:** Mac (Backend Dev)
**Issues:** #13, #1, #4

## What
Implemented Phase 0 + Phase 1 of the building/pod/agent model:

1. **Multi-squad config** (`squadoffice.config.json`) — lists squad directories. Auto-detects if file missing.
2. **squad-reader.ts** — parses `.squad/team.md` `## Members` table into typed roster. Watches file for live changes.
3. **building-routes.ts** — REST endpoints: `GET /api/building/squads`, `GET /api/building/squads/:id`, `GET /api/squads/:id/agents`, `POST /api/squads/:id/agents/:agentId/chat`.
4. **Auto-seeding** — on startup, squad members populate the agents list automatically. No manual spawn needed.
5. **Charter injection** — when chatting with a squad agent, their `.squad/agents/{name}/charter.md` + `history.md` are loaded as personality context for the PTY process.
6. **Backward compat** — existing `/agents/*` and `/agents/spawn` endpoints remain untouched.

## Why
- Agents should come from the squad roster, not be manually spawned one by one.
- Multi-squad support is foundational for the building model (multiple pods in one office).
- Charter injection gives each agent their actual role context when spawned.

## Key Decisions
- **Scribe and Ralph are hidden** — they're system agents, not visible NPCs.
- **Agent IDs use format `squad-{squadId}-{memberId}`** — scoped to squad for uniqueness.
- **fs.watchFile** used for team.md watching (no extra deps needed for prototype).
- **New modules instead of bloating index.ts** — squad-reader.ts and building-routes.ts are separate.
- **Shared types** in `shared/src/squad-types.ts` for cross-package use.
