import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import type { SyncProfile } from '../../shared/types'

export class ProfileService {
  private filePath: string
  private profiles: SyncProfile[] = []

  constructor() {
    this.filePath = join(app.getPath('userData'), 'profiles.json')
    this.load()
  }

  list(): SyncProfile[] {
    return [...this.profiles]
  }

  getById(id: string): SyncProfile | undefined {
    return this.profiles.find(p => p.id === id)
  }

  save(profile: Omit<SyncProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SyncProfile {
    const now = Date.now()

    if (profile.id) {
      const index = this.profiles.findIndex(p => p.id === profile.id)
      if (index === -1) throw new Error(`Profile "${profile.id}" not found`)

      const updated: SyncProfile = {
        ...this.profiles[index],
        ...profile,
        updatedAt: now
      }
      this.profiles[index] = updated
      this.persist()
      return updated
    }

    const newProfile: SyncProfile = {
      ...profile,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    } as SyncProfile

    this.profiles.push(newProfile)
    this.persist()
    return newProfile
  }

  delete(id: string): boolean {
    const index = this.profiles.findIndex(p => p.id === id)
    if (index === -1) return false

    this.profiles.splice(index, 1)
    this.persist()
    return true
  }

  duplicate(id: string, newName?: string): SyncProfile | undefined {
    const source = this.getById(id)
    if (!source) return undefined

    const now = Date.now()
    const copy: SyncProfile = {
      ...source,
      id: randomUUID(),
      name: newName || `${source.name} (copy)`,
      filters: source.filters.map(f => ({ ...f, id: randomUUID() })),
      lastRun: undefined,
      lastStatus: undefined,
      createdAt: now,
      updatedAt: now
    }

    this.profiles.push(copy)
    this.persist()
    return copy
  }

  exportProfiles(ids?: string[]): SyncProfile[] {
    if (ids && ids.length > 0) {
      return this.profiles.filter(p => ids.includes(p.id))
    }
    return this.list()
  }

  importProfiles(profiles: SyncProfile[]): { imported: number; skipped: number } {
    let imported = 0
    let skipped = 0
    const now = Date.now()

    for (const profile of profiles) {
      const existing = this.profiles.find(p => p.name === profile.name)
      if (existing) {
        skipped++
        continue
      }

      const importedProfile: SyncProfile = {
        ...profile,
        id: randomUUID(),
        filters: profile.filters.map(f => ({ ...f, id: randomUUID() })),
        lastRun: undefined,
        lastStatus: undefined,
        createdAt: now,
        updatedAt: now
      }

      this.profiles.push(importedProfile)
      imported++
    }

    if (imported > 0) {
      this.persist()
    }

    return { imported, skipped }
  }

  exportToFile(filePath: string, ids?: string[]): void {
    const profiles = this.exportProfiles(ids)
    writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf-8')
  }

  importFromFile(filePath: string): { imported: number; skipped: number } {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

    const content = readFileSync(filePath, 'utf-8')
    const profiles = JSON.parse(content) as SyncProfile[]

    if (!Array.isArray(profiles)) {
      throw new Error('Invalid profile file format')
    }

    return this.importProfiles(profiles)
  }

  async runProfile(_id: string, _window: Electron.BrowserWindow): Promise<void> {
    const profile = this.getById(_id)
    if (!profile) throw new Error(`Profile "${_id}" not found`)
    // Profile execution is handled by the renderer through the command system
  }

  exportProfile(id: string, filePath: string): void {
    const profile = this.getById(id)
    if (!profile) throw new Error(`Profile "${id}" not found`)
    writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8')
  }

  importProfile(filePath: string): SyncProfile {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)
    const content = readFileSync(filePath, 'utf-8')
    const profile = JSON.parse(content) as SyncProfile
    const result = this.importProfiles([profile])
    if (result.imported === 0) throw new Error('Profile already exists or is invalid')
    const profiles = this.list()
    return profiles[profiles.length - 1]
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      this.profiles = []
      return
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8')
      this.profiles = JSON.parse(content)
    } catch {
      this.profiles = []
    }
  }

  private persist(): void {
    writeFileSync(this.filePath, JSON.stringify(this.profiles, null, 2), 'utf-8')
  }

  updateRunStatus(id: string, status: 'success' | 'failed' | 'cancelled'): void {
    const profile = this.getById(id)
    if (!profile) return
    profile.lastRun = Date.now()
    profile.lastStatus = status
    this.persist()
  }
}
