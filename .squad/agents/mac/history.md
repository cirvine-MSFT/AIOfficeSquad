# Mac — History

## Learnings
- Project started 2026-02-22. Backend for AI Office Squad.
- AIOffice server at apps/server/ — Express + PTY + WebSocket.
- Server spawns CLI processes (Claude Code / Copilot CLI) in PTYs, bridges JSONL output over WebSocket.
- Need to integrate @bradygaster/squad-cli v0.7.0 for squad-aware agent management.
- Phase 0+1 done: multi-squad building model, team.md parser, squad-scoped endpoints.
- New modules: squad-reader.ts (parses team.md), building-routes.ts (REST API + squad state).
- squad-types.ts added to shared/src/ for cross-package types.
- squadoffice.config.json at project root defines squad directories; auto-detects if missing.
- Agents auto-seeded from .squad/team.md on server startup — no manual spawn needed.
- Scribe and Ralph are hidden (system agents, not NPCs).
- Charter + history files injected as personality context when spawning squad agent PTYs.
- tsc --noEmit has pre-existing TS6059 rootDir errors from cross-workspace imports (not new).
- Existing /agents/* endpoints still work for backward compat; new endpoints under /api/building/ and /api/squads/.
