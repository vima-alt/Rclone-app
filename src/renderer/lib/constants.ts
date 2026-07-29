export const APP_NAME = 'Rclone App'
export const APP_VERSION = '1.0.0'

export const RCLONE_COMMON_FLAGS = [
  'dry-run', 'progress', 'verbose', 'quiet', 'transfers', 'checkers',
  'bwlimit', 'max-transfer', 'max-duration', 'timeout', 'contimeout',
  'fast-list', 'checksum', 'update', 'ignore-times', 'size-only',
  'ignore-existing', 'delete-before', 'delete-during', 'delete-after',
  'backup-dir', 'track-renames', 'suffix', 'multi-thread-cutoff',
  'multi-thread-streams', 'multi-thread-chunk-size', 'metadata',
  'log-file', 'log-level', 'stats', 'stats-one-line', 'use-json-log'
] as const

export const RCLONE_FILTER_FLAGS = [
  'exclude', 'include', 'filter', 'exclude-from', 'include-from',
  'filter-from', 'min-age', 'max-age', 'min-size', 'max-size'
] as const

export const RCLONE_UI_MODES = ['basic', 'advanced', 'expert'] as const

export const LOG_LEVELS = ['DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR'] as const

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const
