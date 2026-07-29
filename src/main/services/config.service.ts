import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join } from 'path'
import type { JsonStore } from './json-store'
import type { AppSettings, RemoteConfig, ConfigFile } from '../../shared/types'

export class ConfigService {
  private store: JsonStore<AppSettings>

  constructor(store: JsonStore<AppSettings>) {
    this.store = store
  }

  getConfigPath(): string {
    const customPath = this.store.get('configPath')
    if (customPath && existsSync(customPath)) {
      return customPath
    }

    const defaultPaths = this.getDefaultConfigPaths()
    for (const p of defaultPaths) {
      if (existsSync(p)) return p
    }

    return join(this.getDefaultConfigDir(), 'rclone.conf')
  }

  findConfig(): string | null {
    const customPath = this.store.get('configPath')
    if (customPath && existsSync(customPath)) return customPath

    const defaultPaths = this.getDefaultConfigPaths()
    for (const p of defaultPaths) {
      if (existsSync(p)) return p
    }

    return null
  }

  readConfig(): ConfigFile {
    const configPath = this.getConfigPath()

    if (!existsSync(configPath)) {
      return { remotes: [], path: configPath, raw: '' }
    }

    const raw = readFileSync(configPath, 'utf-8')
    const remotes = this.parseIni(raw)

    return { remotes, path: configPath, raw }
  }

  writeConfig(config: ConfigFile): void {
    const content = this.serializeConfig(config)
    writeFileSync(config.path, content, 'utf-8')
  }

  createRemote(remote: RemoteConfig): void {
    const config = this.readConfig()

    if (config.remotes.some(r => r.name === remote.name)) {
      throw new Error(`Remote "${remote.name}" already exists`)
    }

    config.remotes.push(remote)
    this.writeConfig(config)
  }

  updateRemote(name: string, remote: RemoteConfig): void {
    const config = this.readConfig()
    const index = config.remotes.findIndex(r => r.name === name)

    if (index === -1) {
      throw new Error(`Remote "${name}" not found`)
    }

    config.remotes[index] = remote
    this.writeConfig(config)
  }

  deleteRemote(name: string): void {
    const config = this.readConfig()
    const index = config.remotes.findIndex(r => r.name === name)

    if (index === -1) {
      throw new Error(`Remote "${name}" not found`)
    }

    config.remotes.splice(index, 1)
    this.writeConfig(config)
  }

  renameRemote(oldName: string, newName: string): void {
    const config = this.readConfig()
    const remote = config.remotes.find(r => r.name === oldName)

    if (!remote) {
      throw new Error(`Remote "${oldName}" not found`)
    }

    if (config.remotes.some(r => r.name === newName)) {
      throw new Error(`Remote "${newName}" already exists`)
    }

    remote.name = newName
    this.writeConfig(config)
  }

  copyRemote(sourceName: string, destName: string): void {
    const config = this.readConfig()
    const source = config.remotes.find(r => r.name === sourceName)

    if (!source) {
      throw new Error(`Remote "${sourceName}" not found`)
    }

    if (config.remotes.some(r => r.name === destName)) {
      throw new Error(`Remote "${destName}" already exists`)
    }

    const copy: RemoteConfig = {
      name: destName,
      type: source.type,
      options: { ...source.options }
    }

    config.remotes.push(copy)
    this.writeConfig(config)
  }

  backupConfig(): string {
    const configPath = this.getConfigPath()
    if (!existsSync(configPath)) {
      throw new Error('Config file not found')
    }

    const backupPath = configPath + `.backup.${Date.now()}`
    copyFileSync(configPath, backupPath)
    return backupPath
  }

  restoreConfig(backupPath: string): void {
    const configPath = this.getConfigPath()
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }
    copyFileSync(backupPath, configPath)
  }

  setConfigPath(path: string): void {
    this.store.set('configPath', path)
  }

  private parseIni(content: string): RemoteConfig[] {
    const remotes: RemoteConfig[] = []
    const lines = content.split('\n')
    let currentRemote: RemoteConfig | null = null

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) {
        continue
      }

      const sectionMatch = trimmed.match(/^\[(.+)\]$/)
      if (sectionMatch) {
        if (currentRemote) {
          remotes.push(currentRemote)
        }
        currentRemote = {
          name: sectionMatch[1],
          type: '',
          options: {}
        }
        continue
      }

      if (currentRemote) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim()
          const value = trimmed.substring(eqIndex + 1).trim()

          if (key === 'type') {
            currentRemote.type = value
          } else {
            currentRemote.options[key] = value
          }
        }
      }
    }

    if (currentRemote) {
      remotes.push(currentRemote)
    }

    return remotes
  }

  private serializeConfig(config: ConfigFile): string {
    const lines: string[] = []

    for (const remote of config.remotes) {
      lines.push(`[${remote.name}]`)
      lines.push(`type = ${remote.type}`)

      for (const [key, value] of Object.entries(remote.options)) {
        lines.push(`${key} = ${value}`)
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  private getDefaultConfigPaths(): string[] {
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA
      return [
        join(process.cwd(), 'rclone.conf'),
        appData ? join(appData, 'rclone', 'rclone.conf') : '',
        join(process.env.USERPROFILE || '', '.rclone.conf')
      ].filter(Boolean)
    }

    const home = process.env.HOME || ''
    const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, '.config')

    return [
      join(process.cwd(), 'rclone.conf'),
      join(xdgConfig, 'rclone', 'rclone.conf'),
      join(home, '.config', 'rclone', 'rclone.conf'),
      join(home, '.rclone.conf')
    ]
  }

  private getDefaultConfigDir(): string {
    if (process.platform === 'win32') {
      return process.env.APPDATA
        ? join(process.env.APPDATA, 'rclone')
        : join(process.env.USERPROFILE || '', '.rclone')
    }

    const xdgConfig = process.env.XDG_CONFIG_HOME || join(process.env.HOME || '', '.config')
    return join(xdgConfig, 'rclone')
  }
}
