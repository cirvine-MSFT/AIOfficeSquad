# Implementation Architecture Plan

**Author:** Dutch (Lead)
**Date:** 2026-02-22
**Status:** Active — Implementation Blueprint
**Input:** Billy's SDK Feasibility Review, Approved Mockup (`apps/desktop/mockup.html`)

---

## Executive Summary

This document is the implementation blueprint for the Building/Floor/Office UI. It defines the file structure, component contracts, data flow, state management, and phasing for Poncho (frontend) and Mac (backend) to execute against. Dutch reviews at every gate listed in Section G.

We already have a solid foundation: `SquadRuntime` in main, typed IPC bridge, React renderer with `App.tsx`, `Sidebar`, `BuildingView`, `PodView`, `ChatPanel`, `AgentCard`, `StatusBar`, `StreamingOutput`, and a full design-token system. The work ahead is **extending**, not rewriting.

---

## A. File & Folder Structure

```
apps/desktop/src/
├── main/
│   ├── index.ts                    # ✅ EXISTS — app lifecycle, window creation
│   ├── squad-runtime.ts            # ✅ EXISTS — single-squad SDK wrapper
│   ├── squad-registry.ts           # 🆕 Multi-squad discovery & lifecycle
│   ├── hub-aggregator.ts           # 🆕 Cross-squad stats aggregation
│   ├── ws-bridge.ts                # 🆕 WS Bridge connection per squad
│   ├── ipc-handlers.ts             # ✅ EXISTS — extend with new channels
│   └── types.ts                    # ✅ EXISTS — extend with new interfaces
│
├── renderer/
│   ├── App.tsx                     # ✅ EXISTS — refactor for 3-level nav
│   ├── main.tsx                    # ✅ EXISTS — entry point
│   ├── types.ts                    # ✅ EXISTS — extend with new shapes
│   ├── components/
│   │   ├── Header.tsx              # ✅ EXISTS — add breadcrumb nav
│   │   ├── Sidebar.tsx             # ✅ EXISTS — refactor for hub/floor list
│   │   ├── StatusBar.tsx           # ✅ EXISTS — add aggregate stats
│   │   ├── AgentCard.tsx           # ✅ EXISTS — no changes needed
│   │   ├── ChatPanel.tsx           # ✅ EXISTS — extend for session-scoped chat
│   │   ├── StreamingOutput.tsx     # ✅ EXISTS — no changes needed
│   │   ├── BuildingView.tsx        # ✅ EXISTS — replace with building visual
│   │   ├── PodView.tsx             # ✅ EXISTS — rename/refactor to FloorView
│   │   ├── building/
│   │   │   ├── BuildingVisual.tsx  # 🆕 Pixel-art building with lit windows
│   │   │   └── FloorRow.tsx        # 🆕 Single floor row in building
│   │   ├── floor/
│   │   │   ├── FloorHeader.tsx     # 🆕 Squad name + stats bar
│   │   │   ├── SessionCard.tsx     # 🆕 Office room card (glass-wall preview)
│   │   │   └── NewSessionCard.tsx  # 🆕 "+ Start new session" dashed card
│   │   ├── office/
│   │   │   ├── OfficeView.tsx      # 🆕 Session detail (desk grid + cooler)
│   │   │   ├── DeskWorkstation.tsx # 🆕 Single agent workstation
│   │   │   ├── WaterCooler.tsx     # 🆕 Idle agents area
│   │   │   └── TerminalPanel.tsx   # 🆕 Live output panel (replaces inline)
│   │   └── shared/
│   │       ├── Breadcrumb.tsx      # 🆕 Hub > Floor > Office nav
│   │       ├── StatusDot.tsx       # 🆕 Extract from CSS class usage
│   │       └── RoleAvatar.tsx      # 🆕 Extract duplicated avatar logic
│   ├── hooks/
│   │   ├── useSquadData.ts         # 🆕 SDK data fetching + subscriptions
│   │   ├── useNavigation.ts        # 🆕 3-level drill-down state machine
│   │   └── useChat.ts             # 🆕 Extract chat logic from App.tsx
│   └── stores/
│       └── navigation.ts           # 🆕 Navigation state (building/floor/office)
│
├── preload/
│   └── index.ts                    # ✅ EXISTS — extend with new channels
│
└── __tests__/                      # 🆕 Test directory
    ├── main/
    │   ├── squad-registry.test.ts  # 🆕
    │   └── hub-aggregator.test.ts  # 🆕
    └── renderer/
        ├── hooks/
        │   ├── useNavigation.test.ts   # 🆕
        │   └── useChat.test.ts         # 🆕
        └── components/
            ├── Breadcrumb.test.tsx      # 🆕
            └── SessionCard.test.tsx     # 🆕
```

### Key principle: Extend, don't rewrite
Every `✅ EXISTS` file is modified in-place. No mass renames. No new directories unless they add structural clarity (the 4 component subdirs and hooks/stores do).

---

## B. Data Flow

### B.1 SDK → Main Process → Renderer (Push)

```
WS Bridge (port 6277)         .squad/ filesystem
       │                              │
       ▼                              ▼
  ws-bridge.ts              SquadRuntime (existing)
       │                         │
       ▼                         ▼
  SquadRegistry ──────────────────┘
       │
       ▼
  hub-aggregator.ts  (aggregate stats across squads)
       │
       ▼
  ipc-handlers.ts  ──── IPC push channels ───►  preload/index.ts
                                                       │
                                                       ▼
                                              renderer hooks (useSquadData)
                                                       │
                                                       ▼
                                               React component tree
```

**Push channels (main → renderer):**

| Channel | Payload | Purpose |
|---|---|---|
| `squad:event` | `SquadEvent` | ✅ Exists. All EventBus events. |
| `squad:stream-delta` | `StreamDelta` | ✅ Exists. Token-by-token streaming. |
| `squad:stream-usage` | `UsageEvent` | ✅ Exists. Token counts per turn. |
| `squad:connection-state` | `ConnectionState` | ✅ Exists. Per-squad connection. |
| `squad:config-loaded` | `SquadConfig` | ✅ Exists. Initial config push. |
| `hub:stats-updated` | `HubStats` | 🆕 Aggregate stats across all squads. |
| `hub:squad-status` | `SquadStatus` | 🆕 Per-squad connection/session status. |

### B.2 Renderer → Main Process (Invoke)

| Channel | Args | Return | Purpose |
|---|---|---|---|
| `squad:get-ready-state` | `[]` | `ReadyState` | ✅ Exists |
| `squad:create-session` | `[agent, config?]` | `{ sessionId }` | ✅ Exists |
| `squad:send-message` | `[sessionId, prompt]` | `void` | ✅ Exists |
| `squad:list-sessions` | `[]` | `SessionMetadata[]` | ✅ Exists |
| `squad:delete-session` | `[id]` | `void` | ✅ Exists |
| `squad:load-config` | `[]` | `SquadConfig` | ✅ Exists |
| `squad:get-roster` | `[]` | `SquadMember[]` | ✅ Exists |
| `squad:get-agent-statuses` | `[]` | `AgentStatus[]` | ✅ Exists |
| `hub:list-squads` | `[]` | `SquadInfo[]` | 🆕 All registered squads |
| `hub:get-stats` | `[]` | `HubStats` | 🆕 Aggregated hub stats |
| `squad:get-session-detail` | `[sessionId]` | `SessionDetail` | 🆕 Full session data |

### B.3 IPC Result Contract (unchanged)

All invoke channels return `IpcResult<T>`:
```typescript
type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
```

---

## C. Component Boundaries

### C.1 App.tsx (Orchestrator)

**Responsibility:** Root layout, global state wiring, keyboard shortcuts.

**Current state:** Owns all state (roster, sessions, chat, navigation, usage). This is fine for now — we extract to hooks for testability, not because App.tsx is too big.

**Props:** None (root component).

**Changes:**
- Replace inline state management with `useNavigation()`, `useSquadData()`, `useChat()`
- Render `Breadcrumb` in header area
- Conditional render: `BuildingView | FloorView | OfficeView` based on nav state
- ChatPanel only renders when an agent is selected within an office

### C.2 Header.tsx

**Current:** Logo + "Ready" indicator.
**Add:** `Breadcrumb` component slot.

```typescript
interface HeaderProps {
  breadcrumb: BreadcrumbItem[]
  onNavigate: (level: NavLevel, id?: string) => void
  connected: boolean
}
```

### C.3 Sidebar.tsx

**Current:** Squad list + agent list.
**Change:** Show hub info at top, squad/floor list, highlight active floor.

```typescript
interface SidebarProps {
  hubName: string
  squads: SquadSummary[]
  selectedSquadId: string | null
  onSelectSquad: (id: string) => void
  // Agent list shown when a squad is selected (existing behavior)
  agents: AgentInfo[]
  selectedAgent: string | null
  onSelectAgent: (name: string) => void
}

interface SquadSummary {
  id: string
  name: string
  floor: number
  memberCount: number
  activeSessionCount: number
  status: 'connected' | 'disconnected' | 'error'
}
```

### C.4 BuildingView.tsx → Building Visual

**Current:** Simple grid of squad cards.
**Replace with:** Pixel-art building per mockup — stacked floor rows with lit windows.

```typescript
interface BuildingViewProps {
  hubName: string
  squads: SquadSummary[]
  hubStats: HubStats
  onSelectSquad: (id: string) => void
  loading: boolean
}

interface HubStats {
  floorCount: number
  totalMembers: number
  activeSessions: number
}
```

**Subcomponents:**
- `BuildingVisual` — the building graphic (roof, body, foundation)
- `FloorRow` — one floor: number badge, lit windows, squad name, active count

### C.5 FloorView (currently PodView.tsx)

**Current:** `PodView` renders an agent card grid.
**Refactor to:** Floor plan with session room cards per mockup.

```typescript
interface FloorViewProps {
  squad: SquadDetail
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  loading: boolean
}

interface SquadDetail {
  id: string
  name: string
  floor: number
  members: SquadMember[]
  sessions: SessionSummary[]
}

interface SessionSummary {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  task: string
  memberIds: string[]
  workingCount: number
  idleCount: number
}
```

**Subcomponents:**
- `FloorHeader` — squad name, floor number, member count, active sessions
- `SessionCard` — glass-wall office room with mini desk preview
- `NewSessionCard` — dashed "+" card

### C.6 OfficeView (NEW)

**Not in current codebase.** This is the session-detail view from the mockup.

```typescript
interface OfficeViewProps {
  session: SessionDetail
  onSendMessage: (text: string) => void
  onBack: () => void
}

interface SessionDetail {
  id: string
  name: string
  task: string
  squadName: string
  agents: AgentInSession[]
  messages: ChatMessage[]
  streamingText: string
}

interface AgentInSession {
  name: string
  role: string
  status: 'active' | 'idle' | 'error'
  activity?: string
}
```

**Layout:** Two-column — workspace (left) + chat panel (right).

**Subcomponents:**
- `DeskWorkstation` — monitor + chair + nameplate, glow when active
- `WaterCooler` — idle agents with avatars
- `TerminalPanel` — live streaming output with line prefixes
- `ChatPanel` — ✅ already exists, reuse as-is

### C.7 Shared Components (extracted from duplication)

**`Breadcrumb`:**
```typescript
interface BreadcrumbItem {
  label: string
  level: 'hub' | 'floor' | 'office'
  id?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem) => void
}
```

**`RoleAvatar`** — extracted from `AgentCard`, `ChatPanel`, `Sidebar` which all duplicate `getInitials()` + `getRoleKey()`:
```typescript
interface RoleAvatarProps {
  name: string
  role: string
  size: 'sm' | 'md' | 'lg'
}
```

**`StatusDot`** — extracted from CSS class usage:
```typescript
interface StatusDotProps {
  status: 'active' | 'idle' | 'error' | 'working'
  pulse?: boolean
}
```

---

## D. State Management

### D.1 Navigation State Machine

Three levels, strict hierarchy. No skipping.

```
┌──────────┐    selectSquad(id)    ┌──────────┐   selectSession(id)   ┌──────────┐
│ BUILDING  │ ─────────────────►  │  FLOOR    │ ────────────────────► │  OFFICE   │
│           │ ◄─────────────────  │           │ ◄──────────────────── │           │
└──────────┘    back() / Escape    └──────────┘    back() / Escape    └──────────┘
```

**`useNavigation` hook:**

```typescript
type NavLevel = 'building' | 'floor' | 'office'

interface NavigationState {
  level: NavLevel
  selectedSquadId: string | null
  selectedSessionId: string | null
  selectedAgentName: string | null
}

interface UseNavigationReturn {
  state: NavigationState
  selectSquad: (id: string) => void
  selectSession: (id: string) => void
  selectAgent: (name: string | null) => void
  back: () => void
  breadcrumbs: BreadcrumbItem[]
}
```

**Rules:**
- `selectSquad` → sets `level: 'floor'`, clears session + agent
- `selectSession` → sets `level: 'office'`, clears agent
- `selectAgent` → only valid within office, toggles agent selection
- `back()` → pops one level, clears deeper selections
- Escape key maps to `back()`
- Single-squad auto-select: if only 1 squad, auto-navigate to floor level

### D.2 Squad Data State

**`useSquadData` hook** — replaces inline data loading in `App.tsx`:

```typescript
interface UseSquadDataReturn {
  // Hub level
  hubName: string
  squads: SquadSummary[]
  hubStats: HubStats

  // Floor level (per selected squad)
  currentSquad: SquadDetail | null

  // Office level (per selected session)
  currentSession: SessionDetail | null

  // Global
  connected: boolean
  loading: boolean
  error: string | null
}
```

**Data loading strategy:**
- Hub-level data loads on mount (list squads, aggregate stats)
- Floor-level data loads when `selectedSquadId` changes
- Office-level data loads when `selectedSessionId` changes
- Real-time updates arrive via IPC push channels, update in place

### D.3 Chat State

**`useChat` hook** — extracted from current `App.tsx` chat logic:

```typescript
interface UseChatReturn {
  messages: ChatMessage[]
  streamingText: string
  sendMessage: (text: string) => Promise<void>
  createSession: (agentName: string) => Promise<void>
  sessionId: string | null
  sending: boolean
}
```

This hook already works in the current codebase — the extraction is purely structural, moving ~80 lines from App.tsx into their own hook with identical behavior.

---

## E. Phase 1 Scope (Easy Wins)

Phase 1 targets **single-squad operation** — the path Casey can demo immediately. Multi-squad (Building view) is Phase 3 per Billy's recommendation.

### E.1 What we build first

| # | Component | Owner | Effort | Notes |
|---|---|---|---|---|
| 1 | `useNavigation` hook | Poncho | 2h | State machine for 3-level nav. Testable in isolation. |
| 2 | `Breadcrumb` component | Poncho | 1h | Pure UI, takes `BreadcrumbItem[]`. |
| 3 | `Header.tsx` update | Poncho | 30m | Add breadcrumb slot, connection status from existing data. |
| 4 | FloorView (refactor PodView) | Poncho | 4h | Session room cards instead of agent card grid. `SessionCard` + `NewSessionCard`. |
| 5 | `OfficeView` (NEW) | Poncho | 6h | Desk grid + water cooler + chat panel layout. |
| 6 | `DeskWorkstation` | Poncho | 2h | Monitor glow, nameplate, chair. CSS per mockup. |
| 7 | `WaterCooler` | Poncho | 1h | Idle agents display area. |
| 8 | `TerminalPanel` | Poncho | 2h | StreamingPipeline output with line prefixes. |
| 9 | `useChat` hook extraction | Poncho | 1h | Move chat state from App.tsx to hook. |
| 10 | `useSquadData` hook | Mac | 3h | IPC data fetching, event subscriptions. |
| 11 | `squad:get-session-detail` IPC | Mac | 2h | New channel in ipc-handlers + runtime. |
| 12 | `RoleAvatar` + `StatusDot` extraction | Poncho | 1h | DRY up duplicated code in 3 components. |
| 13 | `Sidebar` refactor | Poncho | 2h | Hub info section, squad list with floor numbers. |
| 14 | `StatusBar` update | Poncho | 30m | Show aggregate stats. |
| 15 | Keyboard shortcuts update | Poncho | 1h | Escape = back(), number keys per level. |

**Total Phase 1 estimate:** ~28 hours of work across Poncho + Mac.

### E.2 What we DON'T build in Phase 1

- `SquadRegistry` (multi-squad) — Phase 3
- `HubAggregator` — Phase 3
- `ws-bridge.ts` (WS Bridge connection) — Phase 2
- `CostTracker` display — Phase 2
- Activity feed / `SquadObserver` — Phase 2
- Permission dialogs — Phase 2
- Building visual (pixel-art building) — Phase 3
- Casting UI — Phase 4

### E.3 Phase 1 end state

User opens the app → auto-selects the single configured squad → sees **FloorView** with session room cards → clicks a session → sees **OfficeView** with desk grid, water cooler, chat panel, and live terminal output → can chat with agents and see streaming responses. Escape navigates back. Breadcrumb shows location.

---

## F. Testing Strategy

### F.1 Unit Tests (Vitest)

**What we test:**

| Module | Test focus | Why |
|---|---|---|
| `useNavigation` hook | State transitions, back(), breadcrumb generation | Core navigation logic, easy to test, high value |
| `useChat` hook | Message ordering, streaming text commit, session creation | Complex async state, current bugs will surface |
| `squad-registry.ts` | Squad discovery, config parsing, lifecycle | Phase 3, but design for testability now |
| `hub-aggregator.ts` | Stat aggregation across mock squads | Phase 3, same principle |
| `parseTeamMd` (existing) | Already works, add coverage | Regression protection |

**How:**
- Vitest (already in devDependencies via electron-vite ecosystem)
- `@testing-library/react-hooks` for hook tests
- Mock `window.squadAPI` for renderer tests
- Mock SDK imports for main process tests

### F.2 Component Tests (Vitest + React Testing Library)

| Component | Test focus |
|---|---|
| `Breadcrumb` | Renders items, fires onNavigate with correct level |
| `SessionCard` | Displays status, member count, click handler |
| `StatusDot` | Correct CSS class per status |
| `RoleAvatar` | Correct initials, correct color |

**Not tested at component level:** `BuildingVisual`, `OfficeView`, `FloorView` — these are composition-heavy components that are better validated visually during development and via E2E later.

### F.3 E2E Tests (Playwright / Electron)

**Current state:** The project has 22 Playwright tests for the web app, not the Electron app.

**Phase 1 approach:** No new E2E tests. The Electron app requires a running SDK backend which complicates CI. We rely on:
1. Hook unit tests for logic correctness
2. Component tests for render correctness
3. Manual testing during development
4. E2E consideration in Phase 4 once the app is stable

### F.4 Test runner config

Add to `apps/desktop/package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Test files live in `apps/desktop/src/__tests__/` mirroring the source structure.

---

## G. Review Gates

Dutch reviews at these gates. No code merges without review.

| Gate | Trigger | What Dutch checks |
|---|---|---|
| **G1: Navigation hook** | `useNavigation` + `Breadcrumb` PR | State machine correctness, keyboard handling, TypeScript types |
| **G2: Data layer** | `useSquadData` + `useChat` hooks + new IPC channels | IPC contract matches `types.ts`, error handling, cleanup on unmount |
| **G3: FloorView** | `FloorView` + `SessionCard` + `NewSessionCard` PR | Component boundaries match spec, props match interfaces in this doc |
| **G4: OfficeView** | `OfficeView` + subcomponents PR | Layout matches mockup, chat integration works, streaming works |
| **G5: Integration** | All Phase 1 components wired in `App.tsx` | End-to-end flow works, no regressions, keyboard nav works |
| **G6: Tests** | Test suite PR | Coverage of hooks, no flaky tests, mocks are realistic |

**Review criteria (every gate):**
1. Types are explicit, not `any` or `unknown` where avoidable
2. Components have clear prop interfaces documented in this spec
3. No duplicated logic (use `RoleAvatar`, `StatusDot`, shared hooks)
4. Event listeners are cleaned up on unmount
5. Error states are handled (loading, error, empty)

---

## H. Interface Type Definitions (New)

Add to `apps/desktop/src/main/types.ts`:

```typescript
/** Hub-level aggregate statistics */
export interface HubStats {
  floorCount: number
  totalMembers: number
  activeSessions: number
  totalSessions: number
}

/** Summary of a single squad for hub/sidebar display */
export interface SquadInfo {
  id: string
  name: string
  floor: number
  root: string
  memberCount: number
  activeSessionCount: number
  status: 'connected' | 'disconnected' | 'error'
}

/** Per-squad status update pushed from main */
export interface SquadStatus {
  squadId: string
  connected: boolean
  activeSessionCount: number
  error?: string
}

/** Metadata for a session in the floor view */
export interface SessionMetadata {
  id: string
  name: string
  status: 'active' | 'idle' | 'error' | 'creating' | 'destroyed'
  task?: string
  agentNames: string[]
  createdAt: number
}

/** Full session detail for the office view */
export interface SessionDetail {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  task?: string
  squadId: string
  squadName: string
  agents: AgentInSession[]
  createdAt: number
}

/** Agent within a session context */
export interface AgentInSession {
  name: string
  role: string
  status: 'active' | 'idle' | 'error' | 'spawning'
  model?: string
  activity?: string
  lastActivityAt?: number
}
```

Mirror the subset needed in `apps/desktop/src/renderer/types.ts`.

---

## I. Implementation Order (Dependency Chain)

```
Phase 1a (Foundation — no visual changes):
  ├── useNavigation hook (Poncho)
  ├── useSquadData hook (Mac)
  ├── useChat hook extraction (Poncho)
  ├── New type definitions (Mac)
  └── RoleAvatar + StatusDot extraction (Poncho)
       ↓
Phase 1b (Floor View):
  ├── Breadcrumb (Poncho)
  ├── Header update (Poncho)
  ├── Sidebar refactor (Poncho)
  ├── FloorView + SessionCard + NewSessionCard (Poncho)
  └── squad:get-session-detail IPC (Mac)
       ↓
Phase 1c (Office View):
  ├── OfficeView (Poncho)
  ├── DeskWorkstation (Poncho)
  ├── WaterCooler (Poncho)
  ├── TerminalPanel (Poncho)
  └── StatusBar update (Poncho)
       ↓
Phase 1d (Integration + Polish):
  ├── Wire everything in App.tsx (Poncho)
  ├── Keyboard shortcuts (Poncho)
  └── Tests (Poncho + Mac)
```

**Parallelism:** Mac can work on 1a data layer while Poncho works on 1a hook extraction. Once both land, 1b and 1c can proceed.

---

## J. What This Doesn't Cover (Future Phases)

| Phase | Scope | Depends on |
|---|---|---|
| **Phase 2** | WS Bridge real-time, CostTracker, SquadObserver, permission dialogs | Phase 1 complete |
| **Phase 3** | Multi-squad hub (SquadRegistry, HubAggregator, Building visual) | Phase 2 stable |
| **Phase 4** | Casting UI, RalphMonitor, model fallback, upstream inheritance | Phase 3 complete |

---

## K. Open Questions for Casey

1. **Hub name source:** The mockup uses "Predator Hub". Where does this come from? Billy suggests `squadoffice.config.json`. Current config has no hub name field. Recommendation: add `"hubName": "Predator Hub"` to config.
2. **Multi-squad config:** Current `squadoffice.config.json` has one squad pointing at `.`. When we hit Phase 3, we'll need multiple entries. No action now, but Casey should think about which repos to include.
3. **Test framework:** Vitest is the natural choice for electron-vite projects. Confirm this is acceptable or if Casey prefers something else.

---

*This document is the implementation contract. Poncho and Mac execute against it. Dutch reviews at every gate. Billy advises on SDK questions. Casey sees progress at each phase boundary.*
