import { appendFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { JsonStore } from './json-store'
import type { AppSettings } from '../../shared/types'

export class LogService {
  private logDir: string

  constructor(_store: JsonStore<AppSettings>) {
    this.logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  log(level: string, message: string, source?: string): void {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const entry = `[${timestamp}] [${level}]${source ? ` [${source}]` : ''} ${message}\n`

    const logFile = join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`)
    try {
      appendFileSync(logFile, entry, 'utf-8')
    } catch {
      // Silently fail if we can't write logs
    }
  }

  getLogFiles(): string[] {
    if (!existsSync(this.logDir)) return []
    return readdirSync(this.logDir)
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse()
  }

  readLogFile(filename: string): string {
    const logPath = join(this.logDir, filename)
    if (!existsSync(logPath)) return ''
    const { readFileSync } = require('fs')
    return readFileSync(logPath, 'utf-8')
  }

  clearOldLogs(keepDays: number = 30): void {
    const files = this.getLogFiles()
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000

    for (const file of files) {
      const logPath = join(this.logDir, file)
      const stat = statSync(logPath)
      if (stat.mtimeMs < cutoff) {
        unlinkSync(logPath)
      }
    }
  }

  getLogDir(): string {
    return this.logDir
  }
}
