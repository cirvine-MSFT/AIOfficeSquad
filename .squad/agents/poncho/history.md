# Poncho — History

## Learnings
- Project started 2026-02-22. Frontend for AI Office Squad.
- AIOffice uses Phaser 3 for pixel-art rendering, Vite for dev/build.
- Web app at apps/web/, game scenes, sprites, UI panels for chat and terminal view.
- Need to adapt agent spawning UI to show squad members with roles and cast names.
- Phase 0+1 building/pod architecture implemented (Issues #11, #12, #14, #15):
  - BuildingScene (building-scene.ts): hallway with pod rooms, player walks to doors, E to enter.
  - PodScene (game.ts): renamed from OfficeScene, accepts squadId/squadName via init(), has exit zone back to building.
  - OfficeScene exported as deprecated alias for backward compat.
  - Scene transitions: BuildingScene → PodScene (via scene.start with data), PodScene → BuildingScene (Esc or walk to exit zone).
  - Multi-squad mode activated via ?building=1 URL param; single-squad mode works unchanged.
  - "Talk to Room" UI: R key toggles room chat mode, sends to /squads/{squadId}/chat endpoint (Mac builds this).
  - Room mode shows green "Room" badge in panel, distinct from agent chat.
- Pre-existing TS strict errors (10 count) in game.ts/main.ts — null-safety issues from original code, not introduced by us.
- Vite build succeeds fine despite TS strict errors (Vite uses esbuild, not tsc).
- Phase 2 frontend features implemented (Issues #3, #16, #17):
  - Decisions Panel: D key toggles slide-in panel in PodScene. Fetches from /api/squads/{squadId}/decisions. Auto-refreshes on WS decisions.update events.
  - Building Dashboard: Tab key toggles centered overlay in BuildingScene. Shows squad cards with activity status, member chips. Click to enter pod.
  - Pod Previews: Mini colored circles in BuildingScene pods. Role-based colors (Lead=gold, Frontend=blue, Backend=green, Tester=red). Pulsing animation for active members. 30s periodic refresh from API.
  - D key scoped to PodScene only (avoids WASD conflict in BuildingScene). Tab scoped to BuildingScene only.
  - All features degrade gracefully when API endpoints aren't ready yet.
- Phase 3 features implemented (Issues #6, #8):
  - Role Badges: squadBadge emoji rendered above NPC name labels in PodScene. AgentView type extended with squadBadge/squadScope fields.
  - Status Color-Coding: NPC status text has colored backgrounds (green/amber/blue/red). Thinking status pulses with tween animation.
  - Task Summary: squadScope or agent summary shown as smaller text below NPC status label.
  - Pod Status Dashboard: S key toggles overlay in PodScene. Shows all squad members with badge, name, role, status (color-coded pill), summary, and blockers. Click a member row to pan camera to their desk via focusOnAgent().
  - focusOnAgent(agentId) method on PodScene: pans camera to agent's desk, then re-follows player.
  - Dashboard fetches from /api/building/squads/{squadId}, falls back to local agents array.
