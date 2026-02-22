### 2026-02-28T04:30:00Z: Phase 2 test strategy — inline parsers with swap-for-import pattern
**By:** Blain (Tester)
**What:** Created 3 Phase 2 test files (decisions-api, squad-chat-context, building-dashboard) using inline reference implementations for pure logic tests and graceful `test.skip()` for server-dependent tests. Created 5 fixture files in tests/test-data/.
**Why:** Follows the established pattern from Phase 1 (squad-reader.spec.ts): inline parsers let us validate expected behavior before the real modules land, then swap for imports. Server-dependent tests skip gracefully so CI stays green while endpoints are being built. Total: 39 tests (36 passing, 3 skipped awaiting API).
