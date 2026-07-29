import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScheduleStore } from '@/stores/schedule.store'
import { useProfileStore } from '@/stores/profile.store'

import { Calendar, Clock, Play, Trash2, Plus, Settings, RefreshCw, Timer, AlertCircle, CheckCircle2, XCircle, Zap, Repeat } from 'lucide-react'
import type { ScheduledTask, ScheduleConfig } from '../../../shared/types'

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  interval: 'Interval',
  startup: 'On Startup',
  idle: 'On Idle',
  after: 'After'
}

const SCHEDULE_TYPE_ICONS: Record<string, React.ReactNode> = {
  hourly: <Repeat className="h-4 w-4" />,
  daily: <Clock className="h-4 w-4" />,
  weekly: <Calendar className="h-4 w-4" />,
  monthly: <Calendar className="h-4 w-4" />,
  interval: <Timer className="h-4 w-4" />,
  startup: <Zap className="h-4 w-4" />,
  idle: <Timer className="h-4 w-4" />,
  after: <Play className="h-4 w-4" />
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


function createEmptyTask(profileId: string, profileName: string): ScheduledTask {
  return {
    id: '',
    name: '',
    profileId,
    profileName,
    schedule: { enabled: true, type: 'daily', time: '00:00' },
    enabled: true,
    runCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function formatSchedule(schedule: ScheduleConfig): string {
  switch (schedule.type) {
    case 'hourly':
      return `Every ${schedule.time || '60'} minutes`
    case 'daily':
      return `Daily at ${schedule.time || '00:00'}`
    case 'weekly':
      return `${WEEKDAY_NAMES[schedule.dayOfWeek ?? 0]} at ${schedule.time || '00:00'}`
    case 'monthly':
      return `Day ${schedule.dayOfMonth ?? 1} at ${schedule.time || '00:00'}`
    case 'cron':
      return schedule.cron || '(no cron expression)'
    case 'interval':
      const mins = schedule.intervalMinutes ?? 60
      if (mins < 60) return `Every ${mins} minutes`
      if (mins === 60) return 'Every hour'
      if (mins < 1440) return `Every ${mins / 60} hours`
      return `Every ${mins / 1440} days`
    case 'startup':
      return 'On application startup'
    case 'idle':
      return 'When computer is idle'
    case 'after':
      return 'After another schedule'
    default:
      return schedule.type
  }
}

function formatTimestamp(ts?: number): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function computeNextRuns(schedule: ScheduleConfig, count: number): Date[] {
  const runs: Date[] = []
  const now = new Date()

  if (schedule.type === 'startup' || schedule.type === 'idle' || schedule.type === 'after') return []

  if (schedule.type === 'interval') {
    const interval = schedule.intervalMinutes ?? 60
    let next = new Date(now)
    next.setMinutes(next.getMinutes() + interval)
    next.setSeconds(0, 0)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next.getTime() + interval * 60000)
    }
    return runs
  }

  if (schedule.type === 'hourly') {
    const interval = parseInt(schedule.time || '60', 10) || 60
    let next = new Date(now)
    next.setMinutes(next.getMinutes() + interval)
    next.setSeconds(0, 0)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next.getTime() + interval * 60000)
    }
    return runs
  }

  const [hours, minutes] = (schedule.time || '00:00').split(':').map(Number)

  if (schedule.type === 'daily') {
    let next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next.getTime() + 86400000)
    }
    return runs
  }

  if (schedule.type === 'weekly') {
    const targetDay = schedule.dayOfWeek ?? 0
    let next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    let daysAhead = targetDay - next.getDay()
    if (daysAhead < 0 || (daysAhead === 0 && next <= now)) daysAhead += 7
    next.setDate(next.getDate() + daysAhead)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next.getTime() + 7 * 86400000)
    }
    return runs
  }

  if (schedule.type === 'monthly') {
    const targetDay = Math.min(schedule.dayOfMonth ?? 1, 28)
    let next = new Date(now)
    next.setDate(targetDay)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) next.setMonth(next.getMonth() + 1)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next)
      next.setMonth(next.getMonth() + 1)
    }
    return runs
  }

  if (schedule.type === 'cron' && schedule.cron) {
    let next = new Date(now)
    next.setSeconds(0, 0)
    next.setMinutes(next.getMinutes() + 1)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(next))
      next = new Date(next.getTime() + 3600000)
    }
    return runs
  }

  return runs
}

export default function SchedulerPage() {
  const { tasks, loading, loadTasks, saveTask, deleteTask, toggleTask, runNow, subscribeToUpdates } = useScheduleStore()
  const { profiles, loadProfiles } = useProfileStore()

  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduledTask>(createEmptyTask('', ''))
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
    loadProfiles()
    const unsubscribe = subscribeToUpdates()
    return unsubscribe
  }, [loadTasks, loadProfiles, subscribeToUpdates])

  const profileMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; command: string }>()
    for (const p of profiles) m.set(p.id, p)
    return m
  }, [profiles])

  const calendarMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { year, month, firstDay, daysInMonth }
  }, [])

  const calendarRuns = useMemo(() => {
    const map = new Map<number, Set<string>>()
    const taskMap = new Map<number, ScheduledTask[]>()
    for (const task of tasks) {
      if (!task.enabled || !task.schedule.enabled) continue
      
      // For high-frequency schedules, generate enough runs to cover the month
      // For daily/weekly/monthly, 31 is fine
      const runCount = task.schedule.type === 'interval' 
        ? Math.min(1000, (task.schedule.intervalMinutes ?? 60) > 0 ? Math.ceil(31 * 24 * 60 / (task.schedule.intervalMinutes ?? 60)) + 1 : 31)
        : task.schedule.type === 'hourly'
          ? 31 * 24
          : 31
      const runs = computeNextRuns(task.schedule, Math.min(runCount, 1500))
      
      for (const d of runs) {
        if (d.getFullYear() === calendarMonth.year && d.getMonth() === calendarMonth.month) {
          const day = d.getDate()
          // Only add each task once per day
          if (!map.has(day)) map.set(day, new Set())
          if (!map.get(day)!.has(task.id)) {
            map.get(day)!.add(task.id)
            if (!taskMap.has(day)) taskMap.set(day, [])
            taskMap.get(day)!.push(task)
          }
        }
      }
    }
    return taskMap
  }, [tasks, calendarMonth])

  const handleOpenCreate = () => {
    setEditingTask(null)
    const firstProfile = profiles[0]
    setForm(createEmptyTask(firstProfile?.id || '', firstProfile?.name || ''))
    setDialogOpen(true)
  }

  const handleOpenEdit = (task: ScheduledTask) => {
    setEditingTask(task)
    setForm({ ...task, schedule: { ...task.schedule } })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.profileId) return

    const schedule = { ...form.schedule }
    if (form.nextScheduleId) {
      schedule.type = 'after' as const
    }

    const task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> & { id?: string } = {
      name: form.name || '',
      profileId: form.profileId,
      profileName: profileMap.get(form.profileId)?.name || form.profileName,
      schedule,
      enabled: form.enabled,
      nextScheduleId: form.nextScheduleId,
    }
    // Only include id when editing an existing task
    if (editingTask && editingTask.id) {
      (task as any).id = editingTask.id
      ;(task as any).createdAt = form.createdAt
    }
    try {
      await saveTask(task as any)
      setDialogOpen(false)
    } catch (err) {
      console.error('Failed to save schedule:', err)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteTask(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleToggle = async (task: ScheduledTask) => {
    await toggleTask(task.id, !task.enabled)
  }

  const handleRunNow = async (task: ScheduledTask) => {
    setRunningTaskId(task.id)
    try {
      await runNow(task.id)
    } finally {
      setTimeout(() => setRunningTaskId(null), 2000)
    }
  }

  const updateSchedule = (field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      schedule: { ...prev.schedule, [field]: value } as ScheduleConfig
    }))
  }

  const stats = useMemo(() => ({
    total: tasks.length,
    enabled: tasks.filter(t => t.enabled).length,
    totalRuns: tasks.reduce((s, t) => s + t.runCount, 0),
    failed: tasks.filter(t => t.lastStatus === 'failed').length
  }), [tasks])

  const nextRuns = useMemo(() => {
    return computeNextRuns(form.schedule, 5)
  }, [form.schedule])

  const today = new Date().getDate()
  const currentMonthName = new Date(calendarMonth.year, calendarMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduler</h2>
          <p className="text-muted-foreground">Manage scheduled sync tasks</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Tasks</span>
            <span className="text-lg font-bold">{stats.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <span className="text-lg font-bold text-green-600">{stats.enabled}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Runs</span>
            <span className="text-lg font-bold text-blue-600">{stats.totalRuns}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Failed</span>
            <span className="text-lg font-bold text-destructive dark:text-red-400">{stats.failed}</span>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading schedules...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No scheduled tasks</h3>
            <p className="text-muted-foreground mb-4">
              Create a schedule to automatically run your sync profiles on a recurring basis
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="list">
              <Settings className="h-4 w-4 mr-2" />
              Task List
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <Card>
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 px-4 py-3 transition-opacity ${!task.enabled ? 'opacity-50' : ''}`}
                    >
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggle(task)}
                        className="shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{task.name || task.profileName}</span>
                          {task.schedule.type === 'after' && task.nextScheduleId ? (
                            <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                              After: {tasks.find(t => t.id === task.nextScheduleId)?.name || tasks.find(t => t.id === task.nextScheduleId)?.profileName || '?'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                              {SCHEDULE_TYPE_ICONS[task.schedule.type]}
                              {SCHEDULE_TYPE_LABELS[task.schedule.type]}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatSchedule(task.schedule)}
                          </span>
                          {task.nextRun && (
                            <span>Next: {new Date(task.nextRun).toLocaleString()}</span>
                          )}
                          {task.lastRun && (
                            <span>Last: {formatTimestamp(task.lastRun)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            {task.runCount} runs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.lastStatus === 'success' && (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Success
                          </Badge>
                        )}
                        {task.lastStatus === 'failed' && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <XCircle className="h-2.5 w-2.5" />
                            Failed
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleRunNow(task)}
                          disabled={!task.enabled || runningTaskId === task.id}
                        >
                          {runningTaskId === task.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleOpenEdit(task)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setDeleteConfirmId(task.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{currentMonthName}</CardTitle>
                <CardDescription>Upcoming scheduled runs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-px text-center text-xs mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-1 font-medium text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {Array.from({ length: calendarMonth.firstDay }, (_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: calendarMonth.daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayTasks = calendarRuns.get(day) || []
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        className={`aspect-square rounded-md p-1 text-xs border transition-colors ${
                          isToday
                            ? 'border-primary bg-primary/5 font-bold'
                            : dayTasks.length > 0
                              ? 'border-border bg-muted/30'
                              : 'border-transparent'
                        }`}
                      >
                        <div className="text-center font-medium">{day}</div>
                        {dayTasks.length > 0 && (
                          <div className="mt-0.5 flex justify-center gap-0.5 flex-wrap">
                            {dayTasks.slice(0, 3).map(t => (
                              <div
                                key={t.id}
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                                title={`${t.profileName} - ${formatSchedule(t.schedule)}`}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[8px] text-muted-foreground leading-none">+{dayTasks.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Modify this scheduled task'
                : 'Set up a new scheduled sync task'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-6 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enabled</Label>
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, enabled: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule Name</Label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Backup, Weekly Sync..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile <span className="text-destructive dark:text-red-400">*</span></Label>
                  <Select
                    value={form.profileId}
                    onValueChange={(v) => setForm(prev => ({ ...prev, profileId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sync profile..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.length === 0 && (
                        <SelectItem value="__none" disabled>No profiles available</SelectItem>
                      )}
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            <Badge variant="secondary" className="text-[10px]">{p.command}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Run After (optional)</Label>
                  <Select
                    value={form.nextScheduleId || '__none'}
                    onValueChange={(v) => setForm(prev => ({ ...prev, nextScheduleId: v === '__none' ? undefined : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None - no chaining" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {tasks
                        .filter(t => t.id !== form.id)
                        .map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span>{t.name || t.profileName}</span>
                              <Badge variant="secondary" className="text-[10px]">{SCHEDULE_TYPE_LABELS[t.schedule.type]}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Optionally start this schedule after another completes
                  </p>
                </div>
              </div>

              <Separator />

              {!form.nextScheduleId && (<>
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule
                </h4>

                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select
                    value={form.schedule.type}
                    onValueChange={(v) => updateSchedule('type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.hourly} Hourly</div>
                      </SelectItem>
                      <SelectItem value="daily">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.daily} Daily</div>
                      </SelectItem>
                      <SelectItem value="weekly">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.weekly} Weekly</div>
                      </SelectItem>
                      <SelectItem value="monthly">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.monthly} Monthly</div>
                      </SelectItem>
                      <SelectItem value="interval">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.interval} Interval</div>
                      </SelectItem>
                      <SelectItem value="startup">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.startup} On Startup</div>
                      </SelectItem>
                      <SelectItem value="idle">
                        <div className="flex items-center gap-2">{SCHEDULE_TYPE_ICONS.idle} On Idle</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.schedule.type === 'hourly' && (
                  <div className="space-y-2">
                    <Label>Interval (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={form.schedule.time || '60'}
                      onChange={(e) => updateSchedule('time', e.target.value)}
                    />
                  </div>
                )}

                {(form.schedule.type === 'daily' ||
                  form.schedule.type === 'weekly' ||
                  form.schedule.type === 'monthly') && (
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={form.schedule.time || '00:00'}
                      onChange={(e) => updateSchedule('time', e.target.value)}
                    />
                  </div>
                )}

                {form.schedule.type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <div className="flex gap-1">
                      {WEEKDAY_NAMES.map((day, i) => (
                        <Button
                          key={i}
                          variant={form.schedule.dayOfWeek === i ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => updateSchedule('dayOfWeek', i)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {form.schedule.type === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={String(form.schedule.dayOfMonth ?? 1)}
                      onValueChange={(v) => updateSchedule('dayOfMonth', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.schedule.type === 'interval' && (
                  <div className="space-y-3">
                    <Label>Run Every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={43200}
                        value={form.schedule.intervalMinutes ?? 60}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 60
                          updateSchedule('intervalMinutes', val)
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      The schedule will run every N minutes. Minimum is 1 minute.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Retry Options
                </h4>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Retry on Failure</Label>
                  <Switch
                    checked={form.schedule.retryOnFailure ?? false}
                    onCheckedChange={(v) => updateSchedule('retryOnFailure', v)}
                  />
                </div>

                {form.schedule.retryOnFailure && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                    <Label className="text-xs">Max Retries</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={form.schedule.maxRetries ?? 3}
                      onChange={(e) => updateSchedule('maxRetries', parseInt(e.target.value) || 3)}
                      className="w-24 h-8 text-xs"
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Options</h4>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Wake Computer to Run</Label>
                  <Switch
                    checked={form.schedule.wakeComputer ?? false}
                    onCheckedChange={(v) => updateSchedule('wakeComputer', v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Next 5 Runs
                </h4>
                {nextRuns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {form.schedule.type === 'startup'
                      ? 'This task runs when the application starts'
                      : form.schedule.type === 'idle'
                        ? 'This task runs when the computer is idle'
                        : 'Configure the schedule to see upcoming runs'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {nextRuns.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-muted/50"
                      >
                        <Badge variant="secondary" className="text-[10px] w-6 justify-center">
                          {i + 1}
                        </Badge>
                        <span>{d.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.profileId}
            >
              {editingTask ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the schedule for "
              {tasks.find(t => t.id === deleteConfirmId)?.profileName}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
