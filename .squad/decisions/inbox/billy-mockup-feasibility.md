# SDK Feasibility Review: Building/Floor/Office Mockup

**Author:** Billy (Squad Expert)
**Date:** 2026-02-22
**SDK Version:** @bradygaster/squad-sdk@0.8.2
**Mockup:** `apps/desktop/mockup.html`

---

## Executive Summary

The mockup defines a three-level drill-down UI: **Building → Floor → Office**. The Floor and Office levels are well-supported by the SDK today (~90-95% coverage). The Building level (multi-squad hub) has **zero direct SDK support** and requires custom code. The mockup is missing several powerful SDK features that would enrich the UI significantly.

**Bottom line:** ~65% of the mockup is directly buildable today. Another ~20% is buildable with workarounds. The remaining ~15% needs the hub PR or custom code.

---

## Feature-by-Feature Assessment

### BUILDING LEVEL (Hub View)

| Mockup Feature | Status | Notes |
|---|---|---|
| **Multi-squad listing in sidebar** | 🔴 Not possible yet | SDK's `resolveSquad()` finds ONE `.squad/` dir. No multi-squad discovery/enumeration API. Need custom `SquadRegistry` that scans multiple directories. |
| **Building with floors (squads as floors)** | 🔴 Not possible yet | No "hub" or multi-squad container concept in SDK. The `upstream` module reads *other* squad repos for context inheritance, but doesn't enumerate peer squads. |
| **Lit windows showing active sessions** | 🟡 Buildable with workarounds | Per-squad: `SessionPool.active()` returns active sessions. But aggregating across multiple squads requires one `SquadClientWithPool` per squad + custom aggregation layer. |
| **"4 floors • 24 members • 8 active sessions" aggregate stats** | 🔴 Not possible yet | No cross-squad aggregation API. Need custom code to sum across multiple `SessionPool` + `AgentLifecycleManager` instances. |
| **Hub name ("Predator Hub")** | 🟡 Buildable with workarounds | Not an SDK concept. Store as app-level config (e.g., in Electron settings or a `hub.json`). |
| **Connection status indicator** | ✅ Supported today | `SquadClientWithPool.isConnected()` and `getState()` provide connection status per squad. |
| **Breadcrumb navigation** | ✅ Supported today | Pure UI concern — no SDK dependency. |

### FLOOR LEVEL (Squad View)

| Mockup Feature | Status | Notes |
|---|---|---|
| **Squad name and metadata** | ✅ Supported today | `loadConfig()` / `loadConfigSync()` → `SquadConfig.team.name`, `team.description`. |
| **Member count** | ✅ Supported today | `SquadConfig.agents[]` array gives the full roster. `AgentLifecycleManager.listActive()` for live agents. |
| **Session rooms (office-room cards)** | ✅ Supported today | `SquadClientWithPool.listSessions()` returns `SquadSessionMetadata[]`. `SessionPool.active()` for live state. |
| **Session status (active/idle)** | ✅ Supported today | `SessionPool` tracks `SessionStatus`: 'creating' | 'active' | 'idle' | 'error' | 'destroyed'. `PoolEvent` emits `session.status_changed`. |
| **Mini desk preview with occupied/empty** | ✅ Supported today | `SessionPool.findByAgent(name)` maps agents to sessions. `AgentLifecycleManager.listActive()` shows who's working. |
| **Working/idle member counts per session** | ✅ Supported today | `AgentHandle.status` is 'spawning' | 'active' | 'idle' | 'error' | 'destroyed'. Cross-reference with session membership. |
| **"Start new session" card** | ✅ Supported today | `SquadClientWithPool.createSession(config)` creates a new session. |
| **Agent roles (Lead, Backend, Frontend, etc.)** | ✅ Supported today | `SquadConfig.agents[].role` + `AGENT_ROLES` constant + `AgentConfig.role`. |
| **Role-based color coding** | ✅ Supported today | Roles come from config. Color mapping is pure UI. |
| **Floor number assignment** | 🟡 Buildable with workarounds | SDK has no "floor" concept. Map squad order/config to floor numbers in app layer. |

### OFFICE LEVEL (Session Detail)

| Mockup Feature | Status | Notes |
|---|---|---|
| **Session name and task description** | ✅ Supported today | `SquadSessionMetadata.summary`. Task from `SpawnAgentOptions.task`. |
| **Desk grid with agent workstations** | ✅ Supported today | `AgentLifecycleManager.listActive()` provides `AgentHandle[]` with name, status, model info. |
| **Monitor glow (active/inactive)** | ✅ Supported today | `AgentHandle.status` drives this. `AgentStatus` = 'active' means working. |
| **Agent name plates** | ✅ Supported today | `AgentHandle.agentName` + charter data via `compileCharterFull()` for display names. |
| **Water cooler area (idle agents)** | ✅ Supported today | Filter `AgentHandle.status === 'idle'` from active agents. `lastActivityAt` for idle duration. |
| **Session chat panel** | ✅ Supported today | `SquadSession.sendMessage()` for outbound. `session.on('message_delta', ...)` for inbound streaming. |
| **Chat with role-colored avatars** | ✅ Supported today | Agent roles from config + `StreamDelta.agentName` identifies speaker. |
| **Live terminal output** | ✅ Supported today | `StreamingPipeline.onDelta()` provides token-by-token streaming. `StreamDelta` has `content`, `agentName`, `sessionId`. |
| **Terminal line prefixes (▶, ✓)** | 🟡 Buildable with workarounds | SDK streams raw content. Parsing tool_call events from `EventBus` (`session:tool_call`) can identify phases. Map tool names to prefix icons in UI. |
| **Chat input (textarea)** | ✅ Supported today | `SquadSession.sendMessage({ prompt: '...' })`. Also supports `attachments` and `mode` ('enqueue' | 'immediate'). |

### STATUS BAR

| Mockup Feature | Status | Notes |
|---|---|---|
| **Total members count** | ✅ Supported today | Sum `SquadConfig.agents.length` across squads. |
| **Active sessions count** | ✅ Supported today | `SessionPool.active().length` per squad. |
| **Floor count** | 🔴 Not possible yet | Hub-level concept, no SDK API. Custom aggregation needed. |

---

## SDK Features the Mockup SHOULD Incorporate

These are powerful SDK capabilities completely absent from the mockup:

### 1. 🔥 **StreamingPipeline Events** (HIGH PRIORITY)
The mockup shows static terminal output. The SDK provides:
- `StreamDelta` — token-by-token message streaming
- `ReasoningDelta` — model thinking/reasoning content (show in a collapsible "Thinking..." panel)
- `UsageEvent` — per-turn token counts and estimated cost

**Recommendation:** Add a "thinking" indicator when reasoning deltas arrive. Show token counters in status bar.

### 2. 🔥 **CostTracker** (HIGH PRIORITY)
`CostTracker` provides real-time cost accumulation:
- Per-agent breakdown (`AgentCostEntry`: tokens, cost, turn count, fallback count)
- Per-session breakdown (`SessionCostEntry`)
- `formatSummary()` for quick display

**Recommendation:** Add cost badges to office rooms and agent desks. Show running $ total in status bar. This is a killer feature for enterprise users.

### 3. 🔥 **EventBus + WS Bridge** (HIGH PRIORITY)
`startWSBridge(bus)` broadcasts ALL EventBus events over WebSocket on port 6277. This is literally designed for us:
- 9 event types: session lifecycle, messages, tool calls, routing, milestones, pool health
- JSON envelope: `{ "kind": "event", "payload": { ...SquadEvent... } }`

**Recommendation:** The Electron app should connect to the WS bridge instead of polling. Real-time push for all UI updates.

### 4. **SquadObserver** (MEDIUM PRIORITY)
Watches `.squad/` directory for file changes:
- Categories: agent, casting, config, decision, skill
- Change types: created, modified, deleted
- Emits to EventBus

**Recommendation:** Add an "Activity Feed" panel showing `.squad/` file changes in real time. Show when decisions are added, agents are modified, skills are updated.

### 5. **Hooks/Permissions System** (MEDIUM PRIORITY)
`HookPipeline` + `SquadSessionHooks` provide governance:
- Pre/post tool use interception
- Permission requests (shell, write, mcp, read, url)
- PII scrubbing, reviewer lockout
- `onUserInputRequest` — agent asks user a question

**Recommendation:** Show permission request popups in the office UI. When an agent needs write access, show a dialog in their office room. The `ask_user` tool should surface as a chat bubble.

### 6. **Model Fallback Chain** (LOW PRIORITY)
`ModelFallbackExecutor` tracks fallback attempts:
- Primary model → tier fallback → cross-tier fallback
- `FallbackResult.attempts[]` shows what was tried

**Recommendation:** Show model badge on each agent desk (e.g., "sonnet-4.5"). If fallback occurred, show a warning indicator.

### 7. **Casting System** (LOW PRIORITY)
`CastingEngine.castTeam()` generates personas from universe themes. `CastingHistory` tracks past castings.

**Recommendation:** Add a "Cast Team" button that lets users pick a universe and recast agent names/personas. Fun feature for the office metaphor.

### 8. **RalphMonitor** (LOW PRIORITY)
Persistent work monitor with:
- `AgentWorkStatus`: working/idle/stale/error + `currentTask`, `milestones`
- Health checks on session pool
- Stale session detection

**Recommendation:** Ralph could power the "stale agent" detection — if an agent hasn't done anything in 5 minutes, move their avatar to the water cooler automatically.

### 9. **Upstream Squads** (FUTURE)
`resolveUpstreams()` reads inherited context from org-level or parent squads. This maps to the Building concept — a hub of related squads that share upstream wisdom.

**Recommendation:** Show inherited skills/decisions flowing down from a parent floor in the building.

---

## Workaround Details for 🟡 Items

| Feature | Workaround |
|---|---|
| **Lit windows (cross-squad)** | Instantiate one `SquadClientWithPool` per squad directory. Aggregate `pool.active().length` across all instances. |
| **Hub name** | Store in app-level config file (e.g., `squadoffice.config.json` which already exists in the repo root). |
| **Floor numbers** | Assign floor numbers based on squad ordering in hub config. Pure app-layer mapping. |
| **Terminal line prefixes** | Subscribe to `EventBus` `session:tool_call` events. Map tool names to icons: `edit_file` → ✏️, `run_command` → ▶, test results → ✓/✗. |

---

## What We'd Need for 🔴 Items

| Feature | What's Missing | Recommendation |
|---|---|---|
| **Multi-squad discovery** | SDK only resolves single `.squad/` dir | Build `SquadRegistry` class: scan configured directories, instantiate `SquadClientWithPool` per squad, aggregate events via shared `EventBus`. ~200 LOC. |
| **Cross-squad aggregation** | No API to sum stats across squads | Build `HubAggregator`: subscribe to all per-squad EventBus instances, maintain aggregate counters, expose to UI. ~150 LOC. |
| **Hub concept** | Not in SDK scope | Pure app concept. Define in `squadoffice.config.json` with `{ hub: { name, squads: [{ path, floor }] } }`. |

None of the 🔴 items require SDK changes — they're all buildable as app-layer code on top of the existing SDK. The SDK intentionally scopes to single-squad operations; multi-squad orchestration is our app's value-add.

---

## Recommended Implementation Priority

### Phase 1: Easy Wins (1-2 days)
1. ✅ **Floor view (single squad)** — `loadConfig()` + `AgentLifecycleManager` + `SessionPool` covers 95%
2. ✅ **Office view (session detail)** — `StreamingPipeline` + `SquadSession` + `EventBus` covers 95%
3. ✅ **Chat panel** — `sendMessage()` + `onDelta()` is straightforward
4. ✅ **Connection status** — `isConnected()` + connection state events

### Phase 2: Medium Effort (2-3 days)
5. 🟡 **Real-time updates via WS Bridge** — `startWSBridge()` is one line; Electron connects via WebSocket
6. 🟡 **Cost tracking display** — Wire `CostTracker.wireToEventBus()`, render in status bar
7. 🟡 **Activity feed (SquadObserver)** — Watch `.squad/` changes, render as feed
8. 🟡 **Permission/ask_user dialogs** — Wire `onPermissionRequest` + `onUserInputRequest` to UI

### Phase 3: Hard / Custom (3-5 days)
9. 🔴 **Building view (multi-squad hub)** — Build `SquadRegistry` + `HubAggregator` + hub config schema
10. 🔴 **Cross-squad aggregation** — EventBus bridging across multiple `SquadClientWithPool` instances
11. 🟡 **Casting UI** — `CastingEngine` integration with universe picker

### Phase 4: Polish
12. **RalphMonitor integration** — Auto-idle detection, stale session warnings
13. **Model badges + fallback indicators** — `ResolvedModel` + `FallbackResult` display
14. **Upstream inheritance visualization** — Show inherited context in building view

---

## Key Architectural Recommendation

The mockup's data model maps cleanly to this SDK stack:

```
Building (Hub)     → Custom SquadRegistry (our code)
  └─ Floor (Squad) → SquadClientWithPool + loadConfig()
       └─ Office   → SessionPool + AgentLifecycleManager
            └─ Desk → AgentHandle + StreamingPipeline
```

**Mac (backend)** should own: `SquadRegistry`, `HubAggregator`, IPC bridge to renderer
**Poncho (frontend)** should own: React components for all three view levels, WS event consumption
**Billy (me)** will advise on SDK wiring and `.squad/` file protocol details

The WS Bridge (`startWSBridge`) is the critical integration point — it was literally built for external consumers like us. Start there.
