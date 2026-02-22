# Dutch — History

## Learnings
- Project started 2026-02-22. Adapting AIOffice for Squad teams.
- Source: ChristianFJung/AIOffice (Phaser 3 + Express + PTY). Fork: cirvine-MSFT/AIOfficeSquad.
- Squad CLI: @bradygaster/squad-cli v0.7.0. Squad repo: bradygaster/squad.
- Goal: Walk around pixel-art office, chat with squad members, see their work, run ceremonies.

### 2026-02-22: Scope Research Complete
**AIOffice Architecture:**
- Monorepo (3 apps): server (Express + WebSocket + node-pty), web (Phaser 3), CLI (officeagent)
- Server spawns `claude` or `copilot` CLI in PTY, watches JSONL files for responses, broadcasts via WebSocket
- Web: Phaser scene renders office tilemap, NPCs at desks, player movement (WASD), proximity detection
- UI layer: chat panel, terminal (xterm.js), agent spawn modal
- Data flow: chat input → WebSocket → PTY stdin → CLI processes → JSONL file → server parses → WebSocket broadcast → UI displays
- Testing: 22 Playwright integration tests
- Key files: `apps/server/src/index.ts` (server), `apps/web/src/game.ts` (Phaser scene), `apps/web/src/main.ts` (UI), `shared/src/schema.ts` (types)

**Squad Architecture:**
- Node.js CLI, GitHub Copilot agent protocol, markdown-based memory (`.squad/` directory)
- Team roster: `.squad/team.md` (cast names, roles, charters)
- Agent charter: `.squad/agents/{name}/charter.md` (identity, expertise, voice) ~750 tokens
- Agent history: `.squad/agents/{name}/history.md` (project learnings) 1K–12K tokens
- Shared decisions: `.squad/decisions.md` (team-wide decisions) ~32K tokens
- Casting system: persistent name registry (`.squad/casting/`)
- Ceremonies: retros, design reviews, sprint planning (`templates/ceremonies.md`)
- Memory: charter (identity) + history (learnings) + decisions (shared brain)
- Context budget: 200K tokens per agent. ~34K–45K for charter + decisions + history. ~155K–166K for actual work.

**Adaptation Scope: 10 Issues Across 4 Domains**
1. **Data Integration (3 issues):** Parse `.squad/team.md` → populate NPCs, connect chat to squad agent context, display decisions in UI
2. **Agent Spawning (2 issues):** Spawn squad agents via squad-cli, adapt terminal view for squad output
3. **UI & Visual (3 issues):** Display roles/badges/status at desks, ceremony visualization (conference room), status dashboard
4. **Tooling (2 issues):** Rename CLI (officeagent → squadoffice), adapt spawn modal for squad members

**Architecture Decisions:**
- Shell out to `npx @bradygaster/squad-cli` for agent spawning (don't reimplement squad protocol)
- Server watches `.squad/` files (chokidar), syncs to in-memory state, broadcasts via WebSocket
- Support both JSONL (legacy Claude Code) and squad agent output (structured markdown + events)
- Ceremonies are visual-only (no new agent logic) — NPCs move to conference room, transcript logs to `.squad/log/ceremonies/`
- CLI renamed: `officeagent` → `squadoffice` (preserves "office" brand, adds "squad" signal)

**Implementation Sequence:**
- Phase 1 (MVP): Parse team roster → NPCs, spawn squad agents via CLI
- Phase 2: Connect chat to squad context, terminal view for squad output
- Phase 3: Visual polish (roles, badges, ceremonies, decisions display)
- Phase 4: Tooling (CLI rename, spawn modal, status dashboard)

**Blockers:**
- GitHub Issues disabled on fork (cirvine-MSFT/AIOfficeSquad) — cannot create issues until Casey enables
- Created scope plan in `.squad/decisions/inbox/dutch-scope-plan.md` as workaround

**Next Steps:**
- Casey to enable GitHub Issues on fork
- Create 10 GitHub issues from scope plan
- Start Phase 1 (Issue 1: parse team roster, Issue 4: spawn squad agents)

### 2026-02-22: Vision Shift — Building/Pod/Agent Model
**What changed:** Casey directed a fundamental shift from single flat office to office building metaphor. Building → Pods → Agents maps to Squad hierarchy (collection → team → member).

**Architecture decisions made:**
- Three Phaser scenes: BuildingScene (hallway, pod grid) → PodScene (refactored OfficeScene, squad-scoped) → Agent interaction (UI overlay, not separate scene)
- BuildingScene is programmatic (not tilemap) because pod count varies per config
- PodScene reuses existing office tilemap — all pods look the same in MVP
- Squad discovery via `squadoffice.config.json` (config file over auto-scan, because repos live at different paths)
- REST API becomes hierarchical: `/building` → `/squads/:id` → `/squads/:id/agents/:aid`
- WebSocket events gain `squadId` field for routing
- "Talk to Room" is first-class interaction (maps to Squad coordinator)
- "Talk to Person" is walk-up proximity chat (existing behavior, scoped to pod)

**Issue changes:**
- Created 7 new issues (#11-#17) for building-level features
- Added Phase 0 (Multi-Pod Foundation): #11 BuildingScene, #12 PodScene refactor, #13 multi-squad server, #14 scene transitions
- Updated issues #1, #2, #3, #4, #8 with building-model scope changes
- Created phase labels (phase:0 through phase:4) and architecture label
- Phase 0 is now the prerequisite — nothing else makes sense without scene hierarchy

**Key insight:** The original OfficeScene code (game.ts) maps almost directly to PodScene with minimal refactoring. The building layer is additive new code. This is less disruptive than it initially appears.

**Server architecture:** New modules: BuildingManager (loads config, manages squads), SquadManager (per-squad state, roster, file watching). Existing agent management becomes squad-scoped.

**Written to:** `.squad/decisions/inbox/dutch-building-architecture.md`
