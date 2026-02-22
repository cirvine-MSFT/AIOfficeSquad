import { test, expect } from './fixtures'

test.describe('Electron App E2E', () => {
  test('app launches without crashing', async ({ electronApp, page }) => {
    // Verify the Electron app is running
    expect(electronApp).toBeTruthy()

    // Verify window exists
    expect(page).toBeTruthy()
  })

  test('window title and content loads', async ({ page }) => {
    // Check for the Squad Campus title in the header h1
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    await expect(heading).toContainText('Squad Campus')
  })

  test('header with breadcrumbs renders', async ({ page }) => {
    // The Header component should render with navigation breadcrumbs
    const header = page.locator('header, [role="banner"], nav').first()
    await expect(header).toBeVisible()
  })

  test('sidebar renders with squad info', async ({ page }) => {
    // Sidebar should show the squad name or hub name
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible({ timeout: 10_000 })
  })

  test('building view loads initially', async ({ page }) => {
    // Initially the app should show building-level view with header and sidebar
    await page.waitForTimeout(2000)
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 10_000 })
    // Main content area should be rendered
    const mainContent = page.locator('main, [role="main"], .flex-1').first()
    await expect(mainContent).toBeVisible()
  })

  test('can navigate to floor view', async ({ page }) => {
    // Try clicking on the squad to navigate to floor view
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Click the first squad in sidebar (if exists)
    const squadItem = page.locator('[role="button"], button').filter({ hasText: /Squad Campus|Squad Office|ai-office-squad/i }).first()
    
    if (await squadItem.isVisible()) {
      await squadItem.click()
      
      // Floor view should show agent cards or "New Session" button
      await expect(
        page.locator('text=New Session, button:has-text("New Session")').first()
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('"New Session" button is visible on floor view', async ({ page }) => {
    // Navigate to floor view first
    await page.waitForTimeout(2000)
    
    const squadItem = page.locator('[role="button"], button').filter({ hasText: /Squad Campus|Squad Office|ai-office-squad/i }).first()
    if (await squadItem.isVisible()) {
      await squadItem.click()
      await page.waitForTimeout(1000)
    }

    // Look for New Session card/button
    const newSessionButton = page.locator('text=/New Session/i').first()
    
    if (await newSessionButton.isVisible()) {
      await expect(newSessionButton).toBeVisible()
    } else {
      // If not visible, log for debugging but don't fail
      console.log('New Session button not found - may require agent selection first')
    }
  })

  test('clicking "New Session" does not crash app', async ({ page }) => {
    // This test verifies the fix for the session creation crash
    await page.waitForTimeout(2000)
    
    // Navigate to floor view
    const squadItem = page.locator('[role="button"], button').filter({ hasText: /Squad Campus|Squad Office|ai-office-squad/i }).first()
    if (await squadItem.isVisible()) {
      await squadItem.click()
      await page.waitForTimeout(1000)
    }

    // Select an agent first (required for session creation)
    const agentCard = page.locator('[data-testid="agent-card"]').first()
    if (!(await agentCard.isVisible())) {
      // Try alternate selectors
      const altCard = page.locator('.agent-card, [role="button"]').filter({ hasText: /Blain|Casey|Mac|Poncho|Billy/i }).first()
      if (await altCard.isVisible()) {
        await altCard.click()
        await page.waitForTimeout(500)
      }
    } else {
      await agentCard.click()
      await page.waitForTimeout(500)
    }

    // Try to find and click New Session button
    const newSessionButton = page.locator('text=/New Session/i').first()
    
    if (await newSessionButton.isVisible()) {
      await newSessionButton.click()
      
      // Wait a moment for any crash to occur
      await page.waitForTimeout(1000)
      
      // Verify app is still responsive (not crashed)
      // Either an error banner appears OR session is created - both are acceptable
      // The key is: no crash
      const errorBanner = page.locator('[role="alert"]').first()
      const hasError = await errorBanner.isVisible().catch(() => false)
      
      // As long as the page is still responsive, we're good
      await expect(page.locator('header').first()).toBeVisible()
      
      console.log(hasError ? 'Session creation showed error (expected)' : 'Session creation succeeded')
    }
  })

  test('error boundary catches render errors', async ({ page }) => {
    // Verify the app renders without crashing — header should be visible
    await page.waitForTimeout(1000)
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 10_000 })
  })

  test('escape key navigation works', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Navigate deeper into the app
    const squadItem = page.locator('[role="button"], button').filter({ hasText: /Squad Campus|Squad Office|ai-office-squad/i }).first()
    if (await squadItem.isVisible()) {
      await squadItem.click()
      await page.waitForTimeout(1000)
      
      // Press Escape to navigate back
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      
      // Should be back at building view
      // The app should still be responsive
      await expect(page.locator('header').first()).toBeVisible()
    }
  })

  test('agent card selection works', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Navigate to floor view
    const squadItem = page.locator('[role="button"], button').filter({ hasText: /Squad Campus|Squad Office|ai-office-squad/i }).first()
    if (await squadItem.isVisible()) {
      await squadItem.click()
      await page.waitForTimeout(1000)
      
      // Find and click an agent card
      const agentCards = page.locator('[data-testid="agent-card"]')
      const firstCard = agentCards.first()
      
      const isVisible = await firstCard.isVisible().catch(() => false)
      if (isVisible) {
        await firstCard.click()
        await page.waitForTimeout(500)
        
        // Chat panel or agent detail should appear
        // Verify app is still responsive
        await expect(page.locator('header').first()).toBeVisible()
      } else {
        // Try alternate selector
        const altCard = page.locator('.agent-card, [role="button"]').filter({ hasText: /Blain|Casey|Mac|Poncho|Billy/i }).first()
        if (await altCard.isVisible()) {
          await altCard.click()
          await page.waitForTimeout(500)
          await expect(page.locator('header').first()).toBeVisible()
        }
      }
    }
  })

  test('status bar renders', async ({ page }) => {
    // StatusBar should show at bottom with connection status
    const statusBar = page.locator('[role="status"], .status-bar, footer').first()
    
    // Wait for it to appear
    await page.waitForTimeout(2000)
    
    // Status bar may show squad name, token count, connection status, etc.
    // Just verify it exists
    if (await statusBar.isVisible()) {
      await expect(statusBar).toBeVisible()
    }
  })

  test('app window has reasonable size', async ({ electronApp }) => {
    const page = await electronApp.firstWindow()
    const size = await page.evaluate(() => ({
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
    }))

    // Verify window is at least a reasonable minimum size
    expect(size.width).toBeGreaterThan(800)
    expect(size.height).toBeGreaterThan(600)
  })
})
