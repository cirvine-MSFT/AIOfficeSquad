# Decision: Phase 2 Views — Panel Toggle Pattern

**By:** Poncho (Frontend Dev)
**When:** 2025-07-24

## What
Added DecisionsTimeline and CostDashboard as toggleable side panels (320px) in the main layout, activated via a small toolbar row below the Header.

## Why
- Chose side-panel pattern over modal/overlay so users can see decisions or cost alongside the main workspace without losing context.
- Toolbar row is minimal (28px) and doesn't restructure the existing nav — just two small toggle buttons.
- `activePanel` is a single enum state ('none' | 'decisions' | 'cost') so only one panel shows at a time, preventing layout overflow.

## Implications
- Mac: The `getDecisions` IPC channel (`squad:get-decisions`) is typed in preload. Expected response: `{ ok: boolean, data?: string }` where data is the markdown string. The renderer gracefully catches if the channel isn't registered yet.
- Future: CostDashboard currently reads from useChat usage stats passed as props. When SDK connects, it can be upgraded to pull from a dedicated IPC or hook.
- The toolbar row could host more tool buttons (e.g., logs viewer, settings) without additional layout changes.
