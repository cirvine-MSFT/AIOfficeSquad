# Electron E2E Tests

Playwright-based end-to-end tests for the Squad Office desktop app.

## Running Tests

```bash
# From apps/desktop directory:
npm run test:e2e

# Or manually:
npm run build                                    # Build Electron app first
npx playwright test --config=playwright.config.ts
```

## Test Structure

- **`fixtures.ts`** — Custom Playwright fixture that launches Electron and provides `electronApp` and `page` objects
- **`app.spec.ts`** — 13 E2E tests covering core user flows and regression scenarios

## Test Coverage

✅ App launches without crashing  
✅ Window title and content loads  
✅ Header with breadcrumbs renders  
✅ Sidebar renders with squad info  
✅ Building view loads initially  
✅ Can navigate to floor view  
✅ "New Session" button is visible  
✅ **Clicking "New Session" doesn't crash** (regression test)  
✅ Error boundary catches render errors  
✅ Escape key navigation works  
✅ Agent card selection works  
✅ Status bar renders  
✅ App window has reasonable size  

## Technical Notes

- Tests use Playwright's `_electron` API to launch the actual Electron app
- The fixture launches from `out/main/index.js` (must be built first)
- Tests run sequentially (`workers: 1`) to avoid Electron resource conflicts
- Graceful selectors with fallbacks (no hard dependency on `data-testid` attributes)
- Tests read from real `.squad/team.md` file (no mocking at E2E level)

## Adding New Tests

```typescript
import { test, expect } from './fixtures'

test('my new test', async ({ electronApp, page }) => {
  // electronApp is the Electron app instance
  // page is the first window (Playwright Page object)
  
  await expect(page.locator('text=My Feature')).toBeVisible()
})
```

## CI/CD

Tests run in about 60 seconds. For GitHub Actions:

```yaml
- run: cd apps/desktop && npm run test:e2e
  env:
    CI: true
```

Playwright will automatically run in headless mode when `CI=true`.
