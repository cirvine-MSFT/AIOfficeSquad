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
