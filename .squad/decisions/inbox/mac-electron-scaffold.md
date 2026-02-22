# Decision: Electron Desktop App Scaffold Architecture

**Author:** Mac (Backend Dev)  
**Date:** 2025-02-23  
**Status:** Implemented

## Context

Casey requested a new Electron desktop shell at `apps/desktop/` that runs the Squad SDK (`@bradygaster/squad-sdk`) in the main process and exposes it to a React renderer via IPC.

## Decisions Made

### 1. Main process owns all SDK state

The renderer never imports `@bradygaster/squad-sdk` directly. All SDK classes (SquadClientWithPool, EventBus, StreamingPipeline, RalphMonitor) live in `SquadRuntime` in the main process. The renderer talks to them exclusively through typed IPC channels. This keeps Electron's security model intact and avoids ESM/CJS issues in the renderer.

### 2. Dynamic imports for ESM-only SDK

The squad-sdk uses ESM subpath exports (`@bradygaster/squad-sdk/client`, etc.). Rather than fighting module resolution at build time, `SquadRuntime.connect()` uses dynamic `import()` so the modules load at runtime in the correct ESM context.

### 3. Typed IPC with IpcResult<T> wrapper

All invoke handlers return `{ ok: true, data }` or `{ ok: false, error }`. This gives the renderer a consistent error-handling pattern without try/catch on every call. The `IpcInvokeChannels` and `IpcPushChannels` interfaces in `types.ts` serve as the single source of truth for all channel names and their argument/return types.

### 4. Push channels use ipcRenderer.on with unsubscribe pattern

The preload's `onEvent()`, `onStreamDelta()`, etc. return an unsubscribe function so React components can clean up in `useEffect` teardowns. This prevents memory leaks from stale listeners.

### 5. electron-vite for build tooling

Chose electron-vite over manual webpack/vite configs. It handles the three-target build (main/preload/renderer) with a single config file, and its `externalizeDepsPlugin()` correctly handles native modules and Node built-ins.

## Files Created

- `apps/desktop/package.json` — workspace package with electron-vite scripts
- `apps/desktop/electron.vite.config.ts` — three-target build config
- `apps/desktop/tsconfig*.json` — project references for main, preload, renderer
- `apps/desktop/src/main/index.ts` — Electron app lifecycle + window creation
- `apps/desktop/src/main/squad-runtime.ts` — Squad SDK wrapper class
- `apps/desktop/src/main/ipc-handlers.ts` — IPC channel registration
- `apps/desktop/src/main/types.ts` — shared type definitions and channel map
- `apps/desktop/src/preload/index.ts` — contextBridge with typed squadAPI
- `apps/desktop/src/renderer/index.html` — HTML shell
- `apps/desktop/src/renderer/main.tsx` — React entry point
- `apps/desktop/src/renderer/App.tsx` — placeholder component
- `apps/desktop/src/renderer/env.d.ts` — window.squadAPI type augmentation

## Dependencies Added

- `@electron-toolkit/utils` — dev environment detection for renderer URL loading
