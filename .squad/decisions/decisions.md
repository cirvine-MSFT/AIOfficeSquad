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

## 2026-02-22T22:17Z: Decision — Phase 2 Views: Panel Toggle Pattern
**By:** Poncho (Frontend Dev)
**What:**
- Added DecisionsTimeline and CostDashboard as toggleable side panels (320px) in the main layout
- Activated via a small toolbar row below the Header (28px)
- `activePanel` is a single enum state ('none' | 'decisions' | 'cost') — only one panel shows at a time
**Why:** Side-panel pattern allows users to see decisions or cost alongside the main workspace without losing context. Minimal toolbar doesn't restructure existing nav.
**Implications:**
- Mac: The `getDecisions` IPC channel (`squad:get-decisions`) is typed in preload. Expected response: `{ ok: boolean, data?: string }` where data is the markdown string.
- CostDashboard currently reads from useChat usage stats; can upgrade to pull from dedicated IPC or hook when SDK connects
- Toolbar row could host more tool buttons (logs viewer, settings) without layout changes

## 2026-02-22T22:17Z: Decision — Session Crash Fix: SDK Cleanup on Failed Init
**By:** Mac (Backend Dev)
**What:**
1. **Clean up SDK client after failed init.** The catch block in `initialize()` now calls `client.shutdown()` and nullifies `this.client`, `eventBus`, `pipeline`, `monitor`
2. **`createSession()` awaits `_initPromise`** before checking guards, eliminating race condition
3. **Preload bridge wraps all `ipcRenderer.invoke` calls** with `.catch()` so IPC-level failures return `{ok: false, error}` instead of unhandled rejections in renderer
4. **`useChat.ts` validates agentName** before calling IPC; `App.tsx` always calls `createSession` (even with no agent) so errors surface in the UI banner
**Root Cause:** `SquadClientWithPool` instantiated before `connect()` was called in `initialize()`. When `connect()` failed, the client object wasn't cleaned up. Its internal async handlers could fire after the catch block and crash the Electron main process.
**Impact:**
- 4 files changed: `squad-runtime.ts`, `preload/index.ts`, `useChat.ts`, `App.tsx`
- All 13 E2E tests pass
- Build clean (57 modules, no errors)
**Pattern for Future:** Always clean up SDK resources in catch blocks — partially-constructed objects with internal event loops are a crash vector in Electron's main process.

## 2026-02-22T22:17Z: Decision — Remove Lazy-Init from createSession
**By:** Mac (Backend Dev)
**What:** 
- `createSession()` no longer calls `initialize()` on-demand. Throws immediately if SDK isn't connected
- `initialize()` is now idempotent — `_initAttempted` + `_initPromise` prevent concurrent or repeated init
- All SDK-dependent methods check `_isReady` before using `this.client`
- New IPC channels: `squad:get-decisions` (reads decisions.md from disk) and `squad:get-connection-info` (returns SDK connection state)
**Why:** Old lazy-init in `createSession()` would silently spawn a new Copilot CLI subprocess on every call if SDK wasn't connected — causing process leaks. Fix makes failure explicit and fast. New IPC channels let renderer show decisions and connection status without needing SDK to be live.

## 2026-02-22T22:17Z: Decision — Phase 1d Integration
**By:** Mac (Backend Dev)
**What:**
1. **Dual Agent Selection State:** Use local `selectedAgent` state for floor-level selection, and `useNavigation` hook's `selectedAgentName` for office-level. `effectiveAgent` variable chooses between them based on `navigation.state.level`
2. **ChatPanel stays in App.tsx:** Renders at App.tsx level for all navigation levels when agent is selected. OfficeView only renders the workspace half
3. **SessionDetail constructed inline:** Construct from available data (navigation state + roster + agent statuses) in App.tsx. Temporary scaffolding until `useSquadData` hook is built
**Why:** Preserves backward compatibility while following hook's state machine contract. ChatPanel at App.tsx level gives working chat flow at all levels during Phase 1. SessionDetail inline is temporary until `useSquadData` provides real objects via IPC.

## 2026-02-22T21:55Z: User Directive — Project Standalone Repo
**By:** Casey Irvine (via Copilot)
**What:** The project has diverged enough from the original AIOffice fork to warrant its own standalone repo. Proposed name: "Squad Campus". Will be a standalone product and test case for Brady Gaster's Squad SDK.
**Why:** User request — captured for team memory
**Status:** Cutover timing TBD — waiting for right milestone

## 2026-02-22T22:17Z: Decision — Playwright + Electron E2E Test Infrastructure
**By:** Blain (Tester)
**What:**
- Set up Playwright E2E testing infrastructure for Electron desktop app with 13 tests
- Infrastructure: `apps/desktop/playwright.config.ts`, `apps/desktop/e2e/fixtures.ts`, `apps/desktop/e2e/app.spec.ts`
- Tests cover: app launch, window content, header/breadcrumbs, sidebar, building view, floor navigation, "New Session" (regression), error boundary, keyboard navigation, agent selection, status bar
**Why:** Desktop app had critical crash bug (session creation) not caught until runtime. E2E tests launching real Electron app catch crashes early and verify core user flows work end-to-end.
**Key Decisions:**
- Separate config from root tests (root is for web app; desktop needs Electron setup)
- Build before test: `test:e2e` script builds first to ensure latest code is tested
- Sequential execution: `workers: 1` to avoid interference
- Generous timeouts: Electron startup + React rendering can take 2-4 seconds
- No SDK mocking: E2E tests use real SDK; unit tests cover mocks
**Impact:**
- All 13 tests passing; would have caught session creation crash before Casey hit it
- Developers can verify UI changes don't break core flows
- Ready for CI/CD
- Complements 41 Vitest unit tests
**Future Work:** E2E tests for chat sending, multi-agent scenarios, visual regression, error scenarios; add `data-testid` for stable selectors
