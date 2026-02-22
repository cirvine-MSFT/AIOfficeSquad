# Session: Building/Floor/Office Concept

**Date:** 2026-02-22T18:17Z  
**Topic:** UI Architecture for Squad Office Electron app  
**Participants:** Hawkins, Billy, Mac, Poncho  

## Summary

Four-agent batch completed scoping and initial implementation of the Building/Floor/Office UI architecture for the Electron desktop app.

**Hawkins** created an interactive HTML mockup demonstrating the visual hierarchy (Building with multiple Floors, Floors with multiple Offices/sessions). Design system foundation also established with dark palette, typography scale, and role-based color scheme.

**Billy** audited the Squad SDK (@bradygaster/squad-sdk@0.8.2) and mapped Building/Floor/Office concepts to SDK capabilities. Found: Floor and Office nearly 100% covered by SDK; Building requires custom SquadRegistry for multi-squad discovery and aggregation.

**Mac** completed Electron main process scaffold with Squad SDK integration via IPC, typing layer, and preload context bridge. Ready for renderer components.

**Poncho** built React renderer with state management (useState + useRef, no redux), IPC bridge, streaming text pattern, auto-select single squad for MVP.

## Decisions Made

1. **Multi-squad support via SquadRegistry** — SDK is single-squad-scoped; Building layer is entirely custom
2. **IPC-based SDK access** — Renderer never imports SDK directly; all communication via typed channels
3. **Dark dev-tool aesthetic** — Navy base (#0f1117), 13px body text, 8 role colors
4. **React hooks for state** — Deferred Zustand/Redux; sufficient for v0.1
5. **Inline types in renderer** — Avoid cross-project imports; maintain build isolation

## Outcomes

- Mockup demonstrates visual concept (Building → Floor → Office hierarchy)
- SDK mapping identifies 90%+ coverage for Floor/Office, custom layer for Building
- Electron scaffold ready for component implementation
- Design system documented and tooled (Tailwind, CSS tokens, TS constants)
- React renderer foundation supports streaming, sessions, multi-squad state

## Next Steps

Implement SquadRegistry and cross-squad event bridge to complete Building layer architecture.
