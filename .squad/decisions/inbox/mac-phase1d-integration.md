# Phase 1d Integration Decisions

**Author:** Mac (Backend Dev)
**Date:** 2026-02-22
**Status:** Implemented

## Decision 1: Dual Agent Selection State

**Context:** The `useNavigation` hook's `selectAgent()` only works at office level (by design — it's an office-scoped interaction). But the existing Sidebar lets users click agents at floor level to open the ChatPanel.

**Decision:** Use a local `selectedAgent` state for floor-level agent selection, and the navigation hook's `selectedAgentName` for office-level. An `effectiveAgent` variable chooses between them based on `navigation.state.level`.

**Rationale:** This preserves backward compatibility at floor level while following the hook's state machine contract. When `useSquadData` is built and sessions are the primary interaction model, floor-level agent selection can be removed.

## Decision 2: ChatPanel Stays in App.tsx

**Context:** Dutch's spec says OfficeView layout is "workspace (left) + chat panel (right)". Poncho's OfficeView component explicitly delegates chat integration to App.tsx (noted in code comment).

**Decision:** ChatPanel renders at App.tsx level for all navigation levels when an agent is selected. OfficeView only renders the workspace half (desks, water cooler, terminal).

**Rationale:** This gives us a working chat flow at all levels during Phase 1 while Poncho's office components handle the workspace visual. When the full office layout is ready, ChatPanel can be embedded inside OfficeView and removed from the App.tsx-level render.

## Decision 3: SessionDetail Constructed Inline

**Context:** OfficeView needs a `SessionDetail` object, but `useSquadData` doesn't exist yet. No real session data is available from the SDK.

**Decision:** Construct `SessionDetail` from available data (navigation state + roster + agent statuses) inline in App.tsx. Session ID comes from navigation state, agents are mapped from the roster.

**Rationale:** This is temporary scaffolding. Once `useSquadData` hook is built (Mac's next task), it will provide real `SessionDetail` objects via the `squad:get-session-detail` IPC channel. The prop wiring in App.tsx won't change — only the data source.
