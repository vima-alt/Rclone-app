import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface MountEntry {
  id: string
  remote: string
  mountPoint: string
  type: string
  status: 'mounted' | 'error' | 'unmounted'
  pid?: number
}

export class MountService {
  private filePath: string
  private mounts: MountEntry[] = []

  constructor() {
    this.filePath = join(app.getPath('userData'), 'mounts.json')
    this.load()
  }

  list(): MountEntry[] {
    return [...this.mounts]
  }

  add(mount: MountEntry): void {
    this.mounts.push(mount)
    this.persist()
  }

  remove(id: string): void {
    this.mounts = this.mounts.filter(m => m.id !== id)
    this.persist()
  }

  updateStatus(id: string, status: MountEntry['status']): void {
    const mount = this.mounts.find(m => m.id === id)
    if (mount) {
      mount.status = status
      this.persist()
    }
  }

  verifyMounts(): MountEntry[] {
    const verified: MountEntry[] = []
    for (const mount of this.mounts) {
      if (mount.status === 'error') {
        mount.status = 'unmounted'
      }
      verified.push(mount)
    }
    this.mounts = verified
    this.persist()
    return this.list()
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      this.mounts = []
      return
    }
    try {
      this.mounts = JSON.parse(readFileSync(this.filePath, 'utf-8'))
      for (const m of this.mounts) {
        if (m.status === 'mounted') m.status = 'unmounted'
      }
    } catch {
      this.mounts = []
    }
  }

  private persist(): void {
    writeFileSync(this.filePath, JSON.stringify(this.mounts, null, 2), 'utf-8')
  }
}
