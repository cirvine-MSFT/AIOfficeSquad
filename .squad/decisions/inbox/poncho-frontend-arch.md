# Decision: Building/Pod Scene Architecture

**By:** Poncho (Frontend Dev)
**Date:** 2026-02-22
**Issues:** #11, #12, #14, #15

## What
Implemented two-tier scene architecture: BuildingScene (hallway of pods) → PodScene (single squad office).

## Key Decisions
1. **Multi-squad activated by URL param** (`?building=1`). Without it, app starts directly in PodScene (single-squad backward compat). Server can switch this later.
2. **PodScene = OfficeScene renamed**. `OfficeScene` exported as deprecated alias so nothing breaks.
3. **Scene data passing**: `squadId` and `squadName` passed via Phaser's `scene.start(key, data)` + `init(data)` pattern.
4. **"Talk to Room" targets** `/squads/{squadId}/chat` — Mac needs to build this endpoint. For now it fires-and-forgets.
5. **BuildingScene is programmatic** (colored rectangles, no tilemap). This is prototype quality — will need art later.

## Why
- Separating building/pod lets us scale to multiple squads without changing the per-squad office logic.
- URL-param activation means zero risk to existing single-squad users.
- Room chat mode is visually distinct (green "Room" badge) so users know they're talking to the coordinator, not a specific agent.
