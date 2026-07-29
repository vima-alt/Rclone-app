declare module 'electron-updater' {
  import { EventEmitter } from 'events'

  interface UpdateInfo {
    version: string
    files: Array<{ url: string; sha512: string }>
    releaseDate: string
    releaseNotes?: string
  }

  interface UpdateCheckResult {
    updateInfo: UpdateInfo
    downloadPromise?: Promise<any>
    cancellationToken?: any
  }

  class AutoUpdater extends EventEmitter {
    autoDownload: boolean
    autoInstallOnAppQuit: boolean
    checkForUpdates(): Promise<UpdateCheckResult | null>
    checkForUpdatesAndNotify(): Promise<UpdateCheckResult | null>
    downloadUpdate(cancellationToken?: any): Promise<any>
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
    on(event: 'checking-for-update', listener: () => void): this
    on(event: 'update-available', listener: (info: UpdateInfo) => void): this
    on(event: 'update-not-available', listener: (info: UpdateInfo) => void): this
    on(event: 'error', listener: (error: Error) => void): this
    on(event: 'download-progress', listener: (progress: any) => void): this
    on(event: 'update-downloaded', listener: (info: UpdateInfo) => void): this
  }

  export const autoUpdater: AutoUpdater
}
