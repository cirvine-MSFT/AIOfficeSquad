# Architecture Decision: Building / Pod / Agent Model

**Author:** Dutch (Lead)  
**Date:** 2026-02-22  
**Status:** Proposed  
**Supersedes:** Previous flat-office scope plan (dutch-scope-plan.md)

---

## Context

Casey's vision directive (2026-02-22T04:08) fundamentally changes the spatial metaphor from a **single flat office** (original AIOffice) to a **multi-level office building**. This maps cleanly to Squad's hierarchical structure:

| Visual Layer | Squad Concept | Interaction |
|---|---|---|
| **Building** | Collection of squads (multiple repos/projects) | See all pods, walk to one |
| **Pod** (room) | One squad team (one `.squad/` directory) | Walk around, see agents, talk to room |
| **Agent** (desk) | Individual squad member | Chat, view terminal, see status |

This is a **scope expansion** — the original AIOffice had one Phaser scene (`OfficeScene`) with hardcoded desk positions. We now need scene hierarchy, multi-squad state, and navigation transitions.

---

## Scene Architecture (Phaser 3)

### BuildingScene (NEW)

The top-level view. A pixel-art office building floor plan showing multiple "pods" — open-space office rooms visible from above or at an angle.

```
┌─────────────────────────────────────────────────┐
│  SQUAD OFFICE BUILDING                          │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ ai-squad │   │ web-app  │   │ infra    │   │
│  │ 🟢 5/5   │   │ 🟡 3/4   │   │ ⚫ 0/3   │   │
│  │ ░░░░░░░░ │   │ ░░░░░░░░ │   │          │   │
│  │ ░ desks ░ │   │ ░ desks ░ │   │  (idle)  │   │
│  │ ░░░░░░░░ │   │ ░░░░░░░░ │   │          │   │
│  └────🚪────┘   └────🚪────┘   └────🚪────┘   │
│                                                 │
│           🧑 (player avatar)                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Rendering approach:**
- Each pod is a **miniature preview** — a bounding rectangle with the squad name, member count, activity indicator (green = active agents, yellow = some active, grey = idle), and tiny desk sprites inside.
- Pods are laid out in a grid or freeform arrangement (configurable per building config).
- Player sprite can walk the hallway between pods.
- **Door interaction:** Walking into a pod's door triggers scene transition.

**Data displayed per pod:**
- Squad name (from `.squad/team.md` → team name)
- Member count: `{active}/{total}`
- Activity pulse: animated indicator when agents are working
- Last activity timestamp (e.g., "5m ago")
- Optional: miniature NPC sprites visible through the pod "window"

**Key technical changes from original:**
- Original `OfficeScene` was a single tilemap. `BuildingScene` is a **programmatically generated** layout (not a fixed tilemap), because pod count varies.
- Pod rectangles are Phaser containers or zone objects with click/overlap handlers.
- Player movement reuses existing WASD/arrow key system.

### PodScene (REFACTORED from OfficeScene)

When the player walks into a pod door, the game transitions to `PodScene`. This is essentially the **original `OfficeScene`** scoped to one squad.

**What stays the same:**
- Tilemap-based office interior (reuse `office.json` or create a per-pod variant)
- Player sprite with WASD movement
- NPC sprites at desks with labels, status text, typing indicators
- Proximity detection → triggers chat/terminal panel
- Camera follow, collision, depth layering

**What changes:**
- **Scoped to one squad:** Only agents from `this.squadId`'s `.squad/team.md` appear
- **"Back" door:** A door/exit zone at the edge of the room. Walking into it returns to `BuildingScene`.
- **Room conversation input:** A "Talk to Room" button or hotkey sends message to the squad coordinator (not a specific agent). This routes through Squad CLI's coordinator logic.
- **Pod identity:** Room title bar shows squad name, repo path
- **Constructor takes `squadId`:** Scene is parameterized, not singleton

```typescript
// Conceptual API
class PodScene extends Phaser.Scene {
  constructor(private squadId: string) {
    super({ key: `pod-${squadId}` });
  }
}
```

**Scene transition:**
```
BuildingScene → player walks into pod door
  → this.scene.start(`pod-${squadId}`, { squadId })
  → PodScene loads squad roster, positions agents, enables chat

PodScene → player walks to exit door
  → this.scene.start('BuildingScene')
  → BuildingScene resumes with updated pod summaries
```

### Scene Lifecycle

```
┌─────────────┐   walk into pod    ┌───────────┐
│ BuildingScene│ ──────────────────→│ PodScene  │
│  (hallway)  │                    │ (squad X) │
│             │←───────────────────│           │
└─────────────┘   walk to exit     └───────────┘
                                         │
                                         │ walk up to agent
                                         ▼
                                   ┌───────────┐
                                   │ Chat/Term │
                                   │  Panel    │
                                   │ (UI layer)│
                                   └───────────┘
```

Agent-level interaction (chat panel, terminal) stays as a **UI overlay** on top of PodScene — same as current design. No separate "AgentScene" needed.

---

## Data Architecture

### Squad Discovery

The server needs to know about multiple squads. Two approaches:

**Option A: Config file (RECOMMENDED)**
```json
// squadoffice.config.json (project root)
{
  "building": {
    "name": "My Office Building",
    "squads": [
      { "path": "C:/Users/cirvine/code/work/ai-office-squad", "name": "AI Office Squad" },
      { "path": "C:/Users/cirvine/code/work/web-app", "name": "Web App" },
      { "path": "/home/user/infra", "name": "Infrastructure" }
    ]
  }
}
```

**Option B: Auto-scan** — Scan parent directory for `.squad/` directories. Simpler but less control.

**Decision: Option A (config file).** Squads live in different repos at different paths. Auto-scan is fragile and assumes co-located repos. A config file is explicit, versionable, and supports naming.

### Server State Model

```typescript
// Per-squad state
interface SquadState {
  id: string;               // derived from path hash or config name
  name: string;             // display name
  path: string;             // filesystem path to repo root
  roster: AgentInfo[];      // parsed from .squad/team.md
  activeAgents: Map<string, AgentRuntime>;  // spawned agent processes
  lastActivity: Date;
  status: 'active' | 'idle' | 'error';
}

// Building-level state
interface BuildingState {
  squads: Map<string, SquadState>;
  config: BuildingConfig;
}

// Agent within a squad
interface AgentInfo {
  id: string;
  name: string;             // cast name
  role: string;             // from team.md
  charterPath: string;      // .squad/agents/{name}/charter.md
  status: AgentStatus;
  currentTask?: string;
}
```

### Server Architecture Changes

```
apps/server/src/
├── index.ts                  # Express + WS (updated: multi-squad routing)
├── building-manager.ts       # NEW: Loads config, manages SquadState[]
├── squad-manager.ts          # NEW: Per-squad state (roster, agents, file watching)
├── squad-adapter.ts          # Existing plan: bridge squad spawn → PTY
├── memory-manager.ts         # Existing plan: read/write history.md
└── routes/
    ├── building.ts           # NEW: GET /building (all squads summary)
    ├── squad.ts              # NEW: GET /squads/:id (single squad detail)
    └── agents.ts             # REFACTORED: scoped to /squads/:id/agents
```

**Key API changes:**
```
GET  /building                    → { squads: [{ id, name, memberCount, activeCount, lastActivity }] }
GET  /squads/:id                  → { id, name, roster, activeAgents, decisions }
GET  /squads/:id/agents           → agent list (existing /agents, scoped)
POST /squads/:id/agents/spawn     → spawn agent in squad context
POST /squads/:id/chat             → "talk to room" (coordinator)
POST /squads/:id/agents/:aid/chat → "talk to person" (direct)
```

**WebSocket events updated:**
```
building-update   → full building summary (sent periodically or on change)
squad-update      → per-squad agent list + status (scoped by squadId)
chat              → includes squadId field
```

### Web Architecture Changes

```
apps/web/src/
├── scenes/
│   ├── BuildingScene.ts      # NEW: top-level building view
│   ├── PodScene.ts           # REFACTORED from game.ts: scoped to one squad
│   └── BootScene.ts          # NEW: loading screen, fetch building config
├── ui/
│   ├── main.ts               # REFACTORED: panel system (chat, terminal, decisions)
│   ├── BuildingHUD.ts        # NEW: building-level UI (squad list, minimap)
│   └── PodHUD.ts             # NEW: pod-level UI (room name, back button, talk-to-room)
├── state/
│   ├── BuildingStore.ts      # NEW: client-side building state
│   └── SquadStore.ts         # NEW: client-side per-squad state
├── style.css
└── index.html
```

---

## Navigation & Interaction Model

### Building View
| Action | Result |
|---|---|
| Walk around hallway | WASD movement between pods |
| Walk into pod door | Transition to PodScene for that squad |
| Hover over pod | Show tooltip: squad name, members, last activity |
| Keyboard shortcut (Tab?) | Open building dashboard overlay |

### Pod View
| Action | Result |
|---|---|
| Walk around office | WASD movement between desks (same as original) |
| Walk up to agent | Proximity detection → show chat/terminal panels |
| Walk to exit door | Transition back to BuildingScene |
| "Talk to Room" (hotkey/button) | Send message to squad coordinator → routes to right agent |
| "Talk to Person" (proximity + chat) | Direct chat with specific agent |
| View terminal (tab key) | See agent's PTY output in xterm.js panel |

### "Talk to Room" vs "Talk to Person"

**Talk to Room:**
- Activated by hotkey (e.g., `R`) or UI button when in PodScene but not near any agent
- Message goes to `POST /squads/:id/chat` → squad coordinator
- Coordinator decides which agent handles it (or responds itself)
- Response appears in a "room chat" panel (shared, not agent-specific)

**Talk to Person:**
- Activated by walking up to an agent (proximity) and typing in chat panel
- Message goes to `POST /squads/:id/agents/:aid/chat` → specific agent
- Response appears in agent-specific chat panel (same as current design)

---

## Impact on Existing Issues (#1–#10)

### Issues That Need Scope Updates

| Issue | Original Scope | New Scope | Change |
|---|---|---|---|
| **#1** Parse team.md → NPCs | Single office, one team.md | Per-pod: each squad has its own team.md. Server loads all squads from config. | **UPDATE:** Add multi-squad loading. NPCs only appear in their pod. |
| **#2** Walk-up chat | Single agent chat | Same, but scoped to pod. Add "talk to room" as separate flow. | **UPDATE:** Add room-level chat routing. |
| **#3** Decisions display | One decisions.md | Per-squad decisions. Building-level could show cross-squad recent decisions. | **UPDATE:** Scope to per-pod, add building summary. |
| **#4** Spawn via squad-cli | Single squad | Same per-pod, but server manages multiple squad contexts. | **UPDATE:** Squad adapter needs squadId parameter. |
| **#5** Terminal view | Same | No change — terminal is per-agent regardless of pod. | **NO CHANGE** |
| **#6** Role badges/status | Same | No change — visual polish per agent. | **NO CHANGE** |
| **#7** Ceremony visualization | Conference room in single office | Per-pod ceremony room. Agents gather within their pod. | **MINOR UPDATE:** Scoped to pod. |
| **#8** Status dashboard | Single squad dashboard | Building-level dashboard showing all squads. Per-pod dashboard for one squad. | **UPDATE:** Two levels of dashboard. |
| **#9** CLI rename | Same | Add `squadoffice building` command to manage building config. | **MINOR UPDATE** |
| **#10** Spawn modal | Same | Spawn modal should be pod-aware (show current pod's roster). | **MINOR UPDATE** |

### New Issues Needed

| # | Title | Phase | Description |
|---|---|---|---|
| **#11** | BuildingScene: top-level building view | Phase 0 | Create Phaser scene showing pods. Grid layout, pod containers with name/count/activity. Player walks hallway. Door zones trigger transition. |
| **#12** | PodScene: refactor OfficeScene for multi-pod | Phase 0 | Refactor `OfficeScene` → `PodScene`. Accept `squadId` parameter. Load only that squad's agents. Add exit door. Scene transitions. |
| **#13** | Building config and multi-squad server | Phase 0 | `squadoffice.config.json` support. `BuildingManager` loads config, creates `SquadManager` per squad. REST endpoints for building/squad data. |
| **#14** | Scene transitions and navigation | Phase 1 | Smooth transitions between BuildingScene ↔ PodScene. Door interaction, loading states, camera management. |
| **#15** | "Talk to Room" coordinator chat | Phase 1 | Room-level chat that routes through Squad coordinator. UI for room chat vs agent chat. `POST /squads/:id/chat` endpoint. |
| **#16** | Building-level activity dashboard | Phase 2 | Cross-squad view: which squads active, recent activity, agent counts. Overlay or side panel in BuildingScene. |
| **#17** | Pod preview rendering in BuildingScene | Phase 2 | Mini-preview of agents inside pod containers (tiny sprites, activity animations). Visual richness for building view. |

---

## Revised Phasing

### Phase 0: Multi-Pod Foundation (NEW — prerequisite for everything)
- **#11** BuildingScene
- **#12** PodScene refactor
- **#13** Building config + multi-squad server
- **#14** Scene transitions

This phase establishes the spatial hierarchy. Without it, nothing else makes sense in the new model.

### Phase 1: Core Interaction (was Phase 1 + 2)
- **#1** Parse team.md → NPCs (updated for multi-squad)
- **#4** Spawn squad agents (updated for squad scoping)
- **#2** Walk-up chat (updated for pod context)
- **#15** "Talk to Room" coordinator chat (NEW)

### Phase 2: Communication & Visibility
- **#5** Terminal view (unchanged)
- **#3** Decisions display (updated for per-pod)
- **#16** Building-level activity dashboard (NEW)
- **#17** Pod preview rendering (NEW)

### Phase 3: Visual Polish
- **#6** Role badges and status
- **#7** Ceremony visualization (scoped to pod)
- **#8** Status dashboard (two levels: building + pod)

### Phase 4: Tooling
- **#9** CLI rename + `building` command
- **#10** Spawn modal (pod-aware)

---

## Key Technical Decisions

1. **Config file over auto-scan** for squad discovery. Explicit is better than implicit when paths span repos.

2. **PodScene reuses existing tilemap.** We don't need unique art per pod in MVP. All pods use the same office interior. Squad identity comes from the agents inside, not the room decor. (Future: themed pods.)

3. **BuildingScene is programmatic, not tilemap.** Pod count varies. Use Phaser containers/graphics to render pod rectangles. Hallway/floor can be a simple tiled background.

4. **No separate AgentScene.** Agent interaction stays as UI overlay on PodScene. Adding a third scene level would over-complicate navigation for minimal benefit.

5. **REST API becomes hierarchical.** `/building` → `/squads/:id` → `/squads/:id/agents/:aid`. WebSocket events include `squadId` for routing.

6. **"Talk to Room" is a first-class interaction.** This maps directly to Squad's coordinator pattern and is the primary way users interact with a squad team.

---

## Migration Path from Current Codebase

The current fork (cirvine-MSFT/AIOfficeSquad) is essentially unchanged from upstream (ChristianFJung/AIOffice). The refactoring path:

1. **Reorganize `apps/web/src/`** — Move `game.ts` → `scenes/PodScene.ts`. Create `scenes/BuildingScene.ts`. Update Phaser config to register both scenes.

2. **Create `apps/server/src/building-manager.ts`** — Manages building config and squad state. Refactor existing agent management to be squad-scoped.

3. **Update `shared/src/schema.ts`** — Add `squadId` to event types. Add building-level event types.

4. **Tilemap/assets** — Building hallway needs a simple tilemap or background. Pod interiors reuse existing office tilemap initially.

This is an additive change — existing code becomes PodScene with minimal modification. BuildingScene and multi-squad server are new code.
