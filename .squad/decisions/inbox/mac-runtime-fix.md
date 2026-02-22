### 2025-07-18: Remove lazy-init from createSession, add init guard

**By:** Mac (Backend Dev)
**What:** `createSession()` no longer calls `initialize()` on-demand. Instead it throws immediately if SDK isn't connected. `initialize()` is now idempotent — `_initAttempted` + `_initPromise` prevent concurrent or repeated init. All SDK-dependent methods check `_isReady` before using `this.client`. New IPC channels: `squad:get-decisions` (reads decisions.md from disk) and `squad:get-connection-info` (returns SDK connection state).
**Why:** The old lazy-init in `createSession()` would silently spawn a new Copilot CLI subprocess on every call if the SDK wasn't connected — causing process leaks. The fix makes failure explicit and fast. The new IPC channels let the renderer show decisions and connection status without needing the SDK to be live.
