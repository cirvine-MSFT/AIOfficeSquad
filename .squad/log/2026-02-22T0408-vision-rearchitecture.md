# Session Log: Vision Rearchitecture

**Date:** 2026-02-22T04:08:00Z  
**Facilitator:** Casey Irvine  
**Attendees:** Dutch (Lead), Scribe (logging)  

## Context

Casey shared a fundamental vision shift: reframe the single flat office model as a **building → pod → agent hierarchy**, mapping directly to Squad's organizational structure (collection → team → member).

## Decisions Made

1. **Spatial Metaphor:** Building (collection of squads) → Pods (rooms, one per squad) → Agents (desks, one per member)
2. **Scene Architecture:** Three-layer Phaser model (BuildingScene hallway, PodScene squad interior, Agent UI overlay)
3. **Squad Discovery:** Config file model (`squadoffice.config.json`) vs auto-scan — explicit paths for non-co-located repos
4. **API Hierarchy:** REST routes scoped to `/building` → `/squads/:id` → `/squads/:id/agents/:aid`
5. **Room-Level Chat:** "Talk to Room" as first-class interaction (routes through Squad coordinator)

## Scope Impact

- **10 Existing Issues:** Updated with building model annotations
- **7 New Issues:** Phase 0 foundation work (#11–#17)
- **Phase 0 Introduced:** BuildingScene, PodScene refactor, multi-squad server, scene transitions
- **Total Board:** 17 issues across phases 0–4

## Next Steps

- Phase 0 kickoff: BuildingScene architecture + PodScene refactor
- Issue #11–#14 are blockers for all downstream work
- Phase 1 (core interaction) depends on Phase 0 completion
