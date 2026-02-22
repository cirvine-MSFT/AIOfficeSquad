### 2026-02-22T16:30:00Z: Phase 5 Planning — Productivity UX Overhaul
**By:** Dutch (Lead)
**Issues:** #18–#25
**Status:** Proposed

## Direction

Casey's feedback is clear: the app has too much video game friction and not enough productivity value. Phase 5 strips out mandatory walking, adds instant navigation, and makes the core features (chat, terminal) actually work end-to-end.

This is a **product-direction shift**, not just polish. We're moving from "walk-around novelty" to "command-center productivity tool." The pixel-art office remains as a visual context layer, but interaction is driven by clicks, hotkeys, and a persistent roster — not WASD movement.

## Sub-phases

### Phase 5a: Navigation & Core UX (Issues #18–#22)

The fundamental UX overhaul. After 5a, every interaction is instant.

| Issue | Title | Key Change |
|-------|-------|------------|
| #18 | Instant pod navigation (BuildingScene) | Click/number-key to enter pods — no walking |
| #19 | Instant agent selection (PodScene) | Click/number-key to select agents — no walk-up |
| #20 | Unified chat panel with room/member switching | Tab between room chat and individual agents in one panel |
| #21 | Fix label/badge overlap in PodScene | Bug fix: text elements overlap above NPC sprites |
| #22 | Navigation roster sidebar + shortcut overhaul | Always-visible roster, ? key help overlay |

**Dependency chain:** #21 is independent (bug fix). #18 and #19 are independent of each other. #20 depends on #19 (selection model). #22 depends on #18 + #19 (needs both navigation systems in place).

**Recommended order:** #21 first (quick win, visible fix), then #18 and #19 in parallel, then #20, then #22.

### Phase 5b: Working Features (Issues #23–#25)

End-to-end functionality. After 5b, the tool actually does useful work.

| Issue | Title | Key Change |
|-------|-------|------------|
| #23 | Agent process spawning with PTY | Real CLI processes spawn with charter/history context |
| #24 | End-to-end terminal view | xterm.js shows live agent PTY output |
| #25 | End-to-end chat round-trip | Send message → agent responds → displayed in chat |

**Dependency chain:** #23 is foundational (spawning). #24 (terminal) and #25 (chat) both depend on #23 but are independent of each other. #25 also benefits from #20 (unified chat panel).

**Recommended order:** #23 first, then #24 and #25 in parallel.

## Architecture Approach

### Navigation Model

The core architectural change is **decoupling interaction from spatial proximity**:

1. **BuildingScene:** Pod rectangles become clickable game objects. `setInteractive()` + `on('pointerdown')` triggers scene transition. Number keys register via Phaser `input.keyboard`. Player sprite becomes optional decoration.

2. **PodScene:** NPC sprites become clickable. `sprite.setInteractive()` + click handler calls the same `openPanel()` flow that proximity+E currently triggers. Proximity detection loop in `update()` becomes optional (can keep for visual selection ring if player walks nearby, but not required).

3. **Roster sidebar:** Pure HTML/CSS panel (like the existing chat panel). Reads squad data from the same `/api/building/squads` endpoint. Click handlers call into PodScene's existing `selectAgent()` / BuildingScene's `enterPod()` methods.

### Chat Architecture

The unified chat panel replaces two separate interaction modes (R-key room chat vs E-key individual chat) with a single panel that has a **chat target selector**:

```
┌─────────────────────────┐
│ [Room ▼] [Agent1] [Agent2] │  ← target tabs/buttons
├─────────────────────────┤
│ Chat messages...         │
│                         │
├─────────────────────────┤
│ [Type a message...]  [Send] │
└─────────────────────────┘
```

Each target maintains its own message array in memory. WebSocket routing already supports both `/squads/:id/chat` (room) and `/squads/:id/agents/:agentId/chat` (individual). The change is purely frontend state management.

### Terminal Integration

No new architecture needed — the PTY → WebSocket → xterm.js pipeline exists. The work is:
1. Ensuring PTY processes actually spawn (Issue #23 connects the dots)
2. Verifying the WebSocket terminal bridge works with squad-context agents
3. Handling edge cases (process not running, connection dropped, resize sync)

### What We Keep

- **Visual office layout:** The pixel-art office remains. Agents at desks, sprites, animations — all preserved.
- **All existing panels:** Decisions (D), Status (S), Ceremonies (C), Building Dashboard (Tab) — unchanged.
- **Server architecture:** Multi-squad config, squad reader, building routes — all Phase 0-4 work is preserved.
- **Test suite:** 56 existing tests continue to pass. New tests added for click/hotkey interactions.

### What We Remove

- **Mandatory walking:** Player must no longer walk to interact. Movement becomes optional.
- **Proximity-gated interaction:** E key no longer requires being near an agent.
- **Separate room chat mode:** R key toggle replaced by unified panel target.

## Risk Assessment

- **Low risk:** #21 (label fix) — isolated CSS/positioning change
- **Low risk:** #18, #19 (navigation) — additive click handlers on existing game objects
- **Medium risk:** #20 (unified chat) — frontend state refactor, but no server changes
- **Medium risk:** #22 (roster sidebar) — new UI component, but reads existing API data
- **Medium risk:** #23 (spawning) — connects existing pieces but PTY lifecycle is complex
- **Medium risk:** #24, #25 (terminal/chat e2e) — depends on #23; mostly verification + edge case fixes

## Definition of Done for Phase 5

Phase 5 is complete when a user can:
1. Open the app, see the building with pods
2. Click a pod (or press 1) to enter it instantly
3. See agents at desks with non-overlapping labels
4. Click an agent (or press 1-5) to open their chat
5. Switch between room chat and individual agent chat in one panel
6. Send a message and receive a response
7. Switch to terminal view and see the agent's live CLI output
8. Use the roster sidebar to jump between pods and agents
9. Press ? to see all keyboard shortcuts

**No walking required at any point.**
