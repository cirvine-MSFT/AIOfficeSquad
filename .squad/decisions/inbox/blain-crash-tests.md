# Decision: Crash resistance test patterns

**Author:** Blain (Tester)
**Date:** 2025-07-25
**Status:** Informational

## Context

Poncho is hardening the renderer with ErrorBoundary wrapping and defensive guards. These crash resistance unit tests verify the safety contract the UI layer relies on.

## Test file

`apps/desktop/src/__tests__/renderer/crash-resistance.test.ts` — 18 tests

## Key patterns established

1. **SDK import failure simulation:** Use `sdkControl = { shouldFail: false }` object flag in vi.mock constructors. Object references survive vi.mock hoisting; raw primitives may not.

2. **Cleanup ordering verification:** Instrument mock implementations to capture `runtime.isReady` during cleanup calls. This proves `_isReady` is set to `false` BEFORE teardown work begins — critical for preventing race conditions where new requests arrive during cleanup.

3. **send() window safety:** Test all three states — null window, destroyed window, valid window — to verify the IPC push channel never crashes the main process.

## Impact

All 142 desktop unit tests pass. No changes to production code — test-only addition.
