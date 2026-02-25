# Decision: Renderer Crash Hardening — ErrorBoundary Isolation Pattern

**By:** Poncho (Frontend Dev)
**Date:** 2025-07-17
**Status:** Implemented

## What
Every top-level component in App.tsx is now individually wrapped in its own `<ErrorBoundary>`. This includes Header, Toolbar, Sidebar, StatusBar, and each side panel. The main content area's ErrorBoundary uses `resetKey={navigation.state.level}` to auto-clear on navigation. A top-level ErrorBoundary wraps the entire App() return as last resort.

## Why
The app was crashing on launch and when clicking panels. A single unhandled error in any component (e.g., Header) would take down the entire UI with no recovery path. By isolating each subtree, a crash in one area (say, the sidebar) leaves the rest of the app functional.

## Convention Going Forward
- **Every new top-level section added to App.tsx must get its own ErrorBoundary.**
- Event subscriptions must guard for null/undefined APIs (window.squadAPI methods may not exist during preload evolution).
- Use `addEventListener` over `window.onerror` assignment for global error handlers — it's additive, not overwriting.
- `resetKey` should be used on any ErrorBoundary where navigation/state changes should auto-clear errors.

## Files Changed
- `apps/desktop/src/renderer/App.tsx` — ErrorBoundary wraps on all components + defensive guards
- `apps/desktop/src/renderer/main.tsx` — addEventListener-based global error handlers
