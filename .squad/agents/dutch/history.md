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

### 2026-02-22: Phase 5 Planning — Productivity UX Overhaul
**What changed:** Casey directed a fundamental product shift: remove video game walking, add instant click/hotkey navigation, make chat and terminal actually work end-to-end. This is a product-direction shift from "walk-around novelty" to "command-center productivity tool."

**Issues created:** #18–#25 (8 issues across two sub-phases)
- **Phase 5a (Navigation & Core UX):** #18 instant pod nav, #19 instant agent selection, #20 unified chat panel, #21 label overlap fix, #22 roster sidebar + shortcut overhaul
- **Phase 5b (Working Features):** #23 agent PTY spawning, #24 terminal end-to-end, #25 chat round-trip

**Architecture decisions:**
- Decouple interaction from spatial proximity (click/hotkey replaces walk-up)
- Unified chat panel with target selector replaces separate R-key/E-key modes
- Player sprite becomes optional decoration, not required for navigation
- Roster sidebar is pure HTML/CSS reading existing API data
- PTY/terminal/chat pipeline exists — Phase 5b connects the dots and verifies it works
- All Phase 0-4 work preserved; changes are additive or refactoring existing triggers

**Dependency chain:** #21 (bug fix) first → #18/#19 parallel → #20 → #22. Backend: #23 first → #24/#25 parallel.

**Written to:** `.squad/decisions/inbox/dutch-phase5-planning.md`

### 2026-02-22: Implementation Architecture Plan — Building/Floor/Office

**What happened:** Billy completed SDK feasibility review. Casey approved mockup. Dutch reviewed full codebase (main process, renderer, preload, all 8 components, types, design tokens, mockup HTML) and wrote the implementation architecture plan.

**Architecture decisions made:**
- Extend existing codebase, don't rewrite. All existing files modified in-place. New files only where structural clarity demands it.
- 3-level navigation is a state machine in a `useNavigation` hook: building → floor → office. Escape pops one level. Single-squad auto-selects.
- Extract `useChat` and `useSquadData` hooks from App.tsx for testability, not because App.tsx is too big.
- Extract `RoleAvatar` and `StatusDot` shared components — `getInitials()` + `getRoleKey()` duplicated in AgentCard, ChatPanel, Sidebar.
- Component subdirs: `building/`, `floor/`, `office/`, `shared/` under `renderer/components/`.
- PodView.tsx becomes FloorView — session room cards (glass-wall preview) instead of agent card grid.
- OfficeView is NEW — desk grid + water cooler + chat panel + terminal panel in two-column layout.
- Phase 1 is single-squad only (28h estimated). Building visual (multi-squad hub) is Phase 3.
- IPC contract extended with `hub:*` channels for Phase 3, but Phase 1 only adds `squad:get-session-detail`.
- New types: `HubStats`, `SquadInfo`, `SquadStatus`, `SessionMetadata`, `SessionDetail`, `AgentInSession`.
- Testing: Vitest for hooks and components. No E2E for Electron in Phase 1.
- 6 review gates (G1-G6) before any code merges.

**Implementation order:** Phase 1a (hooks + types) → 1b (FloorView) → 1c (OfficeView) → 1d (integration + tests). Mac and Poncho can parallelize on 1a.

**Written to:** `.squad/decisions/inbox/dutch-implementation-architecture.md`
