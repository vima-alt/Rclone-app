export interface RcloneVersion {
  version: string
  os: string
  arch: string
  goVersion: string
  isGit: boolean
  buildDate: string
  features: string[]
}

export interface RemoteConfig {
  name: string
  type: string
  options: Record<string, string>
}

export interface ConfigFile {
  remotes: RemoteConfig[]
  path: string
  raw: string
}

export interface RcloneExecuteArgs {
  command: string
  source?: string
  destination?: string
  flags?: Record<string, string | boolean | number>
  positionalArgs?: string[]
  configPath?: string
  rawArgs?: string[]
}

export interface RcloneExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

export interface RcloneStats {
  bytes: number
  speed: number
  totalBytes: number
  totalTransfers: number
  transfers: number
  eta: number | null
  elapsedTime: number
  errors: number
  fatalError: boolean
  retryError: boolean
  lastError: string
  checks: number
  totalChecks: number
  deletes: number
  deletedDirs: number
  renames: number
  listed: number
  serverSideCopies: number
  serverSideCopyBytes: number
  serverSideMoves: number
  serverSideMoveBytes: number
  transferTime: number
  transferring: RcloneTransferring[]
  checking: string[]
}

export interface RcloneTransferring {
  bytes: number
  eta: number | null
  name: string
  percentage: number
  speed: number
  speedAvg: number
  size: number
}

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface Job {
  id: string
  command: string
  args: string[]
  source: string
  destination: string
  status: JobStatus
  stats: RcloneStats | null
  startTime: number
  endTime?: number
  error?: string
  logs: string[]
  profileId?: string
  logFile?: string
}

export interface MountInfo {
  remote: string
  mountPoint: string
  type: string
  options: Record<string, string>
  pid?: number
}

export interface SyncProfile {
  id: string
  name: string
  description: string
  source: string
  sources?: string[]
  destination: string
  command: string
  flags: Record<string, string | boolean | number>
  filters: FilterRule[]
  schedule?: ScheduleConfig
  notifications: boolean
  enabled: boolean
  tags: string[]
  lastRun?: number
  lastStatus?: 'success' | 'failed' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface FilterRule {
  id: string
  type: 'include' | 'exclude' | 'filter'
  pattern: string
  enabled: boolean
}

export interface ScheduleConfig {
  enabled: boolean
  type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron' | 'interval' | 'startup' | 'idle' | 'after'
  cron?: string
  intervalMinutes?: number
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
  wakeComputer?: boolean
  retryOnFailure?: boolean
  maxRetries?: number
}

export interface ScheduledTask {
  id: string
  name?: string
  profileId: string
  profileName: string
  schedule: ScheduleConfig
  enabled: boolean
  lastRun?: number
  nextRun?: number
  lastStatus?: 'success' | 'failed' | 'cancelled'
  runCount: number
  nextScheduleId?: string
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  rclonePath: string
  configPath: string
  theme: 'light' | 'dark' | 'system'
  uiMode: 'basic' | 'advanced' | 'expert'
  language: string
  defaultTransfers: number
  defaultCheckers: number
  defaultBufferSize: string
  defaultBandwidthLimit: string
  logLevel: string
  logToFile: boolean
  logFilePath: string
  notifications: boolean
  autoUpdate: boolean
  tempDir: string
  windowBounds: { width: number; height: number; x?: number; y?: number }
  sidebarCollapsed: boolean
  setupComplete: boolean
  preserveRemotePasswords: boolean
  defaultDedupMode: string
  defaultSyncMode: string
  autoMountOnStart: boolean
  recentCommands: string[]
  commandPresets: CommandPreset[]
  winfspPath?: string
  winfspSkipped?: boolean
  fontSize?: number
  compactMode?: boolean
  logMaxSizeMB?: number
  autoLaunch?: boolean
  minimizeToTray?: boolean
  backupPath?: string
}

export interface CommandPreset {
  id: string
  name: string
  description: string
  command: string
  args: string
  createdAt: number
}

export interface FileEntry {
  name: string
  path: string
  size: number
  modTime: string
  isDir: boolean
  mimeType?: string
  hash?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface BackendOption {
  name: string
  displayName: string
  type: 'string' | 'bool' | 'int' | 'float' | 'enum' | 'password' | 'secret'
  description: string
  required: boolean
  default?: string | number | boolean
  enumValues?: { label: string; value: string }[]
  advanced: boolean
  category?: string
  sensitive?: boolean
  placeholder?: string
  tooltip?: string
  recommended?: string
  warning?: string
}

export interface BackendDefinition {
  name: string
  displayName: string
  description: string
  category: string
  tier: 'core' | 'stable' | 'supported' | 'experimental'
  options: BackendOption[]
  oauth?: {
    required: boolean
    authUrl?: string
    tokenUrl?: string
    scopes?: string[]
  }
  features: {
    hashTypes: string[]
    readOnly: boolean
    writeOnly: boolean
    caseInsensitive: boolean
    caseSensitive: boolean
    duplicateFiles: boolean
    serverSideCopy: boolean
    serverSideMove: boolean
  }
}

export interface CommandDefinition {
  name: string
  description: string
  category: string
  usesSource: boolean
  usesDestination: boolean
  subcommands?: string[]
  commonFlags: string[]
  advancedFlags: string[]
  helpUrl?: string
  examples?: string[]
}

export interface FlagDefinition {
  name: string
  short?: string
  type: 'string' | 'bool' | 'int' | 'float' | 'SizeSuffix' | 'Duration' | 'BwTimetable'
  default?: string | number | boolean
  description: string
  category: string
  level: 'basic' | 'advanced' | 'expert'
  placeholder?: string
  tooltip?: string
  recommended?: string
  warning?: string
  conflictsWith?: string[]
  requires?: string[]
}

export interface TerminalLine {
  id: number
  timestamp: number
  stream: 'stdout' | 'stderr' | 'system'
  content: string
  ansiClasses?: string[]
}

export interface RcloneSetupStatus {
  found: boolean
  path: string | null
  version: string | null
  configFound: boolean
  configPath: string | null
}
