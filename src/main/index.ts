import { app, shell, BrowserWindow, Tray, Menu, nativeImage, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { RcloneService } from './services/rclone.service'
import { ConfigService } from './services/config.service'
import { JobService } from './services/job.service'
import { LogService } from './services/log.service'
import { ProfileService } from './services/profile.service'
import { ScheduleService } from './services/schedule.service'
import { MountService } from './services/mount.service'
import { registerIpcHandlers } from './ipc'
import { JsonStore } from './services/json-store'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { AppSettings } from '../shared/types'

const defaultSettings: AppSettings = {
  rclonePath: '',
  configPath: '',
  theme: 'system',
  uiMode: 'advanced',
  language: 'en',
  defaultTransfers: 4,
  defaultCheckers: 8,
  defaultBufferSize: '16M',
  defaultBandwidthLimit: '',
  logLevel: 'INFO',
  logToFile: false,
  logFilePath: '',
  notifications: true,
  autoUpdate: true,
  tempDir: '',
  windowBounds: { width: 1400, height: 900 },
  sidebarCollapsed: false,
  setupComplete: false,
  preserveRemotePasswords: true,
  defaultDedupMode: 'interactive',
  defaultSyncMode: 'copy',
  autoMountOnStart: false,
  recentCommands: [],
  commandPresets: [],
  autoLaunch: false,
  minimizeToTray: false,
  backupPath: ''
}

export const store = new JsonStore<AppSettings>({
  name: 'rclone-app-settings',
  defaults: defaultSettings
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let forceQuit = false
export function getMainWindow(): BrowserWindow | null { return mainWindow }

function findIcon(filename: string): string | null {
  const candidates = [
    join(__dirname, filename),
    join(__dirname, '../../resources', filename),
    join(process.cwd(), 'resources', filename),
    join(process.resourcesPath, filename),
    join(process.resourcesPath, 'resources', filename)
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}
export let rcloneService: RcloneService
export let configService: ConfigService
export let jobService: JobService
export let logService: LogService
export let profileService: ProfileService
export let scheduleService: ScheduleService
export let mountService: MountService

export function broadcastScheduleUpdate(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.EVENT_SCHEDULE_UPDATED)
    }
  }
}

const runningTaskIds = new Set<string>()

export async function executeScheduleTask(taskId: string, window: BrowserWindow): Promise<void> {
  if (runningTaskIds.has(taskId)) return
  runningTaskIds.add(taskId)

  const task = scheduleService.getById(taskId)
  if (!task || !task.enabled || !task.schedule.enabled) {
    runningTaskIds.delete(taskId)
    return
  }
  const profile = profileService.getById(task.profileId)
  if (!profile) {
    runningTaskIds.delete(taskId)
    return
  }

  const sources = (profile.sources && profile.sources.length > 0) ? profile.sources : [profile.source]
  const displayName = task.name || task.profileName || task.id

  let allSucceeded = true

  for (const source of sources) {
    const flagArgs: string[] = []
    for (const [key, value] of Object.entries(profile.flags)) {
      if (typeof value === 'boolean') {
        if (value) flagArgs.push(`--${key}`)
      } else if (value !== '' && value !== undefined) {
        flagArgs.push(`--${key}`, String(value))
      }
    }
    if (profile.filters) {
      for (const filter of profile.filters) {
        if (!filter.enabled) continue
        if (filter.type === 'exclude') flagArgs.push('--exclude', filter.pattern)
        else if (filter.type === 'include') flagArgs.push('--include', filter.pattern)
        else flagArgs.push('--filter', filter.pattern)
      }
    }

    const args = [profile.command, source, profile.destination, ...flagArgs]
    const jobId = `sched-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    logService.log('INFO', `Schedule "${displayName}" starting source "${source}" (job ${jobId})`, 'scheduler')
    logService.log('INFO', `  rclone ${args.join(' ')}`, 'scheduler')

    jobService.createJobFromData({
      id: jobId,
      command: profile.command,
      args,
      source,
      destination: profile.destination || '',
      logFile: `schedule-${displayName}.log`
    })

    try {
      await jobService.startJob(jobId, window)
      logService.log('INFO', `Schedule "${displayName}" source "${source}" completed`, 'scheduler')
    } catch (err) {
      logService.log('ERROR', `Schedule "${displayName}" source "${source}" failed: ${(err as Error).message || err}`, 'scheduler')
      allSucceeded = false
    }
  }

  const status = allSucceeded ? 'success' : 'failed'
  scheduleService.markRun(task.id, status)
  profileService.updateRunStatus(profile.id, status)
  broadcastScheduleUpdate()

  if (allSucceeded) {
    const dependents = scheduleService.getDependents(task.id)
    for (const dep of dependents) {
      if (!dep.enabled || !dep.schedule.enabled) continue
      logService.log('INFO', `Schedule "${displayName}" triggering dependent "${dep.name || dep.profileName || dep.id}"`, 'scheduler')
      await executeScheduleTask(dep.id, window)
    }
  }

  runningTaskIds.delete(taskId)
}

function createWindow(): void {
  const bounds = store.get('windowBounds')

  const iconPath = findIcon('icon.ico')
  const windowIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Rclone App',
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (forceQuit) return
    const minimizeToTray = store.get('minimizeToTray')
    if (minimizeToTray && mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds()
      store.set('windowBounds', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      })
    }
  }

  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.rclone.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  rcloneService = new RcloneService(store)
  configService = new ConfigService(store)
  jobService = new JobService(rcloneService)
  logService = new LogService(store)
  profileService = new ProfileService()
  scheduleService = new ScheduleService()
  mountService = new MountService()

  registerIpcHandlers(mainWindow!)

  let schedulerRunning = false

  setInterval(async () => {
    if (schedulerRunning) return
    schedulerRunning = true
    try {
      const dueTasks = scheduleService.getDueTasks()
      for (const task of dueTasks) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          await executeScheduleTask(task.id, mainWindow)
        }
      }
    } finally {
      schedulerRunning = false
    }
  }, 60000)

  createWindow()

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Downloading...`,
        buttons: ['OK']
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} downloaded. Restart to install?`,
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Auto-Update Error',
        message: err.message || String(err),
        buttons: ['OK']
      })
    }
  })

  if (!is.dev) autoUpdater.checkForUpdates()

  const trayIconFound = findIcon('icon.ico')
  const trayIcon = trayIconFound ? nativeImage.createFromPath(trayIconFound) : nativeImage.createEmpty()
  tray = new Tray(trayIcon)
  tray.setToolTip('Rclone App')
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Quit', click: () => { forceQuit = true; app.quit() } }
  ]))

  const autoLaunch = store.get('autoLaunch')
  if (autoLaunch) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
      path: app.getPath('exe')
    })
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  jobService.stopAll()
  rcloneService.cleanup()
})
