import { execFile, spawn, execSync, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { existsSync, appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { JsonStore } from './json-store'
import type { AppSettings, RcloneExecuteResult, RcloneExecuteArgs, RcloneVersion } from '../../shared/types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { BrowserWindow } from 'electron'

const execFileAsync = promisify(execFile)

interface RcdProcess {
  process: ChildProcess
  port: number
  user: string
  pass: string
}

export class RcloneService {
  private store: JsonStore<AppSettings>
  private rcdProcess: RcdProcess | null = null
  private runningProcesses: Map<string, ChildProcess> = new Map()
  private intentionalKills: Map<string, string> = new Map()

  constructor(store: JsonStore<AppSettings>) {
    this.store = store
  }

  getRclonePath(): string {
    const customPath = this.store.get('rclonePath')
    if (customPath && existsSync(customPath)) {
      return customPath
    }
    return 'rclone'
  }

  async findExecutable(): Promise<string | null> {
    const candidates: string[] = []

    if (process.platform === 'win32') {
      candidates.push(
        'C:\\Program Files\\rclone\\rclone.exe',
        'C:\\Program Files (x86)\\rclone\\rclone.exe',
        join(app.getPath('userData'), 'rclone.exe'),
        join(app.getPath('downloads'), 'rclone.exe'),
        join(app.getPath('desktop'), 'rclone.exe')
      )
    } else if (process.platform === 'darwin') {
      candidates.push(
        '/usr/local/bin/rclone',
        '/opt/homebrew/bin/rclone',
        '/usr/bin/rclone',
        join(app.getPath('home'), 'bin', 'rclone'),
        join(app.getPath('home'), 'go', 'bin', 'rclone'),
        '/Applications/rclone.app/Contents/MacOS/rclone'
      )
    } else {
      candidates.push(
        '/usr/bin/rclone',
        '/usr/local/bin/rclone',
        '/snap/bin/rclone',
        join(app.getPath('home'), 'bin', 'rclone'),
        join(app.getPath('home'), 'go', 'bin', 'rclone')
      )
    }

    const customPath = this.store.get('rclonePath')
    if (customPath && existsSync(customPath)) {
      return customPath
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }

    try {
      const result = await execFileAsync('which', ['rclone'])
      if (result.stdout.trim()) {
        return result.stdout.trim()
      }
    } catch {
      // which not found or rclone not in PATH
    }

    if (process.platform === 'win32') {
      try {
        const result = await execFileAsync('where', ['rclone'])
        if (result.stdout.trim()) {
          return result.stdout.trim().split('\n')[0].trim()
        }
      } catch {
        // where not found or rclone not in PATH
      }
    }

    return null
  }

  async validateExecutable(path: string): Promise<{ valid: boolean; version?: RcloneVersion; error?: string }> {
    if (!existsSync(path)) {
      return { valid: false, error: `File not found: ${path}` }
    }

    try {
      const { stdout } = await execFileAsync(path, ['version'], { timeout: 10000 })
      const versionMatch = stdout.match(/rclone\s+v?([\d.]+)/)
      const versionStr = versionMatch ? versionMatch[1] : 'unknown'
      return {
        valid: true,
        version: {
          version: versionStr,
          os: process.platform,
          arch: process.arch,
          goVersion: '',
          isGit: stdout.includes('-beta') || stdout.includes('-DEV'),
          buildDate: '',
          features: []
        }
      }
    } catch (err) {
      return { valid: false, error: `Failed to execute rclone: ${(err as Error).message}` }
    }
  }

  async execute(args: RcloneExecuteArgs): Promise<RcloneExecuteResult> {
    const rclonePath = this.getRclonePath()
    const startTime = Date.now()

    const cmdArgs = this.buildArgs(args)

    return new Promise((resolve) => {
      execFile(
        rclonePath,
        cmdArgs,
        { timeout: 600000, maxBuffer: 50 * 1024 * 1024 },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error ? (error as any).code || 1 : 0,
            duration: Date.now() - startTime
          })
        }
      )
    })
  }

  async executeStream(
    jobId: string,
    args: RcloneExecuteArgs,
    window: BrowserWindow,
    logFile?: string
  ): Promise<void> {
    const rclonePath = this.getRclonePath()
    const cmdArgs = this.buildArgs(args)

    const proc = spawn(rclonePath, cmdArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.runningProcesses.set(jobId, proc)

    const logDir = join(app.getPath('userData'), 'logs')
    const namedLogPath = logFile ? join(logDir, `${logFile.replace(/[<>:"/\\|?*]/g, '_')}.log`) : null
    if (namedLogPath && !existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    const writeLog = (line: string) => {
      if (namedLogPath) {
        try {
          const now = new Date()
          const pad = (n: number) => String(n).padStart(2, '0')
          const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
          appendFileSync(namedLogPath, `[${ts}] ${line}\n`, 'utf-8')
        } catch {}
      }
    }

    return new Promise<void>((resolve, reject) => {
      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          writeLog(line)
          window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_OUTPUT, {
            jobId,
            stream: 'stdout',
            data: line
          })

          try {
            const parsed = JSON.parse(line)
            if (parsed.stats) {
              window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_STATS, {
                jobId,
                stats: parsed.stats
              })
            }
          } catch {
            // Not JSON, regular output
          }
        }
      })

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          writeLog(`[STDERR] ${line}`)
          window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_OUTPUT, {
            jobId,
            stream: 'stderr',
            data: line
          })

          try {
            const parsed = JSON.parse(line)
            if (parsed.stats) {
              window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_STATS, {
                jobId,
                stats: parsed.stats
              })
            }
          } catch {
            // Not JSON, regular output
          }
        }
      })

      proc.on('exit', (code) => {
        this.runningProcesses.delete(jobId)
        const reason = this.intentionalKills.get(jobId)
        this.intentionalKills.delete(jobId)

        if (reason) {
          window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_EXIT, {
            jobId,
            exitCode: -3,
            error: reason
          })
          resolve()
        } else {
          window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_EXIT, {
            jobId,
            exitCode: code
          })
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`rclone exited with code ${code}`))
          }
        }
      })

      proc.on('error', (err) => {
        this.runningProcesses.delete(jobId)
        window.webContents.send(IPC_CHANNELS.EVENT_RCLONE_EXIT, {
          jobId,
          exitCode: -1,
          error: err.message
        })
        reject(err)
      })
    })
  }

  stopJob(jobId: string): boolean {
    const proc = this.runningProcesses.get(jobId)
    if (proc) {
      this.intentionalKills.set(jobId, 'cancelled')
      this.killProcess(proc, jobId)
      return true
    }
    return false
  }

  killJob(jobId: string): boolean {
    const proc = this.runningProcesses.get(jobId)
    if (proc) {
      this.intentionalKills.set(jobId, 'paused')
      this.killProcess(proc, jobId)
      return true
    }
    return false
  }

  private killProcess(proc: ChildProcess, jobId: string): void {
    try {
      if (process.platform === 'win32' && proc.pid) {
        try {
          execSync(`taskkill /F /PID ${proc.pid} /T`, { timeout: 5000, stdio: 'ignore' })
        } catch {
          proc.kill('SIGTERM')
        }
      } else {
        proc.kill('SIGTERM')
      }
    } catch {
      // Process may already be dead
    }
    this.runningProcesses.delete(jobId)
  }

  stopAll(): void {
    for (const [_jobId, proc] of this.runningProcesses) {
      proc.kill('SIGTERM')
    }
    this.runningProcesses.clear()
  }

  async startRcd(): Promise<{ port: number; user: string; pass: string }> {
    if (this.rcdProcess) {
      return {
        port: this.rcdProcess.port,
        user: this.rcdProcess.user,
        pass: this.rcdProcess.pass
      }
    }

    const rclonePath = this.getRclonePath()
    const port = 5572
    const user = 'rclone'
    const pass = this.generatePassword()

    const args = [
      'rcd',
      '--rc-addr', `127.0.0.1:${port}`,
      '--rc-user', user,
      '--rc-pass', pass,
      '--rc-no-auth=false',
      '--log-level', 'NOTICE'
    ]

    const configPath = this.store.get('configPath')
    if (configPath) {
      args.push('--config', configPath)
    }

    const proc = spawn(rclonePath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.rcdProcess = { process: proc, port, user, pass }

    return { port, user, pass }
  }

  stopRcd(): void {
    if (this.rcdProcess) {
      this.rcdProcess.process.kill('SIGTERM')
      this.rcdProcess = null
    }
  }

  cleanup(): void {
    this.stopAll()
    this.stopRcd()
  }

  private buildArgs(args: RcloneExecuteArgs): string[] {
    if (args.rawArgs) {
      const cmdArgs = [...args.rawArgs]
      const configPath = args.configPath || this.store.get('configPath')
      if (configPath && !cmdArgs.includes('--config')) {
        cmdArgs.push('--config', configPath)
      }
      return cmdArgs
    }

    const cmdArgs: string[] = [args.command]

    if (args.source) cmdArgs.push(args.source)
    if (args.destination) cmdArgs.push(args.destination)
    if (args.positionalArgs) cmdArgs.push(...args.positionalArgs)

    if (args.flags) {
      for (const [key, value] of Object.entries(args.flags)) {
        const flagKey = key.startsWith('-') ? key : `--${key}`
        if (typeof value === 'boolean') {
          if (value) cmdArgs.push(flagKey)
        } else {
          cmdArgs.push(flagKey, String(value))
        }
      }
    }

    const configPath = args.configPath || this.store.get('configPath')
    if (configPath) {
      cmdArgs.push('--config', configPath)
    }

    return cmdArgs
  }

  private generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}
