/// <reference types="vite/client" />

interface ElectronAPI {
  rclone: {
    execute: (args: any) => Promise<any>
    executeStream: (jobData: { id: string; command: string; args: string[]; source: string; destination: string; logFile?: string }, args: any) => Promise<any>
    stop: (jobId: string) => Promise<boolean>
    version: () => Promise<any>
    listRemotes: () => Promise<any>
    startRcd: () => Promise<any>
    stopRcd: () => Promise<any>
    about: (remote: string) => Promise<any>
    selfupdate: (stable: boolean) => Promise<any>
    onOutput: (callback: (data: { jobId: string; stream: string; data: string }) => void) => () => void
    onStats: (callback: (data: { jobId: string; stats: any }) => void) => () => void
    onExit: (callback: (data: { jobId: string; exitCode: number; error?: string }) => void) => () => void
  }
  config: {
    read: () => Promise<any>
    write: (config: any) => Promise<any>
    createRemote: (remote: any) => Promise<any>
    updateRemote: (name: string, remote: any) => Promise<any>
    deleteRemote: (name: string) => Promise<any>
    renameRemote: (oldName: string, newName: string) => Promise<any>
    copyRemote: (sourceName: string, destName: string) => Promise<any>
    testRemote: (name: string) => Promise<any>
    find: () => Promise<string | null>
    getPath: () => Promise<string>
    backup: () => Promise<string>
    restore: (path: string) => Promise<any>
    obscure: (password: string) => Promise<string>
  }
  dialog: {
    openFile: (options?: any) => Promise<string[] | null>
    saveFile: (options?: any) => Promise<string | null>
    openDirectory: (options?: any) => Promise<string | null>
    message: (options: any) => Promise<any>
  }
  fs: {
    readDir: (path: string) => Promise<any[]>
    getInfo: (path: string) => Promise<any>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string) => Promise<any>
    readFile: (path: string) => Promise<string | null>
    writeFile: (path: string, content: string) => Promise<any>
    rename: (oldPath: string, newPath: string) => Promise<any>
    copy: (source: string, dest: string) => Promise<any>
    delete: (path: string, recursive?: boolean) => Promise<any>
    getDiskSpace: (path: string) => Promise<{ total: number; free: number; used: number }>
  }
  app: {
    getVersion: () => Promise<string>
    getSettings: () => Promise<any>
    setSettings: (settings: any) => Promise<any>
    getRclonePath: () => Promise<string>
    setRclonePath: (path: string) => Promise<any>
    findRclone: () => Promise<string | null>
    testRclone: (path: string) => Promise<any>
    getConfigPath: () => Promise<string>
    openExternal: (url: string) => Promise<any>
    openLogFolder: () => Promise<any>
    clearLogs: () => Promise<{ success: boolean; count: number }>
    getLogDir: () => Promise<string>
    getSetupStatus: () => Promise<any>
    completeSetup: () => Promise<any>
    exportSettings: (path: string) => Promise<any>
    importSettings: (path: string) => Promise<any>
    notify: (title: string, body: string) => Promise<any>
    browseFolder: (options?: { defaultPath?: string; type?: 'folder' | 'file' | 'both' }) => Promise<{ canceled: boolean; filePaths: string[] }>
    browseFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{ canceled: boolean; filePaths: string[] }>
    setAutoLaunch: (enabled: boolean) => Promise<any>
    setMinimizeToTray: (enabled: boolean) => Promise<any>
    browseBackupPath: (options?: { defaultPath?: string }) => Promise<{ canceled: boolean; filePaths: string[] }>
  }
  jobs: {
    list: () => Promise<any[]>
    stop: (jobId: string) => Promise<boolean>
    pause: (jobId: string) => Promise<any>
    resume: (jobId: string) => Promise<any>
  }
  profiles: {
    list: () => Promise<any[]>
    save: (profile: any) => Promise<any>
    delete: (id: string) => Promise<any>
    duplicate: (id: string, newName: string) => Promise<any>
    run: (id: string) => Promise<any>
    export: (id: string, path: string) => Promise<any>
    import: (path: string) => Promise<any>
  }
  schedules: {
    list: () => Promise<any[]>
    save: (schedule: any) => Promise<any>
    delete: (id: string) => Promise<any>
    toggle: (id: string, enabled: boolean) => Promise<any>
    runNow: (id: string) => Promise<any>
    onUpdate: (callback: () => void) => () => void
  }
  mount: {
    checkWinFsp: () => Promise<{ installed: boolean; path: string | null }>
    findWinFsp: () => Promise<string | null>
    listActive: () => Promise<any[]>
    doMount: (args: { remote: string; mountPoint: string; type: string; flags: Record<string, any> }) => Promise<{ exitCode: number; pid?: number }>
    doUnmount: (args: { remote: string; mountPoint: string; pid?: number }) => Promise<{ success: boolean; error?: string }>
  }
}

interface Window {
  electronAPI: ElectronAPI
}
