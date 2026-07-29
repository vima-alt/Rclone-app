import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

const electronAPI = {
  // Rclone
  rclone: {
    execute: (args: any) => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_EXECUTE, args),
    executeStream: (jobData: any, args: any) => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_EXECUTE_STREAM, jobData, args),
    stop: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_STOP, jobId),
    version: () => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_VERSION),
    listRemotes: () => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_LIST_REMOTES),
    startRcd: () => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_START_RCD),
    stopRcd: () => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_STOP_RCD),
    about: (remote: string) => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_ABOUT, remote),
    selfupdate: (stable: boolean) => ipcRenderer.invoke(IPC_CHANNELS.RCLONE_SELFUPDATE, stable),
    onOutput: (callback: (data: { jobId: string; stream: string; data: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.EVENT_RCLONE_OUTPUT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_RCLONE_OUTPUT, handler)
    },
    onStats: (callback: (data: { jobId: string; stats: any }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.EVENT_RCLONE_STATS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_RCLONE_STATS, handler)
    },
    onExit: (callback: (data: { jobId: string; exitCode: number; error?: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.EVENT_RCLONE_EXIT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_RCLONE_EXIT, handler)
    }
  },

  // Config
  config: {
    read: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_READ),
    write: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_WRITE, config),
    createRemote: (remote: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_CREATE_REMOTE, remote),
    updateRemote: (name: string, remote: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_UPDATE_REMOTE, name, remote),
    deleteRemote: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_DELETE_REMOTE, name),
    renameRemote: (oldName: string, newName: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_RENAME_REMOTE, oldName, newName),
    copyRemote: (sourceName: string, destName: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_COPY_REMOTE, sourceName, destName),
    testRemote: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_TEST_REMOTE, name),
    find: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_FIND),
    getPath: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_PATH),
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_BACKUP),
    restore: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_RESTORE, path),
    obscure: (password: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_OBSCURE, password)
  },

  // Dialog
  dialog: {
    openFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
    saveFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
    openDirectory: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, options),
    message: (options: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_MESSAGE, options)
  },

  // File system
  fs: {
    readDir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIR, path),
    getInfo: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_INFO, path),
    exists: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_EXISTS, path),
    mkdir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_MKDIR, path),
    readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME, oldPath, newPath),
    copy: (source: string, dest: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_COPY, source, dest),
    delete: (path: string, recursive?: boolean) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE, path, recursive),
    getDiskSpace: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_DISK_SPACE, path)
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SETTINGS),
    setSettings: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.APP_SET_SETTINGS, settings),
    getRclonePath: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_RCLONE_PATH),
    setRclonePath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_SET_RCLONE_PATH, path),
    findRclone: () => ipcRenderer.invoke(IPC_CHANNELS.APP_FIND_RCLONE),
    testRclone: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_TEST_RCLONE, path),
    getConfigPath: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_CONFIG_PATH),
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
    openLogFolder: () => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_LOG_FOLDER),
    clearLogs: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CLEAR_LOGS),
    getLogDir: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_LOG_DIR),
    getSetupStatus: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SETUP_STATUS),
    completeSetup: () => ipcRenderer.invoke(IPC_CHANNELS.APP_COMPLETE_SETUP),
    exportSettings: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_EXPORT_SETTINGS, path),
    importSettings: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_IMPORT_SETTINGS, path),
    notify: (title: string, body: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_NOTIFY, title, body),
    browseFolder: (options?: { defaultPath?: string; type?: 'folder' | 'file' | 'both' }) => ipcRenderer.invoke(IPC_CHANNELS.APP_BROWSE_FOLDER, options),
    browseFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke(IPC_CHANNELS.APP_BROWSE_FILE, options),
    setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.APP_SET_AUTO_LAUNCH, enabled),
    setMinimizeToTray: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.APP_SET_MINIMIZE_TO_TRAY, enabled),
    browseBackupPath: (options?: { defaultPath?: string }) => ipcRenderer.invoke(IPC_CHANNELS.APP_BROWSE_BACKUP_PATH, options)
  },

  // Jobs
  jobs: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.JOB_LIST),
    stop: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_STOP, jobId),
    pause: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_PAUSE, jobId),
    resume: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_RESUME, jobId)
  },

  // Mount operations
  mount: {
    checkWinFsp: () => ipcRenderer.invoke(IPC_CHANNELS.MOUNT_CHECK_WINFSP),
    findWinFsp: () => ipcRenderer.invoke(IPC_CHANNELS.MOUNT_FIND_WINFSP),
    listActive: () => ipcRenderer.invoke(IPC_CHANNELS.MOUNT_LIST_ACTIVE),
    doMount: (args: any) => ipcRenderer.invoke(IPC_CHANNELS.MOUNT_MOUNT, args),
    doUnmount: (args: any) => ipcRenderer.invoke(IPC_CHANNELS.MOUNT_UNMOUNT, args)
  },

  // Sync Profiles
  profiles: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LIST),
    save: (profile: any) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SAVE, profile),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, id),
    duplicate: (id: string, newName: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DUPLICATE, id, newName),
    run: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_RUN, id),
    export: (id: string, path: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPORT, id, path),
    import: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT, path)
  },

  // Schedules
  schedules: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_LIST),
    save: (schedule: any) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_SAVE, schedule),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_DELETE, id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TOGGLE, id, enabled),
    runNow: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_RUN_NOW, id),
    onUpdate: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(IPC_CHANNELS.EVENT_SCHEDULE_UPDATED, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_SCHEDULE_UPDATED, handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
