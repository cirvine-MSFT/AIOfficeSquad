# Decisions Log

## 2026-02-22T18:40Z: User directive — Water cooler and session-scoped visualization
**By:** Casey Irvine (via Copilot)
**What:**
- Water cooler belongs INSIDE session views, not at the floor level
- Represents idle members within a specific session, not overall squad idle state
- Both floor view (sessions list) and session drill-in must maintain fun office/building aesthetic
- Avoid "cardy" feel — functional but fun, office-themed throughout
**Why:** User feedback on mockup — water cooler is session-scoped, not squad-scoped

## 2026-02-22T18:28Z: User directive — UI terminology and visual feel
**By:** Casey Irvine (via Copilot)
**What:** 
- Use "squad members" or "members" terminology, NOT "agents" in the UI
- Building hub should feel more "building-y" with lit office windows
- Floor view should feel like looking into open-space pods/offices on a floor — not cards, more like windows you peer into
- Idle members should be visualized at a "water cooler" (standing, chatting, idle)
- Working members should be "sitting at their desk working"
- The vibe should be fun and office-building themed, not sterile dashboard cards
**Why:** User request — core visual identity for Squad Office

## 2026-02-22T18:46Z: Decision — Water cooler placement & office view redesign
**By:** Hawkins (UI/Design)
**What:**
1. Water cooler belongs INSIDE sessions only (not at floor level)
   - Represents idle members within a specific session
   - Floor view shows summary stats (e.g., "1 working, 1 at cooler")
   - Water cooler visualization only appears in session view
2. Floor view maintains office hallway feel
   - Sessions rendered as office rooms with glass-wall effect
   - Mini desks and activity previews visible through "windows"
   - Gradients, shadows, borders simulate peeking through office windows
3. Session view redesigned as office interior
   - Left: work area with workstations (desk + monitor + chair + nameplate)
   - Right: break lounge with water cooler and idle members
   - Chat panel styled as whiteboard/control center with terminal output
   - No flat cards or dashboard elements — maintains physical office metaphor
**Why:** Casey's review feedback led to clarifying that water cooler is session-scoped, not squad-scoped. Maintaining consistent office aesthetic across all 3 navigation levels improves intuitiveness and visual hierarchy.
**Status:** Implemented in mockup
**Impact:** Better understanding of session membership; consistent design language; clearer working vs. idle states per session

## 2026-02-22T19:01Z: Decision — Mac Phase 1a: Type definitions, IPC handler, vitest setup
**By:** Mac (Backend Dev)
**What:**
1. Type Definitions (Dutch arch doc §H)
   - Added 6 new interfaces: `HubStats`, `SquadInfo`, `SquadStatus`, `SessionMetadata`, `SessionDetail`, `AgentInSession`
   - Mirrored in both main and renderer type files
   - Updated IPC channels: `squad:get-session-detail` (invoke), `hub:stats-updated` and `hub:squad-status` (push)
2. IPC Handler: `squad:get-session-detail`
   - Composes `SessionDetail` from `listSessions()`, `loadSquadConfig()`, `getAgentStatuses()`
   - Maps SDK status `busy` → UI schema `active` for consistency
   - Handles session ID lookup edge case (both `session.id` and `session.sessionId`)
   - Exposed on `window.squadAPI`
3. Vitest Setup
   - Added vitest and config at repo root
   - Directory: `src/__tests__/{main, renderer/{hooks, components}}`
   - Scripts: `test` (run), `test:watch` (watch mode)
   - Smoke test `types.test.ts` — 7 tests, all passing
**Why:** Establish backend foundation for Phase 1a: types for session detail querying, IPC contract between main and renderer, test infrastructure ready.
**Status:** Complete
**Handoff Notes:** Poncho expects `active` status (not `busy`) from `getSessionDetail()`. Session names always present (fallback: `Session {first8chars}`).

## 2026-02-22T19:01Z: Decision — Poncho Phase 1a: Hooks & shared components
**By:** Poncho (Frontend Dev)
**What:**
1. useNavigation Hook
   - Accepts `SquadLookup[]` and `SessionLookup[]` params for breadcrumb labels
   - Returns breadcrumb data and navigation state
   - File: `apps/desktop/src/renderer/hooks/useNavigation.ts`
2. useChat Hook
   - Bundles usage stats (totalTokens, estimatedCost, model) with chat state
   - Single subscription to `onStreamUsage` avoids dual subscriptions
   - File: `apps/desktop/src/renderer/hooks/useChat.ts`
3. Shared Components
   - **RoleAvatar.tsx:** Component + 5 named helper exports (`getInitials`, `getRoleKey`, `getAvatarBg`, `getRoleLabel`, `getRoleTextColor`)
   - **StatusDot.tsx:** Component + canonical exports `STATUS_LABELS`, `STATUS_BADGE_CLASSES`
   - **Breadcrumb.tsx:** Navigation breadcrumb renderer
   - Organized under `apps/desktop/src/renderer/{hooks,components/shared}/` with index re-exports
**Why:** Establish frontend foundation for Phase 1a: reusable hooks for navigation and chat, shared components for status/role UI, helper functions for style calculations in Phase 1d.
**Status:** Complete (7 new files)
**Handoff Notes:** RoleAvatar helpers enable Phase 1d inline style usage without importing component. StatusDot constants replace inline status maps. useNavigation keeps data-fetching in parent (App.tsx) — will integrate with Mac's `useSquadData` hook in Phase 1b.
