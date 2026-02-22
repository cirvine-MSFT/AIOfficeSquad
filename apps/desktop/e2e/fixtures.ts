import { test as base, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Launch Electron with the built main entry point
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'out', 'main', 'index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    await use(electronApp)

    // Cleanup: close all windows and exit
    await electronApp.close()
  },

  page: async ({ electronApp }, use) => {
    // Wait for first window to open
    const page = await electronApp.firstWindow()
    
    // Wait for DOM and React to mount
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('#root > *', { timeout: 15_000 }).catch(() => {
      // React may not render if SDK fails — still proceed
    })

    await use(page)
  },
})

export { expect } from '@playwright/test'
