# Decision: React Renderer Architecture for Desktop App

**Author:** Poncho (Frontend Dev)
**Date:** 2026-02-22
**Status:** Implemented

## Context
The Electron desktop app needed a complete React renderer UI. Mac built the main process with Squad SDK integration and IPC handlers. Hawkins built the design system (Tailwind config, CSS tokens). My job: build all React components for the renderer.

## Decision

### Type boundary: local types.ts instead of cross-project imports
The renderer's tsconfig has `rootDir: ./src/renderer` which prevents importing from `../main/types.ts`. Rather than loosening the tsconfig (which would break build isolation), I created `src/renderer/types.ts` mirroring the subset of main types the renderer needs (ConnectionState, StreamDelta, UsageEvent, AgentStatus, SquadMember, SquadConfig).

### State management: useState + useRef, no external library
For v0.1, all state lives in App.tsx with React hooks. Sessions, messages, and streaming text use `Map<string, T>` for per-agent isolation. A `sessionsRef` keeps callbacks stable when closing over session state. This is sufficient for the current feature set and avoids adding Redux/Zustand as a dependency.

### Streaming text commit pattern
Stream deltas accumulate in a `streamingText` Map keyed by sessionId. When a `UsageEvent` arrives (signals turn completion), the accumulated text is committed as a ChatMessage and the streaming buffer is cleared. This gives smooth typing animation during streaming and clean message history after.

### Auto-select single squad
If loadConfig returns exactly one squad, it's auto-selected so users skip the BuildingView and land directly in PodView with the agent grid.

## Alternatives Considered
- Zustand for state management — deferred to avoid dep bloat in v0.1
- Importing main/types.ts by relaxing tsconfig — rejected, keeps build boundaries clean
- Separate route-based views with react-router — overkill for 2 views, conditional rendering suffices
