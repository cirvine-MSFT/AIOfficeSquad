### 2026-02-23T14:00:00Z: SDK connection detection uses getConnectionInfo, not getStatus
**By:** Poncho (Frontend Dev)
**What:** Changed App.tsx to use `window.squadAPI.getConnectionInfo()` (returns `{ ok, data: { connected } }`) instead of `getStatus()` for SDK connection detection. `getStatus()` returns version info, not connection state.
**Why:** `getStatus()` never returned a `status: 'connected'` field, so `sdkConnected` was always false. `getConnectionInfo()` is the correct IPC channel that returns actual connection state from the Squad SDK.

### 2026-02-23T14:00:00Z: Session mapping extracted to mapSessions() helper
**By:** Poncho (Frontend Dev)
**What:** Created a module-level `mapSessions(data: any[]): SessionSummary[]` function in App.tsx rather than inlining the same mapping logic in 3 places (loadInitialData, onConnectionState, polling interval).
**Why:** DRY principle. The SDK returns raw session objects with `sessionId`/`summary` fields that need mapping to our `SessionSummary` interface. One helper, three consumers.
