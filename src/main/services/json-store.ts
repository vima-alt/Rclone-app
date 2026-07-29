import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export class JsonStore<T extends Record<string, any>> {
  private filePath: string
  private data: T

  constructor(options: { name: string; defaults: T }) {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.filePath = join(dir, `${options.name}.json`)
    this.data = this.load(options.defaults)
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value
    this.persist()
  }

  get store(): T {
    return { ...this.data }
  }

  private load(defaults: T): T {
    if (!existsSync(this.filePath)) return { ...defaults }

    try {
      const content = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(content)
      return { ...defaults, ...parsed }
    } catch {
      return { ...defaults }
    }
  }

  private persist(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }
}
