# Session: 2026-02-22T2217Z — Session Crash Fix

## Summary
Mac investigated and fixed the "New Session" crash in Electron app. Root cause: `SquadClientWithPool` created before `connect()` but not cleaned up on failed init, leaving internal async handlers that fired after error and crashed the main process.

## Changes
- **apps/desktop/src/main/squad-runtime.ts**: Clean up SDK client in catch block; `createSession()` awaits `_initPromise`
- **apps/desktop/src/preload/index.ts**: Wrap all `ipcRenderer.invoke()` with `.catch()` for graceful error handling
- **apps/desktop/src/renderer/hooks/useChat.ts**: Validate agentName before IPC call

## Outcome
✅ Fixed — 13 E2E tests pass, build clean (57 modules, no errors).

## Key Decision
Always clean up SDK resources in catch blocks — partially-constructed objects with internal event loops are a crash vector in Electron's main process.

---
**Sprint:** Phase 1 (Electron Desktop App)  
**Status:** Complete
