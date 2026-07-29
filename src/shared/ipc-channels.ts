export const IPC_CHANNELS = {
  // Rclone operations
  RCLONE_EXECUTE: 'rclone:execute',
  RCLONE_EXECUTE_STREAM: 'rclone:execute-stream',
  RCLONE_STOP: 'rclone:stop',
  RCLONE_VERSION: 'rclone:version',
  RCLONE_LIST_REMOTES: 'rclone:list-remotes',
  RCLONE_STATS: 'rclone:stats',
  RCLONE_START_RCD: 'rclone:start-rcd',
  RCLONE_STOP_RCD: 'rclone:stop-rcd',
  RCLONE_ABOUT: 'rclone:about',
  RCLONE_SELFUPDATE: 'rclone:selfupdate',

  // Config operations
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
  CONFIG_CREATE_REMOTE: 'config:create-remote',
  CONFIG_UPDATE_REMOTE: 'config:update-remote',
  CONFIG_DELETE_REMOTE: 'config:delete-remote',
  CONFIG_RENAME_REMOTE: 'config:rename-remote',
  CONFIG_COPY_REMOTE: 'config:copy-remote',
  CONFIG_TEST_REMOTE: 'config:test-remote',
  CONFIG_FIND: 'config:find',
  CONFIG_GET_PATH: 'config:get-path',
  CONFIG_BACKUP: 'config:backup',
  CONFIG_RESTORE: 'config:restore',
  CONFIG_OBSCURE: 'config:obscure',

  // Dialog operations
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
  DIALOG_OPEN_DIRECTORY: 'dialog:open-directory',
  DIALOG_MESSAGE: 'dialog:message',

  // File system operations
  FS_READ_DIR: 'fs:read-dir',
  FS_GET_INFO: 'fs:get-info',
  FS_EXISTS: 'fs:exists',
  FS_MKDIR: 'fs:mkdir',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_RENAME: 'fs:rename',
  FS_COPY: 'fs:copy',
  FS_DELETE: 'fs:delete',
  FS_GET_DISK_SPACE: 'fs:get-disk-space',

  // Dialog operations
  APP_BROWSE_FOLDER: 'app:browse-folder',
  APP_BROWSE_FILE: 'app:browse-file',

  // App operations
  APP_GET_VERSION: 'app:get-version',
  APP_GET_SETTINGS: 'app:get-settings',
  APP_SET_SETTINGS: 'app:set-settings',
  APP_GET_RCLONE_PATH: 'app:get-rclone-path',
  APP_SET_RCLONE_PATH: 'app:set-rclone-path',
  APP_FIND_RCLONE: 'app:find-rclone',
  APP_TEST_RCLONE: 'app:test-rclone',
  APP_GET_CONFIG_PATH: 'app:get-config-path',
  APP_OPEN_EXTERNAL: 'app:open-external',
  APP_OPEN_LOG_FOLDER: 'app:open-log-folder',
  APP_GET_LOG_DIR: 'app:get-log-dir',
  APP_GET_SETUP_STATUS: 'app:get-setup-status',
  APP_COMPLETE_SETUP: 'app:complete-setup',
  APP_EXPORT_SETTINGS: 'app:export-settings',
  APP_IMPORT_SETTINGS: 'app:import-settings',
  APP_NOTIFY: 'app:notify',
  APP_CLEAR_LOGS: 'app:clear-logs',

  // Mount operations
  MOUNT_MOUNT: 'mount:mount',
  MOUNT_UNMOUNT: 'mount:unmount',
  MOUNT_LIST: 'mount:list',
  MOUNT_LIST_ACTIVE: 'mount:list-active',
  MOUNT_CHECK_WINFSP: 'mount:check-winfsp',
  MOUNT_FIND_WINFSP: 'mount:find-winfsp',

  // Job operations
  JOB_LIST: 'job:list',
  JOB_STOP: 'job:stop',
  JOB_PAUSE: 'job:pause',
  JOB_RESUME: 'job:resume',

  // Sync Profile operations
  PROFILE_LIST: 'profile:list',
  PROFILE_SAVE: 'profile:save',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_DUPLICATE: 'profile:duplicate',
  PROFILE_RUN: 'profile:run',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',

  // Schedule operations
  SCHEDULE_LIST: 'schedule:list',
  SCHEDULE_SAVE: 'schedule:save',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_TOGGLE: 'schedule:toggle',
  SCHEDULE_RUN_NOW: 'schedule:run-now',

  // Event channels (main -> renderer)
  EVENT_RCLONE_OUTPUT: 'event:rclone-output',
  EVENT_RCLONE_STATS: 'event:rclone-stats',
  EVENT_RCLONE_EXIT: 'event:rclone-exit',
  EVENT_LOG: 'event:log',
  EVENT_SCHEDULE_TRIGGERED: 'event:schedule-triggered',
  EVENT_SCHEDULE_UPDATED: 'event:schedule-updated',

  // App behavior
  APP_SET_AUTO_LAUNCH: 'app:set-auto-launch',
  APP_SET_MINIMIZE_TO_TRAY: 'app:set-minimize-to-tray',
  APP_BROWSE_BACKUP_PATH: 'app:browse-backup-path'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
