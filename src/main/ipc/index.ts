import { ipcMain, dialog, shell, BrowserWindow, app, Notification } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { rcloneService, configService, jobService, logService, store, profileService, scheduleService, mountService, executeScheduleTask, broadcastScheduleUpdate } from '../index'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, rmSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { exec, execFile, spawn } from 'child_process'
import { promisify } from 'util'
import type { AppSettings, RcloneExecuteArgs } from '../../shared/types'

const execAsync = promisify(exec)

const WINFSP_DLL_NAMES = ['winfsp-x64.dll', 'winfsp-x86.dll', 'winfsp-arm64.dll']
const WINFSP_COMMON_PATHS = [
  join('C:', 'Program Files (x86)', 'WinFsp', 'bin'),
  join('C:', 'Program Files', 'WinFsp', 'bin'),
]

async function findWinFsp(): Promise<string | null> {
  if (process.platform !== 'win32') return null

  for (const dir of WINFSP_COMMON_PATHS) {
    for (const dll of WINFSP_DLL_NAMES) {
      const p = join(dir, dll)
      if (existsSync(p)) return p
    }
  }

  try {
    const { stdout } = await execAsync('where winfsp-x64.dll', { timeout: 5000 })
    const path = stdout.trim().split('\n')[0]
    if (path && existsSync(path)) return path
  } catch {}

  try {
    const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\WinFsp" /v InstallDir', { timeout: 5000 })
    const match = stdout.match(/InstallDir\s+REG_SZ\s+(.+)/)
    if (match) {
      const dir = match[1].trim()
      for (const dll of WINFSP_DLL_NAMES) {
        const p = join(dir, 'bin', dll)
        if (existsSync(p)) return p
      }
    }
  } catch {}

  try {
    const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\WinFsp" /v InstallDir', { timeout: 5000 })
    const match = stdout.match(/InstallDir\s+REG_SZ\s+(.+)/)
    if (match) {
      const dir = match[1].trim()
      for (const dll of WINFSP_DLL_NAMES) {
        const p = join(dir, 'bin', dll)
        if (existsSync(p)) return p
      }
    }
  } catch {}

  return null
}

async function checkWinFsp(): Promise<{ installed: boolean; path: string | null }> {
  if (process.platform !== 'win32') return { installed: true, path: null }
  const found = await findWinFsp()
  return { installed: !!found, path: found }
}

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  // Rclone operations
  ipcMain.handle(IPC_CHANNELS.RCLONE_EXECUTE, async (_event, args: RcloneExecuteArgs) => {
    logService.log('INFO', `Execute: rclone ${args.command}`, 'ipc')
    return rcloneService.execute(args)
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_EXECUTE_STREAM, async (event, jobData: { id: string; command: string; args: string[]; source: string; destination: string; logFile?: string }, args: RcloneExecuteArgs) => {
    logService.log('INFO', `Execute stream: rclone ${args.command} [${jobData.logFile || jobData.command}]`, 'ipc')
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      jobService.createJobFromData(jobData)
      await jobService.startJob(jobData.id, window)
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_STOP, (_event, jobId: string) => {
    return jobService.stopJob(jobId)
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_VERSION, async () => {
    return rcloneService.execute({ command: 'version' })
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_LIST_REMOTES, async () => {
    return rcloneService.execute({ command: 'listremotes' })
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_START_RCD, async () => {
    return rcloneService.startRcd()
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_STOP_RCD, () => {
    rcloneService.stopRcd()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_ABOUT, async (_event, remote: string) => {
    return rcloneService.execute({ command: 'about', source: remote ? `${remote}:` : '', flags: { json: true } })
  })

  ipcMain.handle(IPC_CHANNELS.RCLONE_SELFUPDATE, async (_event, stable: boolean) => {
    return rcloneService.execute({ command: 'selfupdate', flags: { yes: true, stable } })
  })

  // Config operations
  ipcMain.handle(IPC_CHANNELS.CONFIG_READ, () => {
    return configService.readConfig()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_WRITE, (_event, config) => {
    configService.writeConfig(config)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_CREATE_REMOTE, (_event, remote) => {
    configService.createRemote(remote)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE_REMOTE, (_event, name, remote) => {
    configService.updateRemote(name, remote)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE_REMOTE, (_event, name) => {
    configService.deleteRemote(name)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_RENAME_REMOTE, (_event, oldName, newName) => {
    configService.renameRemote(oldName, newName)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_COPY_REMOTE, (_event, sourceName, destName) => {
    configService.copyRemote(sourceName, destName)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_TEST_REMOTE, async (_event, remoteName) => {
    return rcloneService.execute({
      command: 'lsd',
      source: `${remoteName}:`
    })
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_FIND, () => {
    return configService.findConfig()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_PATH, () => {
    return configService.getConfigPath()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_BACKUP, async () => {
    return configService.backupConfig()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_RESTORE, async (_event, configPath: string) => {
    return configService.restoreConfig(configPath)
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_OBSCURE, async (_event, password: string) => {
    const result = await rcloneService.execute({ command: 'obscure', positionalArgs: [password] })
    return result.stdout.trim()
  })

  // Dialog operations
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, options || {})
    if (result.canceled) return null
    return result.filePaths
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showSaveDialog(window, options || {})
    if (result.canceled) return null
    return result.filePath
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      ...options
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_MESSAGE, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    return dialog.showMessageBox(window, options)
  })

  // File system operations
  ipcMain.handle(IPC_CHANNELS.FS_READ_DIR, (_event, dirPath: string) => {
    if (!existsSync(dirPath)) return []
    const { readdirSync, statSync } = require('fs')
    const entries = readdirSync(dirPath)
    return entries.map((name: string) => {
      const fullPath = join(dirPath, name)
      try {
        const stat = statSync(fullPath)
        return {
          name,
          path: fullPath,
          size: stat.size,
          modTime: stat.mtime.toISOString(),
          isDir: stat.isDirectory(),
          mimeType: undefined
        }
      } catch {
        return {
          name,
          path: fullPath,
          size: 0,
          modTime: '',
          isDir: false,
          mimeType: undefined
        }
      }
    })
  })

  ipcMain.handle(IPC_CHANNELS.FS_GET_INFO, (_event, filePath: string) => {
    const { statSync } = require('fs')
    if (!existsSync(filePath)) return null
    const stat = statSync(filePath)
    return {
      size: stat.size,
      modTime: stat.mtime.toISOString(),
      isDir: stat.isDirectory(),
      isFile: stat.isFile()
    }
  })

  ipcMain.handle(IPC_CHANNELS.FS_EXISTS, (_event, filePath: string) => {
    return existsSync(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_MKDIR, (_event, dirPath: string) => {
    mkdirSync(dirPath, { recursive: true })
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, (_event, filePath: string) => {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, (_event, filePath: string, content: string) => {
    const dir = join(filePath, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.FS_RENAME, (_event, oldPath: string, newPath: string) => {
    renameSync(oldPath, newPath)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.FS_COPY, (_event, source: string, destination: string) => {
    copyFileSync(source, destination)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.FS_DELETE, (_event, filePath: string, recursive?: boolean) => {
    try {
      const stat = statSync(filePath)
      const isDir = stat.isDirectory()
      rmSync(filePath, { recursive: recursive ?? isDir, force: true })
    } catch {
      rmSync(filePath, { recursive: recursive ?? true, force: true })
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.FS_GET_DISK_SPACE, async (_event, dirPath: string) => {
    try {
      if (process.platform === 'win32') {
        const drive = dirPath.substring(0, 2)
        const { stdout } = await execAsync(
          `powershell -NoProfile -Command "Get-PSDrive ${drive[0]} | Select-Object Used,Free | ConvertTo-Json"`,
          { timeout: 5000 }
        )
        const parsed = JSON.parse(stdout.trim())
        const used = parsed.Used ?? 0
        const free = parsed.Free ?? 0
        return { total: used + free, free, used }
      } else {
        const { stdout } = await execAsync(`df -k "${dirPath}"`, { timeout: 5000 })
        const lines = stdout.trim().split('\n')
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/)
          const total = parseInt(parts[1], 10) * 1024
          const used = parseInt(parts[2], 10) * 1024
          const free = parseInt(parts[3], 10) * 1024
          return { total, free, used }
        }
        return { total: 0, free: 0, used: 0 }
      }
    } catch {
      return { total: 0, free: 0, used: 0 }
    }
  })

  // App operations
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_SETTINGS, () => {
    return store.store
  })

  ipcMain.handle(IPC_CHANNELS.APP_SET_SETTINGS, (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value)
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_RCLONE_PATH, () => {
    return rcloneService.getRclonePath()
  })

  ipcMain.handle(IPC_CHANNELS.APP_SET_RCLONE_PATH, (_event, path: string) => {
    store.set('rclonePath', path)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_FIND_RCLONE, async () => {
    return rcloneService.findExecutable()
  })

  ipcMain.handle(IPC_CHANNELS.APP_TEST_RCLONE, async (_event, path: string) => {
    return rcloneService.validateExecutable(path)
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_CONFIG_PATH, () => {
    return configService.getConfigPath()
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, (_event, url: string) => {
    shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_LOG_FOLDER, () => {
    shell.openPath(logService.getLogDir())
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_LOG_DIR, () => {
    return logService.getLogDir()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_SETUP_STATUS, () => {
    const rclonePath = store.get('rclonePath') as string | undefined
    const configPath = configService.getConfigPath()
    const rcloneFound = !!rclonePath && existsSync(rclonePath)
    const configFound = !!configPath && existsSync(configPath)
    const setupComplete = !!store.get('setupComplete')
    return { rcloneFound, configFound, setupComplete }
  })

  ipcMain.handle(IPC_CHANNELS.APP_COMPLETE_SETUP, () => {
    store.set('setupComplete', true)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_EXPORT_SETTINGS, async (_event, filePath: string) => {
    const settings = store.store
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_IMPORT_SETTINGS, async (_event, filePath: string) => {
    if (!existsSync(filePath)) return { success: false, error: 'File not found' }
    const content = readFileSync(filePath, 'utf-8')
    const settings = JSON.parse(content) as Partial<AppSettings>
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value)
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_NOTIFY, (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_CLEAR_LOGS, () => {
    const logDir = logService.getLogDir()
    if (!existsSync(logDir)) return { success: true, count: 0 }
    const { readdirSync } = require('fs')
    const files = readdirSync(logDir).filter((f: string) => f.endsWith('.log'))
    let count = 0
    for (const file of files) {
      try {
        rmSync(join(logDir, file), { force: true })
        count++
      } catch {}
    }
    return { success: true, count }
  })

  ipcMain.handle(IPC_CHANNELS.APP_BROWSE_FOLDER, async (event, options?: { defaultPath?: string; type?: 'folder' | 'file' | 'both' }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePaths: [] }
    const browseType = options?.type || 'folder'
    const properties: Array<'openDirectory' | 'openFile' | 'createDirectory'> = []
    if (browseType === 'folder' || browseType === 'both') properties.push('openDirectory', 'createDirectory')
    if (browseType === 'file' || browseType === 'both') properties.push('openFile')
    return dialog.showOpenDialog(window, {
      properties,
      defaultPath: options?.defaultPath
    })
  })

  ipcMain.handle(IPC_CHANNELS.APP_BROWSE_FILE, async (event, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(window, {
      properties: ['openFile'],
      defaultPath: options?.defaultPath,
      filters: options?.filters
    })
  })

  // Job operations
  ipcMain.handle(IPC_CHANNELS.JOB_LIST, () => {
    return jobService.getAllJobs()
  })

  ipcMain.handle(IPC_CHANNELS.JOB_STOP, (event, jobId: string) => {
    const result = jobService.stopJob(jobId)
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_EXIT, {
        jobId,
        exitCode: -3,
        error: 'cancelled'
      })
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.JOB_PAUSE, (_event, jobId: string) => {
    jobService.pauseJob(jobId)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.JOB_RESUME, async (event, jobId: string) => {
    const job = jobService.getJob(jobId)
    if (job && job.status === 'paused') {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        job.status = 'running'
        job.endTime = undefined
        job.error = undefined
        job.startTime = Date.now()
        jobService.startJob(jobId, window).catch(() => {})
      }
    }
    return { success: true }
  })

  // Profile operations
  ipcMain.handle(IPC_CHANNELS.PROFILE_LIST, () => {
    return profileService.list()
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_SAVE, (_event, profile) => {
    return profileService.save(profile)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, (_event, profileId: string) => {
    return profileService.delete(profileId)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_DUPLICATE, (_event, profileId: string, newName?: string) => {
    return profileService.duplicate(profileId, newName)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_RUN, async (event, profileId: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      await profileService.runProfile(profileId, window)
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, async (_event, profileId: string, filePath: string) => {
    return profileService.exportProfile(profileId, filePath)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT, async (_event, filePath: string) => {
    return profileService.importProfile(filePath)
  })

  // Schedule operations

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_LIST, () => {
    return scheduleService.listSchedules()
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_SAVE, (_event, schedule) => {
    const result = scheduleService.saveSchedule(schedule)
    broadcastScheduleUpdate()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_DELETE, (_event, scheduleId: string) => {
    const result = scheduleService.deleteSchedule(scheduleId)
    broadcastScheduleUpdate()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_TOGGLE, (_event, scheduleId: string, enabled: boolean) => {
    const result = scheduleService.toggleSchedule(scheduleId, enabled)
    broadcastScheduleUpdate()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_RUN_NOW, async (event, scheduleId: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      await executeScheduleTask(scheduleId, window)
    }
    return { success: true }
  })

  // WinFsp detection
  ipcMain.handle(IPC_CHANNELS.MOUNT_CHECK_WINFSP, async () => {
    const result = await checkWinFsp()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.MOUNT_FIND_WINFSP, async () => {
    return findWinFsp()
  })

  ipcMain.handle(IPC_CHANNELS.MOUNT_LIST_ACTIVE, async () => {
    return mountService.verifyMounts()
  })

  ipcMain.handle(IPC_CHANNELS.MOUNT_MOUNT, async (_event, args: { remote: string; mountPoint: string; type: string; flags: Record<string, any> }) => {
    const rclonePath = rcloneService.getRclonePath()
    const cmdArgs = [args.type]
    cmdArgs.push(`${args.remote}:`)
    cmdArgs.push(args.mountPoint)

    for (const [key, value] of Object.entries(args.flags)) {
      if (typeof value === 'boolean') {
        if (value) cmdArgs.push(`--${key}`)
      } else {
        cmdArgs.push(`--${key}`, String(value))
      }
    }

    const configPath = store.get('configPath')
    if (configPath) {
      cmdArgs.push('--config', configPath)
    }

    logService.log('INFO', `Mount: rclone ${cmdArgs.join(' ')}`, 'mount')

    return new Promise((resolve) => {
      const proc = spawn(rclonePath, cmdArgs, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      let stdout = ''
      let stderr = ''
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

      const done = (exitCode: number) => {
        proc.unref()
        if (exitCode === 0) {
          resolve({ exitCode: 0, pid: proc.pid })
        } else {
          logService.log('ERROR', `Mount failed: ${stderr || stdout}`, 'mount')
          resolve({ exitCode, error: stderr || stdout, pid: proc.pid })
        }
      }

      proc.on('exit', (code) => done(code ?? 1))
      proc.on('error', (err) => {
        logService.log('ERROR', `Mount error: ${err.message}`, 'mount')
        resolve({ exitCode: -1, error: err.message })
      })
      
      setTimeout(() => {
        if (!proc.killed) {
          done(0)
        }
      }, 3000)
    })
  })

  ipcMain.handle(IPC_CHANNELS.MOUNT_UNMOUNT, async (_event, args: { remote: string; mountPoint: string; pid?: number }) => {
    logService.log('INFO', `Unmount: ${args.remote}: from ${args.mountPoint} (pid: ${args.pid || 'unknown'})`, 'mount')

    // Strategy 1: Kill the daemon process by PID (most reliable on Windows)
    if (args.pid) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${args.pid} /F`, { timeout: 5000 })
          logService.log('INFO', `Killed daemon process PID ${args.pid}`, 'mount')
          return { success: true }
        } else {
          process.kill(args.pid, 'SIGTERM')
          logService.log('INFO', `Sent SIGTERM to PID ${args.pid}`, 'mount')
          return { success: true }
        }
      } catch (err) {
        logService.log('WARN', `PID kill failed: ${(err as Error).message}, trying rclone --umount`, 'mount')
      }
    }

    // Strategy 2: Try rclone mount --umount (works on Linux/macOS, may work on Windows)
    const rclonePath = rcloneService.getRclonePath()
    const cmdArgs = ['mount', `${args.remote}:`, args.mountPoint, '--umount']
    const configPath = store.get('configPath')
    if (configPath) cmdArgs.push('--config', configPath)

    return new Promise((resolve) => {
      execFile(rclonePath, cmdArgs, { timeout: 10000 }, (error, _stdout, stderr) => {
        if (error) {
          logService.log('ERROR', `rclone --umount failed: ${stderr || error.message}`, 'mount')
          // Strategy 3: On Windows, try killing all rclone processes for this mount point
          if (process.platform === 'win32') {
            execAsync(`powershell -NoProfile -Command "Get-Process rclone -ErrorAction SilentlyContinue | ForEach-Object { if ($_.CommandLine -like '*${args.mountPoint}*') { Stop-Process -Id $_.Id -Force } }"`, { timeout: 10000 })
              .then(() => {
                logService.log('INFO', `Force-killed rclone processes for ${args.mountPoint}`, 'mount')
                resolve({ success: true })
              })
              .catch(() => {
                resolve({ success: false, error: 'All unmount strategies failed' })
              })
          } else {
            resolve({ success: false, error: stderr || error.message })
          }
        } else {
          logService.log('INFO', `Unmount success for ${args.remote}: at ${args.mountPoint}`, 'mount')
          resolve({ success: true })
        }
      })
    })
  })

  ipcMain.handle(IPC_CHANNELS.APP_SET_AUTO_LAUNCH, (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false,
      path: app.getPath('exe')
    })
    store.set('autoLaunch', enabled)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_SET_MINIMIZE_TO_TRAY, (_event, enabled: boolean) => {
    store.set('minimizeToTray', enabled)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.APP_BROWSE_BACKUP_PATH, async (event, options?: { defaultPath?: string }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: options?.defaultPath
    })
  })
}
