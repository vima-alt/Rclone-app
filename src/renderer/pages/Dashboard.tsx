import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRemoteStore } from '@/stores/remote.store'
import { useJobStore } from '@/stores/job.store'
import { useAppStore } from '@/stores/app.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { formatBytes } from '@/lib/utils'
import {
  HardDrive, FolderOpen, ArrowUpDown, Terminal, Plus, Zap, Activity,
  CheckCircle2, XCircle, Clock, Settings, Mountain, RefreshCw,
  Calendar, Shield, Server, Wifi, BarChart3, ExternalLink, Upload
} from 'lucide-react'

interface ActivityEvent {
  id: string
  type: 'remote_created' | 'remote_deleted' | 'transfer_completed' | 'transfer_failed' | 'schedule_triggered'
  message: string
  timestamp: number
}

interface DiskSpace {
  total: number
  free: number
  used: number
}

interface RcloneAbout {
  total?: number
  used?: number
  free?: number
  trash?: number
}

export default function Dashboard() {
  const remotes = useRemoteStore(s => s.remotes)
  const loadRemotes = useRemoteStore(s => s.loadRemotes)
  const jobs = useJobStore(s => s.jobs)
  const settings = useAppStore(s => s)
  const schedules = useScheduleStore(s => s.tasks)
  const loadSchedules = useScheduleStore(s => s.loadTasks)

  const [rcloneVersion, setRcloneVersion] = useState('')
  const [configPath, setConfigPath] = useState('')
  const [platform, setPlatform] = useState('')
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
  const [rcloneAbout, setRcloneAbout] = useState<RcloneAbout | null>(null)
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null)

  const runningJobs = jobs.filter(j => j.status === 'running')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')
  const queuedJobs = jobs.filter(j => j.status === 'queued')

  const activeTransfers = runningJobs.reduce((sum, job) => {
    return sum + (job.stats?.transfers ?? 0)
  }, 0)

  const totalTransferProgress = runningJobs.length > 0
    ? runningJobs.reduce((sum, job) => {
        const bytes = job.stats?.bytes ?? 0
        const total = job.stats?.totalBytes ?? 0
        return sum + (total > 0 ? (bytes / total) * 100 : 0)
      }, 0) / runningJobs.length
    : 0

  const enabledSchedules = schedules.filter(s => s.enabled)
  const nextScheduledRun = enabledSchedules
    .filter(s => s.nextRun && s.nextRun > Date.now())
    .sort((a, b) => (a.nextRun ?? Infinity) - (b.nextRun ?? Infinity))[0]

  const recentRemotes = [...remotes].slice(0, 5)

  const addActivity = useCallback((type: ActivityEvent['type'], message: string) => {
    setActivities(prev => {
      const event: ActivityEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        message,
        timestamp: Date.now()
      }
      return [event, ...prev].slice(0, 10)
    })
  }, [])

  useEffect(() => {
    window.electronAPI.rclone.version().then((result) => {
      try {
        const parsed = JSON.parse(result.stdout)
        setRcloneVersion(parsed.version || 'unknown')
      } catch {
        setRcloneVersion(result.stdout?.trim() || 'unknown')
      }
    }).catch(() => setRcloneVersion('Not found'))

    window.electronAPI.app.getConfigPath().then(setConfigPath).catch(() => setConfigPath(''))
    window.electronAPI.app.getVersion().catch(() => {})
    window.electronAPI.app.getSetupStatus().then((status: any) => {
      setPlatform(status?.platform || navigator.platform || '')
    }).catch(() => setPlatform(navigator.platform || ''))

    loadRemotes().catch(() => {})
    loadSchedules().catch(() => {})

    window.electronAPI.fs.getDiskSpace('C:\\').then(setDiskSpace).catch(() => {})
  }, [])

  useEffect(() => {
    const prev = { completed: completedJobs.length, failed: failedJobs.length }

    return () => {
      const currCompleted = useJobStore.getState().jobs.filter(j => j.status === 'completed').length
      const currFailed = useJobStore.getState().jobs.filter(j => j.status === 'failed').length

      if (currCompleted > prev.completed) {
        const newJobs = useJobStore.getState().jobs.filter(j => j.status === 'completed')
        if (newJobs.length > 0) {
          const job = newJobs[newJobs.length - 1]
          addActivity('transfer_completed', `${job.command} ${job.source} → ${job.destination}`)
        }
      }
      if (currFailed > prev.failed) {
        const newJobs = useJobStore.getState().jobs.filter(j => j.status === 'failed')
        if (newJobs.length > 0) {
          const job = newJobs[newJobs.length - 1]
          addActivity('transfer_failed', `${job.command} ${job.source} → ${job.destination}${job.error ? `: ${job.error}` : ''}`)
        }
      }
    }
  }, [completedJobs.length, failedJobs.length, addActivity])

  useEffect(() => {
    const prevRemotes = useRemoteStore.getState().remotes.length
    return () => {
      const currRemotes = useRemoteStore.getState().remotes
      if (currRemotes.length > prevRemotes) {
        const added = currRemotes[currRemotes.length - 1]
        addActivity('remote_created', `${added.name} (${added.type})`)
      } else if (currRemotes.length < prevRemotes) {
        addActivity('remote_deleted', 'A remote was removed')
      }
    }
  }, [remotes.length, addActivity])

  useEffect(() => {
    const prevSchedules = useScheduleStore.getState().tasks.filter(s => s.lastRun).length
    return () => {
      const currTasks = useScheduleStore.getState().tasks
      const currSchedules = currTasks.filter(s => s.lastRun).length
      if (currSchedules > prevSchedules) {
        const triggered = currTasks.filter(s => s.lastRun).sort((a, b) => (b.lastRun ?? 0) - (a.lastRun ?? 0))[0]
        if (triggered) {
          addActivity('schedule_triggered', `Schedule "${triggered.profileName}" triggered`)
        }
      }
    }
  }, [schedules, addActivity])

  const testConnection = async () => {
    setConnectionStatus('testing')
    try {
      const result = await window.electronAPI.rclone.version()
      if (result.exitCode === 0 && result.stdout) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch {
      setConnectionStatus('error')
    }
  }

  const fetchAbout = async () => {
    try {
      const result = await window.electronAPI.rclone.about(remotes.length > 0 ? remotes[0].name : '')
      try {
        setRcloneAbout(JSON.parse(result.stdout))
      } catch {
        setRcloneAbout(null)
      }
    } catch {
      setRcloneAbout(null)
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  }

  const activityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'remote_created': return <Plus className="h-3.5 w-3.5 text-blue-500" />
      case 'remote_deleted': return <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
      case 'transfer_completed': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      case 'transfer_failed': return <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
      case 'schedule_triggered': return <Calendar className="h-3.5 w-3.5 text-purple-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your Rclone setup</p>
        </div>
        <Badge variant={settings.rclonePath ? 'success' : 'warning'}>
          <Zap className="h-3 w-3 mr-1" />
          {settings.rclonePath ? 'Rclone Connected' : 'Rclone Not Configured'}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Remotes</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remotes.length}</div>
            <p className="text-xs text-muted-foreground">
              {remotes.filter(r => r.type === 'local').length} local, {remotes.length - remotes.filter(r => r.type === 'local').length} cloud
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Transfers</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{runningJobs.length}</div>
            {runningJobs.length > 0 ? (
              <>
                <Progress value={totalTransferProgress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{activeTransfers} active file{activeTransfers !== 1 ? 's' : ''}</span>
                  <span>{Math.round(totalTransferProgress)}%</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {queuedJobs.length} queued job{queuedJobs.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledSchedules.length}</div>
            <p className="text-xs text-muted-foreground">
              {nextScheduledRun
                ? `Next: ${formatTimeAgo(nextScheduledRun.nextRun!)}`
                : schedules.length > 0 ? 'No upcoming runs' : 'No schedules configured'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {diskSpace && diskSpace.total > 0 ? (
              <>
                <div className="text-2xl font-bold">{formatBytes(diskSpace.used)}</div>
                <Progress
                  value={diskSpace.total > 0 ? (diskSpace.used / diskSpace.total) * 100 : 0}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(diskSpace.free)} free</span>
                  <span>{formatBytes(diskSpace.total)} total</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Disk info unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Information + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rclone Version</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{rcloneVersion || 'Loading...'}</span>
                {rcloneVersion && rcloneVersion !== 'unknown' && rcloneVersion !== 'Not found' && (
                  <Badge variant="outline" className="text-[10px] cursor-pointer">
                    Check Update
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Executable Path</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate max-w-[260px]">{settings.rclonePath || 'Using PATH'}</span>
                {settings.rclonePath ? (
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" title="Found" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" title="Fallback" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Config Path</span>
              <span className="font-mono text-xs truncate max-w-[300px]" title={configPath}>
                {configPath || 'Not found'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">UI Mode</span>
              <Badge variant={
                settings.uiMode === 'expert' ? 'destructive' :
                settings.uiMode === 'advanced' ? 'default' : 'secondary'
              }>
                {settings.uiMode}
              </Badge>
            </div>
            {platform && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-mono text-xs">{platform}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/remotes/create">
                <Button variant="default" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Create Remote
                </Button>
              </Link>
              <Link to="/command-builder">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Terminal className="h-4 w-4" />
                  Command Builder
                </Button>
              </Link>
              <Link to="/explorer">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FolderOpen className="h-4 w-4" />
                  File Browser
                </Button>
              </Link>
              <Link to="/profiles">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Sync Profiles
                </Button>
              </Link>
              <Link to="/transfers">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Transfer Queue
                </Button>
              </Link>
              <Link to="/mounts">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Mountain className="h-4 w-4" />
                  Mount Manager
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed + Health Check */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActivities([])}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity. Actions will appear here as you work.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex-shrink-0">{activityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rclone Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection Status</span>
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <Badge variant="success">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge variant="destructive">
                    <Wifi className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
                {connectionStatus === 'testing' && (
                  <Badge variant="secondary">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Testing
                  </Badge>
                )}
                {connectionStatus === 'idle' && (
                  <Badge variant="outline">
                    <Wifi className="h-3 w-3 mr-1" />
                    Untested
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={testConnection} disabled={connectionStatus === 'testing'}>
                  <RefreshCw className={`h-3 w-3 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quota Information</span>
              <div className="flex items-center gap-2">
                {rcloneAbout ? (
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {formatBytes(rcloneAbout.used ?? 0)} / {formatBytes(rcloneAbout.total ?? 0)}
                    </p>
                    {rcloneAbout.total && (
                      <Progress
                        value={rcloneAbout.used && rcloneAbout.total ? (rcloneAbout.used / rcloneAbout.total) * 100 : 0}
                        className="h-1.5 mt-1 w-32"
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not fetched</span>
                )}
                <Button variant="ghost" size="sm" onClick={fetchAbout}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">{rcloneVersion || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Remotes */}
      {remotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Recent Remotes
            </CardTitle>
            <Link to="/remotes">
              <Button variant="ghost" size="sm">
                View All
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRemotes.map((remote) => (
                <Link key={remote.name} to={`/remotes/edit/${remote.name}`} className="block">
                  <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {remote.type === 'local' ? (
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{remote.name}</p>
                        <p className="text-xs text-muted-foreground">{remote.type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Configure
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
