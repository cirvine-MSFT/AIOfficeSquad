import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { SquadRuntime } from './squad-runtime.js'
import { registerIpcHandlers, removeIpcHandlers } from './ipc-handlers.js'

// ── Crash protection — keep the process alive ────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Main] UNCAUGHT EXCEPTION:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Main] UNHANDLED REJECTION:', reason)
})

let mainWindow: BrowserWindow | null = null
let runtime: SquadRuntime | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Detect renderer crashes
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] RENDERER CRASHED:', details.reason, details.exitCode)
  })
  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] RENDERER UNRESPONSIVE')
  })
  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[Main] RENDERER FAILED TO LOAD:', code, desc)
  })

  // Open devtools in dev mode so we can see errors (but not during tests)
  if (is.dev && process.env.NODE_ENV !== 'test') {
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  }

  // Load the renderer — dev server or built files
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── App lifecycle ──────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Initialize Squad runtime
  runtime = new SquadRuntime()
  registerIpcHandlers(runtime, () => mainWindow)

  // Auto-initialize SDK (fire-and-forget, doesn't block window creation)
  runtime.initialize().catch(err => {
    console.error('[Main] SDK initialization failed:', err)
  })

  // Subscribe to ready state — push initial data once SDK is ready
  runtime.onReady(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      runtime.loadSquadConfig().then(config => {
        mainWindow?.webContents.send('squad:config-loaded', config)
      }).catch(err => {
        console.error('[Main] Failed to load config:', err)
      })
      mainWindow.webContents.send('squad:connection-state', { connected: true })
    }
  })

  createWindow()

  // Push initial roster immediately (works without SDK)
  mainWindow?.webContents.once('did-finish-load', async () => {
    try {
      const config = await runtime.loadSquadConfig()
      mainWindow?.webContents.send('squad:config-loaded', config)
      if (runtime.isReady) {
        mainWindow?.webContents.send('squad:connection-state', { connected: true })
      }
    } catch (err) {
      console.error('[Main] Failed to load initial config:', err)
    }
  })

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', async () => {
  removeIpcHandlers()
  if (runtime) {
    await runtime.cleanup()
    runtime = null
  }
})
