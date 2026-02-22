# Decision: Playwright + Electron E2E Test Infrastructure

**Date:** 2026-02-22  
**By:** Blain (Tester)  
**Status:** Implemented

## What

Set up Playwright E2E testing infrastructure for the Electron desktop app with 13 tests covering core user flows and regression scenarios.

## Why

The desktop app had a critical crash bug (session creation) that wasn't caught until runtime. E2E tests that launch the actual Electron app and simulate user interaction will:

1. Catch crashes like "New Session" before they reach users
2. Verify navigation flows (building → floor → office) work end-to-end
3. Test keyboard shortcuts and interaction patterns
4. Complement existing Vitest unit tests (41 passing) with integration-level coverage
5. Provide smoke tests for CI/CD to prevent regressions

## How

### Infrastructure Created

1. **`apps/desktop/playwright.config.ts`** — Separate Playwright config for Electron tests (distinct from root config for web tests)
2. **`apps/desktop/e2e/fixtures.ts`** — Custom test fixture that:
   - Launches Electron via `_electron.launch()` with built main entry point
   - Provides `electronApp` and `page` fixtures to tests
   - Handles cleanup (close all windows on teardown)
   - Uses `import.meta.url` pattern for ES module `__dirname` compatibility
3. **`apps/desktop/e2e/app.spec.ts`** — 13 E2E tests:
   - App launches without crashing
   - Window title/content loads
   - Header with breadcrumbs renders
   - Sidebar renders with squad info
   - Building view loads initially
   - Can navigate to floor view
   - "New Session" button visible on floor view
   - **Clicking "New Session" doesn't crash** (regression test for Mac's SDK fix)
   - Error boundary exists
   - Escape key navigation works
   - Agent card selection works
   - Status bar renders
   - Window has reasonable size (>800x600)
4. **`apps/desktop/package.json`** — Added `test:e2e` script: `npx electron-vite build && npx playwright test --config=playwright.config.ts`

### Key Technical Decisions

1. **Separate config from root tests:** Root `playwright.config.ts` is for web app (localhost:3000/3003); desktop tests need Electron-specific setup
2. **Build before test:** E2E script always builds first to ensure latest code is tested
3. **Sequential execution:** `workers: 1` to avoid interference (Electron apps share system resources)
4. **Graceful selectors:** Use fallback patterns (data-testid → class → text filter) since UI may not have test IDs yet
5. **Generous timeouts:** Electron startup + React rendering can take 2-4 seconds; use `.waitForTimeout()` after navigation
6. **No SDK mocking:** E2E tests use real SDK (if available) — unit tests already cover mock scenarios

### Test Results

All 13 tests passing:
- ✅ Core flows: launch, navigation, selection, keyboard shortcuts
- ✅ Regression coverage: "New Session" doesn't crash (verifies Mac's SDK integration fix)
- ✅ Ready for CI: Can run in headless mode (Playwright default)

## Impact

- **Catch crashes early:** E2E tests would have caught the session creation crash before Casey hit it
- **Confidence in changes:** Developers can verify UI changes don't break core flows
- **CI/CD ready:** Tests can run in GitHub Actions with `xvfb` (Linux) or headless mode
- **Complements unit tests:** 41 Vitest tests cover SDK integration logic, 13 E2E tests cover user-facing behavior

## Future Work

- Add E2E tests for chat message sending (requires SDK auth in CI)
- Add E2E tests for multi-agent scenarios (switching between agents)
- Add visual regression tests (Playwright screenshot comparison)
- Add E2E tests for error scenarios (network failures, SDK unavailable)
- Consider adding `data-testid` attributes to UI components for more stable selectors

## Dependencies

- @playwright/test (already installed at root level via workspace)
- playwright package (provides `_electron` API)
- Electron built artifacts at `apps/desktop/out/main/index.js`

## Notes

- E2E tests launch the REAL Electron app (not jsdom, not browser simulation)
- Tests read from actual `.squad/team.md` file (no mocking at this level)
- Some tests may need skip conditions in CI if SDK auth isn't available
- Tests run in ~60 seconds total (acceptable for pre-commit or CI)
