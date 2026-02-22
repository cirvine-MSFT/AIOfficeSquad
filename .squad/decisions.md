# Decisions

> Canonical decision ledger. Append-only. Scribe merges from `.squad/decisions/inbox/`.

---

### 2026-02-22T03:46:00Z: Project inception
**By:** Casey Irvine
**What:** Adapt AIOffice (pixel-art walkable office for AI agents) for Squad teams. Fork at cirvine-MSFT/AIOfficeSquad. Integrate with @bradygaster/squad-cli and squad agent protocol.
**Why:** Enable visual, interactive squad management — walk up to squad members, chat, see their work, run ceremonies in a pixel-art office.

---

### 2026-02-21T20:01:02Z: Squad → AIOffice concept mapping
**By:** Billy (Squad Expert)
**What:** Comprehensive mapping of Squad CLI concepts to AIOffice features for the adaptation project
**Why:** Foundation for scoping the adaptation work

---

## Executive Summary

Squad is a **file-based multi-agent orchestration system** that runs entirely through GitHub Copilot CLI/VS Code. AIOffice is a **pixel-art virtual office UI** that manages real AI CLI processes (Claude Code, Copilot CLI) with PTY sessions and WebSocket bridges. The integration will bring Squad's persistent team state, memory system, and orchestration model into AIOffice's visual environment.

**Core insight:** Squad's `.squad/` directory structure maps cleanly to AIOffice's agent data model. The main challenge is bridging Squad's Copilot-based sub-agent spawning to AIOffice's PTY-based process management.

---

## Concept Mapping Table

| Squad Concept | Squad Location | AIOffice Feature | AIOffice Location | Integration Strategy |
|---------------|----------------|------------------|-------------------|---------------------|
| **Team Roster** | `.squad/team.md` | Agent list with desk assignments | `apps/server/src/index.ts` agents array | Parse `team.md` → populate agents with Squad metadata (role, charter path) |
| **Agent Charters** | `.squad/agents/{name}/charter.md` | Agent personality field | `shared/src/schema.ts` + spawn modal | Load charter.md → inject as personality/system prompt for PTY CLI |
| **Agent Histories** | `.squad/agents/{name}/history.md` | Agent persistent state/memory | New: `data/agents/{id}/history.md` | Read/write history.md as agents work; show in UI as "memory" tab |
| **Decisions** | `.squad/decisions.md` | Shared state visualization | New: UI panel "Team Decisions" | Display decisions.md as a timeline; allow filtering by author/date |
| **Ceremonies** | `.squad/ceremonies.md` | Meeting room events | New: Phaser scene "conference room" | Trigger ceremony → spawn meeting room → agents gather → chat log of ceremony |
| **Routing Rules** | `.squad/routing.md` | Task assignment logic | `apps/server/src/index.ts` (new) | Parse routing.md → auto-route incoming tasks to correct agent |
| **Orchestration Log** | `.squad/orchestration-log/` | Work activity feed | New: UI panel "Activity Feed" | Display spawn/task/completion events in sidebar |
| **Casting System** | `.squad/casting/` (policy, registry, history) | Agent name generator | New: casting service | Preserve Squad's universe-based naming; use same JSON files |
| **Skills** | `.squad/skills/*.md` | Agent skill library | New: "Skills" UI tab | Show available skills, assign to agents, track confidence |
| **Scribe Agent** | `.squad/agents/scribe/` (silent background) | System agent | New: non-visual background process | Scribe runs as invisible agent; merges decisions, logs sessions |
| **Ralph (Work Monitor)** | `.squad/agents/ralph/` + `squad watch` CLI | Background work detector | New: server polling service | Periodic check for GitHub issues with `squad` label, auto-assign |
| **Ceremonies Config** | `.squad/ceremonies.md` (trigger, when, facilitator) | Event configuration | New: `data/ceremonies.json` | Parse ceremonies.md → enable/disable meeting triggers |
| **Spawn Protocol** | Copilot `task` tool (background/sync modes) | PTY process spawn | `apps/server/src/index.ts` `node-pty` | **BRIDGE LAYER NEEDED:** Squad agent spawn → PTY CLI with charter as system prompt |

---

## Key Integration Points

### 1. **Agent Spawn Bridge** (CRITICAL)
**Squad:** Uses Copilot's `task` tool to spawn sub-agents with `mode: "background"` or `mode: "sync"`.
**AIOffice:** Uses `node-pty` to spawn CLI processes (Claude Code, Copilot CLI).

**Integration:** Create a "Squad Adapter" layer that:
- Intercepts Squad spawn requests
- Translates charter.md → CLI system prompt
- Spawns PTY with working directory from `.squad/agents/{name}/`
- Bridges JSONL output (Claude) or REPL output (Copilot) to Squad's expected response format

**Implementation:** New module `apps/server/src/squad-adapter.ts`

### 2. **State Persistence** (HIGH PRIORITY)
**Squad:** All state lives in `.squad/` directory (git-committed).
**AIOffice:** Runtime state lives in `data/agents/` (not committed).

**Integration:** 
- Persist AIOffice agent state to `.squad/agents/{name}/` 
- On startup, read `.squad/team.md` to populate office
- Agent desk positions saved to `.squad/agents/{name}/position.json` (new file)

**Implementation:** Extend `apps/server/src/index.ts` to read/write `.squad/` on spawn/shutdown

### 3. **Memory System** (HIGH PRIORITY)
**Squad:** Each agent appends learnings to `history.md` after every session.
**AIOffice:** No persistent memory beyond session chat logs.

**Integration:**
- After agent completes task, extract learnings from chat log
- Append to `.squad/agents/{name}/history.md`
- On spawn, load history.md and inject into CLI system prompt

**Implementation:** New module `apps/server/src/memory-manager.ts`

### 4. **Decisions Visualization** (MEDIUM PRIORITY)
**Squad:** `decisions.md` is append-only ledger, human-readable markdown.
**AIOffice:** No visualization for shared state.

**Integration:**
- Parse `decisions.md` into structured events (timestamp, author, what, why)
- Display in new UI panel: "Team Decisions" timeline
- Allow filtering by agent, date, category

**Implementation:** New component `apps/web/src/decisions-panel.ts`

### 5. **Ceremony Triggering** (MEDIUM PRIORITY)
**Squad:** Coordinator triggers ceremonies based on conditions in `ceremonies.md`.
**AIOffice:** No meeting/event system.

**Integration:**
- When ceremony triggered, create temporary "conference room" scene
- Spawn all participant agents (read from ceremony config)
- Bridge ceremony chat to visual office
- Log ceremony output to `.squad/orchestration-log/`

**Implementation:** New Phaser scene `apps/web/src/ceremony-scene.ts`

### 6. **CLI Commands** (LOW PRIORITY)
**Squad:** CLI commands like `squad watch`, `squad export`, `squad import`.
**AIOffice:** CLI is `officeagent start`, `officeagent spawn`, `officeagent demo`.

**Integration:**
- Add new commands: `officeagent watch` (runs Ralph), `officeagent export/import`
- Reuse Squad CLI logic for these commands
- Display Ralph status in office UI (corner icon)

**Implementation:** Extend `apps/officeagent/src/index.ts`

---

## Architecture Changes Needed

### New Server Components

```
apps/server/src/
├── index.ts                 # Existing: REST + WS + PTY
├── squad-adapter.ts         # NEW: Bridge Squad spawn → PTY
├── memory-manager.ts        # NEW: Read/write history.md, decisions.md
├── casting-service.ts       # NEW: Load Squad casting system
├── ceremony-manager.ts      # NEW: Trigger and log ceremonies
└── routing-engine.ts        # NEW: Parse routing.md for task assignment
```

### New Web Components

```
apps/web/src/
├── game.ts                  # Existing: Phaser office scene
├── main.ts                  # Existing: UI panels
├── decisions-panel.ts       # NEW: Visualize decisions.md
├── activity-feed.ts         # NEW: Orchestration log view
├── ceremony-scene.ts        # NEW: Meeting room scene
└── skills-panel.ts          # NEW: Agent skills library
```

### Updated Shared Types

```
shared/src/
├── schema.ts                # Existing: Agent, Message schemas
└── squad-types.ts           # NEW: Charter, Decision, Ceremony schemas
```

---

## Data Flow: Squad Agent Spawn → AIOffice PTY

**Current Squad Flow (via Copilot):**
1. User: "Kane, implement the API endpoint"
2. Coordinator reads `routing.md`, selects Kane (Backend agent)
3. Coordinator spawns Kane via `task` tool with `mode: "background"`
4. Kane loads charter.md + history.md + decisions.md
5. Kane does work, writes code, appends to history.md
6. Kane writes decision to `.squad/decisions/inbox/kane-api-design.md`
7. Scribe merges decision to `decisions.md`

**Proposed AIOffice Flow (with PTY):**
1. User walks to Kane's desk, chats: "Implement the API endpoint"
2. Web sends WebSocket `chat` event to server
3. Server reads `.squad/agents/kane/charter.md` and `history.md`
4. Server spawns PTY: `claude --dangerously-skip-permissions --system-prompt "$(cat charter.md history.md)"`
5. PTY writes to `.squad/agents/kane/working/`
6. Server watches JSONL output from Claude
7. Server extracts learnings, appends to `history.md`
8. Server checks for decision markers in output, writes to `.squad/decisions/inbox/`
9. Server (Scribe agent) merges decision to `decisions.md`
10. Web displays Kane's response in chat panel + terminal view

**Key difference:** Instead of Copilot's `task` tool managing the sub-agent, AIOffice PTY + JSONL watcher handles it.

---

## Gaps and New Features Needed

### Critical Gaps
1. **No sub-agent spawn protocol** — AIOffice has no equivalent to Copilot's `task` tool
   - **Solution:** Build Squad Adapter to translate spawn → PTY
2. **No persistent memory** — AIOffice agents forget everything after process restart
   - **Solution:** Implement Memory Manager for history.md read/write
3. **No shared state** — Agents can't see each other's decisions
   - **Solution:** All agents load `decisions.md` on spawn

### New Features Needed
1. **Team Decisions Panel** — Visualize `decisions.md` as timeline
2. **Activity Feed** — Show orchestration log events in real-time
3. **Ceremony Room** — Phaser scene for design reviews and retros
4. **Skills Library** — UI to browse and assign `.squad/skills/*.md`
5. **Ralph Status Icon** — Show work monitor status in office corner
6. **Agent Memory Tab** — Per-agent UI to view their `history.md`

### Optional Enhancements
1. **Multi-office support** — Different repos = different offices (workspaces feature)
2. **Issue board overlay** — Show GitHub issues as post-its on office wall
3. **Ceremony replay** — Scrub through past ceremony logs like a video
4. **Casting editor** — UI to change universe allowlist in `casting/policy.json`

---

## Backward Compatibility

**Squad files remain authoritative.** AIOffice is a **visualization layer** over Squad's `.squad/` directory. Any changes made in AIOffice write to Squad files. Any changes made via Squad CLI (e.g., `squad upgrade`) are reflected in AIOffice on next load.

**Interoperability goal:** A developer should be able to:
1. Use Squad CLI in terminal to spawn an agent
2. Open AIOffice and see that agent at a desk
3. Chat with agent in AIOffice
4. Close AIOffice, use Squad CLI to check `decisions.md`
5. All state stays consistent

---

## Migration Strategy

### Phase 1: Read-Only Integration
- Load `.squad/team.md` → populate office with existing agents
- Display charters as agent personalities
- Show `decisions.md` in read-only panel
- **Goal:** AIOffice can visualize an existing Squad team

### Phase 2: Basic Spawning
- Implement Squad Adapter for PTY spawning
- Agents write to `history.md` after tasks
- Agents read `decisions.md` on spawn
- **Goal:** AIOffice agents behave like Squad agents

### Phase 3: Full Memory System
- Scribe agent runs as background process
- Decision inbox merging works
- Skills system active
- **Goal:** Feature parity with Squad CLI

### Phase 4: Visual Enhancements
- Ceremony room scene
- Activity feed
- Skills panel
- Ralph status icon
- **Goal:** AIOffice adds value beyond Squad CLI

---

## Open Questions for Mac and Poncho

1. **PTY system prompt injection:** Can we pass `--system-prompt` to Claude Code CLI? Or do we need to inject charter as first message?
2. **JSONL watch scope:** Squad watches `~/.claude/projects/` for all agents. How do we isolate per-agent JSONL output in AIOffice?
3. **Desk assignment persistence:** Store in `.squad/agents/{name}/position.json` or in `team.md`?
4. **Ceremony rendering:** Full Phaser scene or just a modal with chat history?
5. **Ralph integration:** Run as separate process (like `squad watch`) or as server background task?
6. **Scribe spawn:** Should Scribe be a visible desk in the office or truly invisible?

---

## Success Criteria

**We know the integration works when:**
1. ✅ A user runs `squad` CLI to init a team, then opens AIOffice and sees all agents at desks
2. ✅ A user chats with an agent in AIOffice, agent appends to `history.md`, user sees it with `cat .squad/agents/{name}/history.md`
3. ✅ An agent makes a decision in AIOffice, Scribe merges it to `decisions.md`, all other agents see it
4. ✅ A user triggers a ceremony in AIOffice, sees the meeting in a visual scene, logs are written to `.squad/orchestration-log/`
5. ✅ A user runs `squad export`, sends the JSON to a colleague, colleague runs AIOffice and sees the full team with all knowledge intact

---

## Next Steps (Recommendations)

1. **Billy (Squad Expert):** Document Squad spawn protocol in detail (agent spawn tool call format, expected responses)
2. **Mac (System Architect):** Design Squad Adapter module architecture, define PTY → Squad bridge contract
3. **Poncho (Integration Specialist):** Prototype memory manager (read/write history.md on agent spawn/shutdown)
4. **Team decision:** Review open questions above, prioritize phases 1-4
5. **Scribe:** Merge this mapping into `decisions.md` as canonical integration plan

---

### 2026-02-22T03:46:00Z: AIOffice → Squad Adaptation Scope
**By:** Dutch (Lead)
**What:** Detailed adaptation scope: 10 GitHub issues across 4 domains (data integration, agent spawning, UI/visual, tooling)
**Why:** Foundation for incremental development; unblocks Phase 1-4 work

---

## Executive Summary

AIOffice is a Phaser 3 + Express + node-pty app that renders AI agents (Claude Code, Copilot CLI) as NPCs in a pixel-art office. Squad is a GitHub Copilot agent framework that creates persistent AI teams (`.squad/team.md`, per-agent charters/history, shared decisions). The adaptation scope: replace generic agent spawning with squad member integration, surface squad metadata (roles, decisions, history) visually, and add ceremony visualization (retros, design reviews as office meetings).

**Effort estimate:** 8-12 issues across 4 domains (data integration, agent spawning, UI/visual, tooling).

---

## Research Summary

### AIOffice Architecture (ChristianFJung/AIOffice)

**Tech stack:** TypeScript monorepo (3 apps), Phaser 3 (web), Express + WebSocket + node-pty (server), Commander CLI (officeagent).

**Key components:**
- **Server** (`apps/server/src/index.ts`): REST + WebSocket + PTY manager. Spawns `claude` or `copilot` CLI in PTY, watches JSONL files (`~/.claude/projects/`) for responses, broadcasts via WebSocket.
- **Web** (`apps/web/src/`): Phaser scene renders office tilemap, NPCs at desks, player movement (WASD), proximity detection. UI layer (`main.ts`) handles chat panel, terminal (xterm.js), agent spawn modal.
- **CLI** (`apps/officeagent/`): Thin wrapper: `start`, `spawn`, `demo` commands. Auto-detects CLIs, spawns agents into demo projects.
- **Shared** (`shared/src/`): TypeScript types, Zod schemas for WebSocket events (`agent.status`, `agent.message`, etc.).

**Data flow (chat):**
1. User types in chat input → WebSocket `chat` event → server writes to PTY stdin
2. CLI processes message → Claude writes JSONL file → server's JSONL watcher detects → parses response → broadcasts via WebSocket
3. Web app displays message in chat panel + shows typing indicator on NPC sprite

**Data flow (spawn):**
1. HTTP POST `/agents/spawn` → server assigns desk, creates PTY, starts CLI, waits for output
2. Server sends intro message → broadcasts `agents-update` via WebSocket
3. Web app creates NPC sprite at assigned desk

**PTY management:** Each agent = `node-pty` instance running `claude --dangerously-skip-permissions` or `copilot`. Terminal WebSocket (`/terminal/:id`) streams raw PTY I/O to xterm.js.

**Visual layer:** Phaser scene loads `pixel-office` tileset (floor, furniture, walls, NPCs). NPCs = static sprites positioned at desks. Typing indicators = animated dots above sprite. Selection ring = yellow tint + bouncing triangle.

**Testing:** Playwright integration tests (22 tests). Tests spawn agents via API, verify JSONL parsing, WebSocket events, terminal output.

### Squad Architecture (bradygaster/squad)

**Tech stack:** Node.js CLI, GitHub Copilot agent protocol, markdown-based memory (`.squad/` directory).

**Key concepts:**
- **Team roster** (`.squad/team.md`): List of squad members with cast names, roles, charters.
- **Agent charter** (`.squad/agents/{name}/charter.md`): Identity, expertise, voice. ~750 tokens.
- **Agent history** (`.squad/agents/{name}/history.md`): Project-specific learnings. 1K–12K tokens. Grows with use.
- **Shared decisions** (`.squad/decisions.md`): Team-wide decisions. ~32K tokens (post-pruning). Read by all agents.
- **Casting system** (`casting/`): Persistent name registry (e.g., "Dutch", "Casey"). Names don't change across sessions.
- **Ceremonies** (`templates/ceremonies.md`): Design reviews, retros, sprint planning.
- **Squad CLI** (`@bradygaster/squad-cli`): `npx @bradygaster/squad` to init `.squad/` directory, spawn agents, run ceremonies.

**Agent spawn:** GitHub Copilot CLI agent system (`/agent` command). Coordinator spawns agents in parallel. Each agent loads charter + history + decisions, does work, writes learnings back to history.

**Output format:** Not JSONL. Structured markdown in agent responses. Multi-agent coordination via spawned sub-agents.

**Memory architecture:**
- **Charter** (identity) → agent reads on spawn
- **History** (project learnings) → agent reads on spawn, writes on session end
- **Decisions** (shared brain) → all agents read, any agent writes, Scribe merges

**Context budget:** 200K tokens per agent. ~34K–45K tokens for charter + decisions + history. ~155K–166K for actual work.

---

## Adaptation Scope

### Domain 1: Data Integration (3 issues)

#### 1. Parse `.squad/team.md` to populate office NPCs
**Goal:** Map squad members to NPCs instead of generic agents.

**Work:**
- Server reads `.squad/team.md` on startup + watches for changes (chokidar)
- Parse roster: extract cast names, roles (emoji badges), charter paths
- Map each member to an NPC with:
  - Name = cast name from charter
  - Role = badge emoji (⚛️ Frontend, 🔧 Backend, 🏗️ Lead, etc.)
  - Desk = assigned position (new field in `team.md` or auto-assign logic)
  - Status = "available" (default), "working" (active session), "error" (blocked)
- NPC label shows `{name} ({role})`
- Status display shows current task summary (from `.squad/agents/{name}/history.md` or WebSocket)

**Acceptance criteria:**
- [ ] Server watches `.squad/team.md`
- [ ] Each squad member becomes an NPC with name + role + desk
- [ ] NPC label shows name + role badge
- [ ] Status reflects agent state (available, working, error)

#### 2. Connect walk-up chat to squad agent context
**Goal:** Chat with squad member loads their charter + history.

**Work:**
- Chat input sends to specific squad member (not generic agent)
- Agent spawns with charter (`.squad/agents/{name}/charter.md`) + history (`.squad/agents/{name}/history.md`) loaded
- Messages persist to history after each turn
- Panel title shows squad member name + role
- Panel provider badge shows "Squad" icon (not Claude/Copilot)
- Support agents not running: spawn on-demand or queue message

**Acceptance criteria:**
- [ ] Chat sends to correct squad member's agent
- [ ] Agent loads charter + history on spawn
- [ ] Messages persist to history
- [ ] Panel UI reflects squad member identity

#### 3. Read `.squad/decisions.md` and display in office UI
**Goal:** Surface team decisions visually (bulletin board or panel).

**Work:**
- Server watches `.squad/decisions.md` for changes
- Parse decision blocks (markdown sections with timestamp + author)
- UI element displays recent decisions (last 5-10)
- Click to expand full decision
- Filter by squad member or date

**Design options:**
- Bulletin board on office wall (interactive object in Phaser)
- Side panel (like chat, but for decisions)
- Overlay triggered by keyboard shortcut

**Acceptance criteria:**
- [ ] Server watches `.squad/decisions.md`
- [ ] UI displays recent decisions
- [ ] Click to expand full decision
- [ ] Filter by member or date

### Domain 2: Agent Spawning & Communication (2 issues)

#### 4. Spawn squad agents via squad-cli integration
**Goal:** Replace PTY-based Claude/Copilot spawning with squad agent protocol.

**Work:**
- Server spawns squad agent via `npx @bradygaster/squad-cli` (or programmatic API if available)
- Agent process receives charter + history context on spawn
- WebSocket bridge adapts to squad agent output format (not JSONL)
- Terminal view shows squad agent output (tool calls, coordination)
- Agent status updates propagate to NPC status
- Graceful shutdown of squad agent processes

**Research needed:**
- Squad CLI programmatic API? Or shell out to `npx`?
- Squad agent output format? (Not JSONL — likely structured markdown + WebSocket events)

**Acceptance criteria:**
- [ ] Server spawns squad agent via CLI or API
- [ ] Agent receives charter + history on spawn
- [ ] WebSocket bridge works with squad output
- [ ] Terminal shows squad agent output
- [ ] Status updates propagate to NPC

#### 5. Terminal view shows squad agent work output
**Goal:** Ensure xterm.js renders squad agent output cleanly.

**Work:**
- Terminal WebSocket connects to squad agent PTY
- Tool calls (file edits, commands) display cleanly
- Multi-agent coordination messages (spawned sub-agents, results)
- ANSI color codes render correctly
- Terminal scrollback preserves full session history
- Terminal persists across panel tab switches (chat ↔ terminal)

**Acceptance criteria:**
- [ ] Terminal connects to squad agent PTY
- [ ] Tool calls display cleanly
- [ ] Multi-agent coordination visible
- [ ] ANSI colors render
- [ ] Scrollback works

### Domain 3: UI & Visual Enhancements (3 issues)

#### 6. Display squad member roles, badges, and status at desks
**Goal:** Visual polish — each desk clearly shows who's there and what they're doing.

**Work:**
- Role badge emoji displays above NPC (⚛️, 🔧, 🏗️, etc.)
- Status color-coding matches squad semantics (working, available, blocked, error)
- Current task summary shows above NPC when working (e.g., "Building login form")
- Typing indicator shows when agent actively generating output
- (Optional) Different desk styles/backgrounds by role

**Acceptance criteria:**
- [ ] Role badge emoji displays
- [ ] Status color-coded
- [ ] Task summary shows when working
- [ ] Typing indicator on active agents

#### 7. Ceremony visualization — design review and retro as office meetings
**Goal:** Visual ceremony modes. NPCs move to conference room for ceremonies.

**Work:**
- New tilemap area: conference room with seats for squad members
- Command or UI button to trigger ceremonies (design review, retro)
- NPCs move to conference room when ceremony starts (Phaser tweens)
- Chat panel shows ceremony mode (all members visible)
- Ceremony transcript logs to `.squad/log/ceremonies/`
- NPCs return to desks when ceremony ends

**References:** Squad `templates/ceremonies.md`

**Acceptance criteria:**
- [ ] Conference room tilemap area
- [ ] UI button to trigger ceremonies
- [ ] NPCs move to conference room
- [ ] Ceremony transcript logs
- [ ] NPCs return to desks after

#### 8. Squad status dashboard — team health, active members, tasks
**Goal:** High-level squad view. Who's active, current tasks, blockers, decisions.

**Work:**
- Dashboard accessible via keyboard shortcut or UI button
- Shows active squad members + status
- Lists current tasks per member
- Highlights blockers or errors
- Shows recent decisions and session history
- Clicking member focuses camera on their desk

**Design options:**
- Slide-out panel (like chat)
- Overlay (semi-transparent, dismissible)
- Minimap-style view (always visible)

**Acceptance criteria:**
- [ ] Dashboard UI with keyboard shortcut
- [ ] Shows active members + status
- [ ] Lists current tasks
- [ ] Highlights blockers
- [ ] Click member focuses camera

### Domain 4: Tooling & CLI (2 issues)

#### 9. Adapt CLI tool (officeagent → squadoffice)
**Goal:** Rename and adapt CLI for squad teams.

**Work:**
- Rename binary: `officeagent` → `squadoffice` (or `squad-office`, `aioffice-squad`)
- Command: `squadoffice start` — launches server + web with squad integration
- Command: `squadoffice init` — runs `npx @bradygaster/squad` to set up `.squad/`
- Command: `squadoffice spawn <member-name>` — spawns specific squad member
- Command: `squadoffice demo` — loads demo squad (not generic Claude/Copilot)
- Update README and docs

**Acceptance criteria:**
- [ ] CLI renamed
- [ ] `start`, `init`, `spawn`, `demo` commands work
- [ ] README updated

#### 10. Agent spawn modal adapted for squad members
**Goal:** Spawn modal shows squad roster, not generic CLI type.

**Work:**
- Modal shows squad roster dropdown (from `.squad/team.md`)
- Selecting member shows role, charter summary, last active time
- "Spawn" button launches with full context
- "Add New Member" flow triggers squad init for new agents
- Remove generic CLI type selection (Claude/Copilot) — squad only

**Acceptance criteria:**
- [ ] Modal shows squad roster
- [ ] Selecting member shows role + charter
- [ ] Spawn button launches with context
- [ ] "Add New Member" flow triggers squad init

---

## Architecture Decisions

### 1. Squad CLI Integration Strategy
**Decision:** Shell out to `npx @bradygaster/squad-cli` for agent spawning. Don't reimplement squad agent protocol in AIOffice server.

**Rationale:**
- Squad CLI is the source of truth for agent spawning, context loading, output format.
- Reimplementing would duplicate logic and diverge from upstream.
- Shell out keeps AIOffice focused on visualization, not agent orchestration.

**Trade-off:** Adds dependency on squad CLI being installed. Acceptable — squad is the core product.

### 2. Memory Bridge Strategy
**Decision:** Server watches `.squad/` files (team.md, decisions.md, agent histories) and syncs to in-memory state. WebSocket broadcasts changes to web app.

**Rationale:**
- `.squad/` files are the canonical source of truth.
- Watching files (chokidar) keeps server state in sync with squad changes (even from external CLI sessions).
- WebSocket broadcasts enable real-time UI updates.

**Trade-off:** File watching adds I/O overhead. Acceptable — `.squad/` changes are infrequent (once per agent session).

### 3. Agent Output Format
**Decision:** Adapt WebSocket bridge to handle both JSONL (legacy Claude Code) and squad agent output (structured markdown + events).

**Rationale:**
- Squad agent output is not JSONL — likely structured markdown or custom events.
- Supporting both allows incremental migration and fallback to original AIOffice behavior.
- Terminal view (xterm.js) should display raw PTY output regardless of format.

**Trade-off:** More complex parsing logic in server. Acceptable — keeps backward compatibility.

### 4. Ceremony Visualization
**Decision:** Ceremonies are visual-only (no new agent logic). NPCs move to conference room, chat panel shows ceremony mode, transcript logs to `.squad/log/ceremonies/`.

**Rationale:**
- Ceremonies are a squad concept (retros, design reviews). Visualizing them reinforces squad identity.
- No need to reimplement ceremony logic — squad CLI handles that. AIOffice just visualizes.

**Trade-off:** Ceremony logic lives in squad CLI, not AIOffice. Acceptable — separation of concerns.

### 5. CLI Naming
**Decision:** Rename `officeagent` → `squadoffice` (or `squad-office`). Keep "office" to preserve brand, add "squad" to signal integration.

**Rationale:**
- "squadoffice" clearly signals this is the squad-integrated version.
- "office" maintains continuity with original AIOffice project.

**Alternative considered:** `aioffice-squad`, `squad-workspace`. Rejected — too long or loses "office" brand.

---

## Implementation Sequence

**Phase 1: Foundation (Issues 1, 4)**
1. Parse `.squad/team.md` → NPCs (Issue 1)
2. Spawn squad agents via CLI (Issue 4)

**Phase 2: Communication (Issues 2, 5)**
3. Connect chat to squad agent context (Issue 2)
4. Terminal view for squad output (Issue 5)

**Phase 3: Visual Polish (Issues 6, 7, 3)**
5. Display roles, badges, status (Issue 6)
6. Ceremony visualization (Issue 7)
7. Decisions display (Issue 3)

**Phase 4: Tooling (Issues 9, 10, 8)**
8. Adapt CLI tool (Issue 9)
9. Spawn modal for squad (Issue 10)
10. Status dashboard (Issue 8)

---

## Open Questions

1. **Squad CLI programmatic API?** Does `@bradygaster/squad-cli` expose a programmatic API, or must we shell out to `npx`?
2. **Squad agent output format?** What does squad agent output look like? JSONL? Structured markdown? Custom WebSocket events?
3. **Desk assignment logic?** Should desks be manually assigned in `.squad/team.md`, or auto-assigned by server? If auto, what's the algorithm?
4. **Conference room tilemap?** Do we create a new tilemap for ceremony visualization, or overlay NPCs in existing office space?
5. **Ceremony triggering?** How are ceremonies triggered in the office? UI button? Chat command? Keyboard shortcut?

---

## Next Steps

1. **Enable GitHub Issues** on cirvine-MSFT/AIOfficeSquad (currently disabled).
2. **Create 10 GitHub issues** from this scope plan (one per numbered item above).
3. **Label all issues** with `squad` label.
4. **Prioritize Phase 1** (Issues 1, 4) for MVP: basic squad member display + agent spawning.
5. **Iterate from there** based on user feedback and Casey's priorities.

---

## Metrics for Success

- [ ] `.squad/team.md` roster populates office with named NPCs (not generic agents)
- [ ] Walk-up chat connects to squad agent with full context (charter + history)
- [ ] Terminal view shows squad agent work output (tool calls, coordination)
- [ ] Ceremony visualization works (NPCs move to conference room)
- [ ] CLI renamed and adapted for squad workflows
- [ ] Office feels like a visual representation of your squad, not a generic agent sandbox

---

**Status:** Scope complete. Ready to create GitHub issues once Issues are enabled on fork.

**Next owner:** Casey Irvine (to enable Issues on fork) or Dutch (to create issues once enabled).

---

## 2026-02-22T04:08:07Z: User directive — Visual concept shift
**By:** Casey Irvine (via Copilot)
**What:** The visual metaphor should be an office building / org chart, not a single office. Each squad session is a separate open-space office or "pod" (like Microsoft pods). You walk into a pod to see a team of agents working together. You can talk to the whole room (CLI session). The building holds multiple squads/sessions. Individual agents are visible inside their team's pod doing work. The concept scales from "office workers" to "teams in an office building."
**Why:** User request — captured for team memory. This is the core creative vision for the project.
---

### 2026-02-22T04:08:07Z: Architecture Decision — Building / Pod / Agent Model

**By:** Dutch (Lead)
**Status:** Proposed
**Supersedes:** dutch-scope-plan.md (single flat office model)

**Decision Summary:** Reorganize spatial hierarchy from single flat office to building → pod → agent structure, mapping directly to Squad's collection → team → member hierarchy.

**Key Technical Decisions:**

1. **Scene Architecture (Phaser 3):**
   - **BuildingScene:** Top-level hallway view. Programmatically generated pod grid (not tilemap, because pod count varies). Player walks between pods. Door zones trigger transitions.
   - **PodScene:** Per-squad interior. Refactored from existing OfficeScene. Tilemap-based office with squad's agents only. Add exit door and "Talk to Room" interaction.
   - **Agent Interaction:** UI overlay on PodScene (chat panels, terminal). No separate AgentScene — flattens navigation complexity.

2. **Squad Discovery:** squadoffice.config.json (config file) over auto-scan. Explicit, versionable, supports custom naming. Squads may live at different filesystem paths.

3. **API Hierarchy:**
   - GET /building — Building summary (all squads)
   - GET /squads/:id — Squad roster, state, decisions
   - POST /squads/:id/chat — Room-level chat (coordinator routing)
   - POST /squads/:id/agents/:aid/chat — Agent-specific chat

4. **Room-Level Interaction:** "Talk to Room" is first-class (hotkey R or UI button). Routes through Squad coordinator. Separate from walk-up proximity chat ("Talk to Person").

5. **Pod Rendering:** All pods reuse same office interior tilemap in MVP. Squad identity comes from agents inside, not room decor.

**Impact on Issues #1–#10:**
- Issues updated with multi-squad scope annotations
- Room-level chat (#2 updated)
- Per-squad decisions display (#3 updated)
- Scoped agent spawning (#4 updated)
- No change to terminal (#5), badges (#6), ceremonies (#7 scoped to pod)
- Two-level dashboard (#8 split to building + pod views)
- CLI updated for building commands (#9)
- Spawn modal becomes pod-aware (#10)

**New Issues Needed (Phase 0 — Foundation):**
- **#11:** BuildingScene implementation
- **#12:** PodScene refactor from OfficeScene
- **#13:** Building config and multi-squad server (BuildingManager, SquadManager)
- **#14:** Scene transitions and navigation (BuildingScene ↔ PodScene)
- **#15:** "Talk to Room" coordinator chat (Phase 1)
- **#16:** Building-level activity dashboard (Phase 2)
- **#17:** Pod preview rendering in BuildingScene (Phase 2)

**Phasing Reorganized:**
- **Phase 0 (NEW):** #11, #12, #13, #14 — Multi-pod foundation (prerequisite for everything)
- **Phase 1 (Core):** #1, #4, #2, #15 — Team roster, spawning, walk-up chat, room chat
- **Phase 2 (Comms):** #5, #3, #16, #17 — Terminal, decisions, dashboards, pod previews
- **Phase 3 (Polish):** #6, #7, #8 — Badges, ceremonies, dashboards
- **Phase 4 (Tooling):** #9, #10 — CLI, spawn modal

**Key Insight:** Existing OfficeScene code maps almost directly to PodScene. BuildingScene and multi-squad server are additive. Less disruptive than architectural complexity suggests.

**Next Steps:** Kickoff Phase 0. BuildingScene and PodScene refactor are blocking dependencies for all downstream work.

