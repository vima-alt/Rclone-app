import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfileStore } from '@/stores/profile.store'
import { useRemoteStore } from '@/stores/remote.store'
import { useJobStore } from '@/stores/job.store'
import { generateId } from '@/lib/utils'
import { COMMAND_DEFINITIONS } from '@/metadata/commands'
import {
  Plus, Play, Copy, Trash2, Download, Upload, Edit, Clock,
  CheckCircle2, XCircle, Search, Filter, ArrowRight, Tag,
  X, Terminal, FileJson, FolderOpen
} from 'lucide-react'
import type { SyncProfile, ScheduleConfig } from '../../../shared/types'

const SYNC_COMMANDS = ['copy', 'sync', 'move', 'bisync', 'mkdir']

const COMMAND_COLORS: Record<string, string> = {
  copy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sync: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  move: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  bisync: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  mkdir: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  cron: 'Cron',
  startup: 'On Startup',
  idle: 'On Idle'
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function createEmptyProfile(): SyncProfile {
  return {
    id: '',
    name: '',
    description: '',
    source: '',
    destination: '',
    command: 'copy',
    flags: {},
    filters: [],
    schedule: { enabled: false, type: 'daily', time: '00:00' },
    notifications: false,
    enabled: true,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function generatePreviewCommand(profile: SyncProfile): string {
  const parts = ['rclone', profile.command]
  const sources = (profile.sources && profile.sources.length > 0) ? profile.sources : [profile.source]
  for (const src of sources) {
    if (src) parts.push(src)
  }
  const cmdDef = COMMAND_DEFINITIONS.find(c => c.name === profile.command)
  if (cmdDef?.usesDestination !== false && profile.destination) parts.push(profile.destination)

  for (const filter of profile.filters) {
    if (!filter.enabled) continue
    if (filter.type === 'exclude') parts.push(`--exclude "${filter.pattern}"`)
    else if (filter.type === 'include') parts.push(`--include "${filter.pattern}"`)
    else parts.push(`--filter "${filter.pattern}"`)
  }

  for (const [key, value] of Object.entries(profile.flags)) {
    if (value === true) {
      parts.push(`--${key}`)
    } else if (value !== false && value !== '' && value !== undefined) {
      parts.push(`--${key} ${String(value)}`)
    }
  }

  return parts.join(' ')
}

function formatSchedule(schedule: ScheduleConfig | undefined): string {
  if (!schedule || !schedule.enabled) return ''
  if (schedule.type === 'cron' && schedule.cron) return `Cron: ${schedule.cron}`
  const timeStr = schedule.time || '00:00'
  if (schedule.type === 'weekly' && schedule.dayOfWeek !== undefined) {
    return `${WEEKDAY_NAMES[schedule.dayOfWeek]} ${timeStr}`
  }
  if (schedule.type === 'monthly' && schedule.dayOfMonth !== undefined) {
    return `Day ${schedule.dayOfMonth} ${timeStr}`
  }
  return `${SCHEDULE_TYPE_LABELS[schedule.type]} ${timeStr}`
}

export default function SyncProfiles() {
  const { profiles, loading, loadProfiles, saveProfile, deleteProfile, duplicateProfile, importProfile } = useProfileStore()
  const { remotes } = useRemoteStore()
  const { addJob } = useJobStore()

  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SyncProfile | null>(null)
  const [form, setForm] = useState<SyncProfile>(createEmptyProfile())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState<{ id: string; name: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewCommand, setPreviewCommand] = useState('')
  const [sourceInputMode, setSourceInputMode] = useState<'select' | 'manual'>('select')
  const [destInputMode, setDestInputMode] = useState<'select' | 'manual'>('manual')
  const [newFilterPattern, setNewFilterPattern] = useState('')
  const [newFilterType, setNewFilterType] = useState<'include' | 'exclude' | 'filter'>('exclude')
  const [newTag, setNewTag] = useState('')
  const [importError, setImportError] = useState<string | null>(null)


  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    profiles.forEach(p => p.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [profiles])

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.source.toLowerCase().includes(search.toLowerCase()) ||
        p.destination.toLowerCase().includes(search.toLowerCase())
      const matchesTag = !filterTag || p.tags.includes(filterTag)
      return matchesSearch && matchesTag
    })
  }, [profiles, search, filterTag])

  const groupedProfiles = useMemo(() => {
    const groups = new Map<string, SyncProfile[]>()
    for (const profile of filteredProfiles) {
      if (profile.tags.length === 0) {
        const key = 'Untagged'
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(profile)
      } else {
        for (const tag of profile.tags) {
          if (!groups.has(tag)) groups.set(tag, [])
          groups.get(tag)!.push(profile)
        }
      }
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredProfiles])

  const openCreateDialog = useCallback(() => {
    setEditingProfile(null)
    setForm(createEmptyProfile())
    setSourceInputMode('select')
    setDestInputMode('select')
    setShowPreview(false)
    setNewFilterPattern('')
    setNewFilterType('exclude')
    setNewTag('')
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((profile: SyncProfile) => {
    setEditingProfile(profile)
    setForm({ ...profile })
    const sourceRemote = remotes.find(r => profile.source === `${r.name}:` || profile.source.startsWith(`${r.name}:`))
    const destRemote = remotes.find(r => profile.destination === `${r.name}:` || profile.destination.startsWith(`${r.name}:`))
    setSourceInputMode(sourceRemote ? 'select' : 'manual')
    setDestInputMode(destRemote && profile.destination === `${destRemote.name}:` ? 'select' : 'manual')
    setShowPreview(false)
    setNewFilterPattern('')
    setNewTag('')
    setDialogOpen(true)
  }, [remotes])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return

    const now = Date.now()
    const profile: SyncProfile = {
      ...form,
      id: editingProfile ? form.id : '',
      name: form.name.trim(),
      description: form.description.trim(),
      source: form.source.trim(),
      destination: form.destination.trim(),
      updatedAt: now,
      createdAt: form.createdAt || now,
      filters: form.filters.map(f => ({ ...f })),
      flags: { ...form.flags },
      tags: [...form.tags]
    }

    await saveProfile(profile)
    setDialogOpen(false)
  }, [form, saveProfile, editingProfile])

  const handleDelete = useCallback(async () => {
    if (deleteConfirmId) {
      await deleteProfile(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }, [deleteConfirmId, deleteProfile])

  const handleDuplicate = useCallback(async () => {
    if (duplicateName) {
      await duplicateProfile(duplicateName.id, duplicateName.name)
      setDuplicateName(null)
    }
  }, [duplicateName, duplicateProfile])

  const handleRunProfile = useCallback(async (profile: SyncProfile) => {
    const sources = (profile.sources && profile.sources.length > 0) ? profile.sources : [profile.source]
    const flagArgs: string[] = []

    for (const [key, value] of Object.entries(profile.flags)) {
      if (value !== false && value !== '' && value !== undefined) {
        if (value === true) flagArgs.push(`--${key}`)
        else flagArgs.push(`--${key}`, String(value))
      }
    }

    for (const filter of profile.filters) {
      if (!filter.enabled) continue
      if (filter.type === 'exclude') flagArgs.push('--exclude', filter.pattern)
      else if (filter.type === 'include') flagArgs.push('--include', filter.pattern)
      else flagArgs.push('--filter', filter.pattern)
    }

    for (const source of sources) {
      const cmdDef = COMMAND_DEFINITIONS.find(c => c.name === profile.command)
      const fullArgs = [profile.command, source]
      if (cmdDef?.usesDestination !== false && profile.destination) fullArgs.push(profile.destination)
      fullArgs.push(...flagArgs)

      const job = {
        id: generateId(),
        command: profile.command,
        args: fullArgs,
        source,
        destination: profile.destination,
        status: 'running' as const,
        stats: null,
        startTime: Date.now(),
        logs: [],
        profileId: profile.id
      }

      addJob(job)
      try {
        await window.electronAPI.rclone.executeStream(
          { id: job.id, command: job.command, args: job.args, source: job.source, destination: job.destination, logFile: `${profile.name}-${source.replace(/[:/\\]/g, '_')}` },
          { command: profile.command, source, destination: profile.destination, flags: Object.fromEntries(flagArgs.filter((_, i) => i % 2 === 0).map((k, i) => [k.slice(2), flagArgs[i * 2 + 1] || true])) }
        )
      } catch {
        /* handled by job listener */
      }
    }

    try {
      if (profile.notifications) {
        await window.electronAPI.app.notify('Sync Complete', `Profile "${profile.name}" completed successfully`)
      }
    } catch { /* ignore */ }

    await saveProfile({
      ...profile,
      lastRun: Date.now(),
      lastStatus: 'success',
      updatedAt: Date.now()
    })
  }, [addJob, saveProfile])

  const handleExportProfile = useCallback((profile: SyncProfile) => {
    const data = JSON.stringify(profile, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rclone-profile-${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportAll = useCallback(() => {
    const data = JSON.stringify(profiles, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rclone-profiles-all-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [profiles])

  const handleImportClick = useCallback(() => {
    setImportError(null)
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.name && item.command) {
            await importProfile((file as any).path)
          }
        }
      } else if (data.name && data.command) {
        await importProfile((file as any).path)
      } else {
        setImportError('Invalid profile format')
      }
    } catch {
      setImportError('Failed to parse JSON file')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [importProfile])

  const handleAddFilter = useCallback(() => {
    if (!newFilterPattern.trim()) return
    setForm(prev => ({
      ...prev,
      filters: [
        ...prev.filters,
        { id: generateId(), type: newFilterType, pattern: newFilterPattern.trim(), enabled: true }
      ]
    }))
    setNewFilterPattern('')
  }, [newFilterPattern, newFilterType])

  const handleRemoveFilter = useCallback((filterId: string) => {
    setForm(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }))
  }, [])

  const handleToggleFilter = useCallback((filterId: string) => {
    setForm(prev => ({
      ...prev,
      filters: prev.filters.map(f =>
        f.id === filterId ? { ...f, enabled: !f.enabled } : f
      )
    }))
  }, [])

  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase()
    if (!tag || form.tags.includes(tag)) return
    setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    setNewTag('')
  }, [newTag, form.tags])

  const handleRemoveTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }, [])

  const handleToggleFlag = useCallback((flagName: string) => {
    setForm(prev => ({
      ...prev,
      flags: {
        ...prev.flags,
        [flagName]: prev.flags[flagName] === true ? false : true
      }
    }))
  }, [])

  const handleSetFlagValue = useCallback((flagName: string, value: string) => {
    setForm(prev => ({
      ...prev,
      flags: { ...prev.flags, [flagName]: value }
    }))
  }, [])

  const handleUpdateSchedule = useCallback((field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        enabled: prev.schedule?.enabled ?? false,
        type: prev.schedule?.type ?? 'daily',
        [field]: value
      } as ScheduleConfig
    }))
  }, [])

  const stats = useMemo(() => ({
    total: profiles.length,
    enabled: profiles.filter(p => p.enabled).length,
    scheduled: profiles.filter(p => p.schedule?.enabled).length,
    successful: profiles.filter(p => p.lastStatus === 'success').length,
    failed: profiles.filter(p => p.lastStatus === 'failed').length
  }), [profiles])

  const QUICK_FLAGS = [
    { name: 'dry-run', label: 'Dry Run', description: 'Test without changes' },
    { name: 'verbose', label: 'Verbose', description: 'Extended logging' },
    { name: 'checksum', label: 'Checksum', description: 'Compare by checksum' },
    { name: 'progress', label: 'Progress', description: 'Show transfer progress' },
    { name: 'fast-list', label: 'Fast List', description: 'Recursive listing (more RAM)' },
    { name: 'size-only', label: 'Size Only', description: 'Skip by size only' },
    { name: 'ignore-existing', label: 'Ignore Existing', description: 'Skip existing files' },
    { name: 'delete-before', label: 'Delete Before', description: 'Delete dest before transfer' },
    { name: 'delete-during', label: 'Delete During', description: 'Delete dest during transfer' },
    { name: 'delete-after', label: 'Delete After', description: 'Delete dest after transfer' },
    { name: 'track-renames', label: 'Track Renames', description: 'Server-side moves' },
    { name: 'metadata', label: 'Metadata', description: 'Preserve metadata' },
    { name: 'resync', label: 'Resync', description: 'Reset bisync tracking (first run or recovery)' }
  ]

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sync Profiles</h2>
          <p className="text-muted-foreground">Manage saved sync jobs and scheduled transfers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          {profiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          )}
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Profile
          </Button>
        </div>
      </div>

      {importError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 dark:bg-red-500/10 dark:border-red-500/20 p-3 flex items-center justify-between">
          <span className="text-sm text-destructive dark:text-red-400">{importError}</span>
          <Button variant="ghost" size="sm" onClick={() => setImportError(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Enabled', value: stats.enabled, color: 'text-green-600' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
          { label: 'Succeeded', value: stats.successful, color: 'text-emerald-600' },
          { label: 'Failed', value: stats.failed, color: 'text-red-600 dark:text-red-400' }
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <Select value={filterTag || '__all__'} onValueChange={(v) => setFilterTag(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-40">
              <Filter className="h-3 w-3 mr-2" />
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode('grouped')}
          >
            Grouped
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading profiles...</div>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Terminal className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search || filterTag ? 'No profiles match your search' : 'No sync profiles yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search || filterTag
                ? 'Try different search terms or clear your filters'
                : 'Create your first sync profile to automate Rclone transfers'}
            </p>
            {!search && !filterTag && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-6">
          {groupedProfiles.map(([tag, groupProfiles]) => (
            <div key={tag} className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {tag}
                </h3>
                <Badge variant="secondary" className="text-[10px]">{groupProfiles.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupProfiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={openEditDialog}
                    onRun={handleRunProfile}
                    onDuplicate={(p) => setDuplicateName({ id: p.id, name: `${p.name} (copy)` })}
                    onDelete={setDeleteConfirmId}
                    onExport={handleExportProfile}
                    onToggle={async (p) => {
                      await saveProfile({ ...p, enabled: !p.enabled, updatedAt: Date.now() })
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={openEditDialog}
              onRun={handleRunProfile}
              onDuplicate={(p) => setDuplicateName({ id: p.id, name: `${p.name} (copy)` })}
              onDelete={setDeleteConfirmId}
              onExport={handleExportProfile}
              onToggle={async (p) => {
                await saveProfile({ ...p, enabled: !p.enabled, updatedAt: Date.now() })
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Profile' : 'Create Profile'}</DialogTitle>
            <DialogDescription>
              {editingProfile
                ? 'Modify your sync profile settings'
                : 'Configure a new sync profile for automated Rclone transfers'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-6 pb-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name <span className="text-destructive dark:text-red-400">*</span></Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Backup Photos to GDrive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Command</Label>
                    <Select
                      value={form.command}
                      onValueChange={(v) => setForm(prev => ({ ...prev, command: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYNC_COMMANDS.map(cmd => (
                          <SelectItem key={cmd} value={cmd}>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] ${COMMAND_COLORS[cmd]}`}>{cmd}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {COMMAND_DEFINITIONS.find(c => c.name === cmd)?.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description for this profile"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Paths</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Source{form.sources && form.sources.length > 1 ? ` (${form.sources.length} paths)` : ''}</Label>
                    {sourceInputMode === 'select' ? (
                      <div className="space-y-2">
                        <Select
                          value={form.source}
                          onValueChange={(v) => {
                            const sources = form.sources && form.sources.length > 0 ? [...form.sources] : [form.source]
                            sources[0] = v
                            setForm(prev => ({ ...prev, source: v, sources }))
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select remote..." />
                          </SelectTrigger>
                          <SelectContent>
                            {remotes.map(r => (
                              <SelectItem key={r.name} value={`${r.name}:`}>
                                {r.name}: ({r.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSourceInputMode('manual')}>
                          Type manually
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Input
                            value={form.source}
                            onChange={(e) => {
                              const sources = form.sources && form.sources.length > 0 ? [...form.sources] : []
                              if (sources.length > 0) sources[0] = e.target.value
                              setForm(prev => ({ ...prev, source: e.target.value, sources: sources.length > 0 ? sources : undefined }))
                            }}
                            placeholder="Local path or remote:path"
                            className="flex-1"
                          />
                          <Button variant="outline" size="sm" className="h-9 px-2 shrink-0" title="Browse file or folder"
                            onClick={async () => {
                              const result = await window.electronAPI.app.browseFolder({ defaultPath: form.source, type: 'both' })
                              if (!result.canceled && result.filePaths[0]) {
                                const sources = form.sources && form.sources.length > 0 ? [...form.sources] : []
                                if (sources.length > 0) sources[0] = result.filePaths[0]
                                setForm(prev => ({ ...prev, source: result.filePaths[0], sources: sources.length > 0 ? sources : undefined }))
                              }
                            }}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSourceInputMode('select')}>
                            Select from remotes
                          </Button>
                        </div>
                      </div>
                    )}
                    {(form.sources && form.sources.length > 0 ? form.sources : [form.source]).slice(1).map((src, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <Input
                          value={src}
                          onChange={(e) => {
                            const sources = [...(form.sources || [])]
                            sources[idx + 1] = e.target.value
                            setForm(prev => ({ ...prev, sources }))
                          }}
                          placeholder="Additional source path"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" className="h-9 px-2 shrink-0" title="Browse file or folder"
                          onClick={async () => {
                            const result = await window.electronAPI.app.browseFolder({ defaultPath: src, type: 'both' })
                            if (!result.canceled && result.filePaths[0]) {
                              const sources = [...(form.sources || [])]
                              sources[idx + 1] = result.filePaths[0]
                              setForm(prev => ({ ...prev, sources }))
                            }
                          }}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-1.5 shrink-0" title="Remove"
                          onClick={() => {
                            const sources = (form.sources || []).filter((_, i) => i !== idx + 1)
                            setForm(prev => ({ ...prev, sources: sources.length > 0 ? sources : undefined }))
                          }}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => {
                        const sources = form.sources && form.sources.length > 0 ? [...form.sources] : [form.source]
                        sources.push('')
                        setForm(prev => ({ ...prev, sources }))
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add source
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Destination</Label>
                    {destInputMode === 'select' ? (
                      <div className="space-y-2">
                        <Select
                          value={form.destination}
                          onValueChange={(v) => setForm(prev => ({ ...prev, destination: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select remote..." />
                          </SelectTrigger>
                          <SelectContent>
                            {remotes.map(r => (
                              <SelectItem key={r.name} value={`${r.name}:`}>
                                {r.name}: ({r.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDestInputMode('manual')}>
                          Type manually
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Input
                            value={form.destination}
                            onChange={(e) => setForm(prev => ({ ...prev, destination: e.target.value }))}
                            placeholder="Remote:path or local path"
                            className="flex-1"
                          />
                          <Button variant="outline" size="sm" className="h-9 px-2 shrink-0" title="Browse file or folder"
                            onClick={async () => {
                              const result = await window.electronAPI.app.browseFolder({ defaultPath: form.destination, type: 'both' })
                              if (!result.canceled && result.filePaths[0]) {
                                setForm(prev => ({ ...prev, destination: result.filePaths[0] }))
                              }
                            }}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDestInputMode('select')}>
                          Select from remotes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {form.source && form.destination && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-md p-2">
                    <Terminal className="h-3 w-3 shrink-0" />
                    <span className="font-mono truncate">
                      rclone {form.command} {form.source || (form.sources && form.sources[0]) || '?'} {form.destination}
                      {(form.sources && form.sources.length > 1) ? ` (+${form.sources.length - 1} more)` : ''}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Filter Rules</h4>
                  <span className="text-xs text-muted-foreground">{form.filters.length} rules</span>
                </div>

                {form.filters.length > 0 && (
                  <div className="space-y-2">
                    {form.filters.map(filter => (
                      <div key={filter.id} className="flex items-center gap-2 group">
                        <Switch
                          checked={filter.enabled}
                          onCheckedChange={() => handleToggleFilter(filter.id)}
                          className="shrink-0"
                        />
                        <Badge
                          variant={filter.type === 'exclude' ? 'destructive' : filter.type === 'include' ? 'success' : 'secondary'}
                          className="text-[10px] w-16 justify-center shrink-0"
                        >
                          {filter.type}
                        </Badge>
                        <span className="text-xs font-mono flex-1 truncate">{filter.pattern}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => handleRemoveFilter(filter.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select value={newFilterType} onValueChange={(v: any) => setNewFilterType(v)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclude">Exclude</SelectItem>
                      <SelectItem value="include">Include</SelectItem>
                      <SelectItem value="filter">Filter</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newFilterPattern}
                    onChange={(e) => setNewFilterPattern(e.target.value)}
                    placeholder="Pattern (e.g. *.tmp, .git/)"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFilter()
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddFilter}
                    disabled={!newFilterPattern.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Flags</h4>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_FLAGS.map(flag => (
                    <div
                      key={flag.name}
                      className={`flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition-colors ${
                        form.flags[flag.name] === true
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleToggleFlag(flag.name)}
                    >
                      <Switch
                        checked={form.flags[flag.name] === true}
                        className="shrink-0 pointer-events-none"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">--{flag.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{flag.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Custom Flags</Label>
                  {Object.entries(form.flags)
                    .filter(([key]) => !QUICK_FLAGS.find(f => f.name === key))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-32 truncate">--{key}</span>
                        {typeof value === 'boolean' ? (
                          <Switch
                            checked={value}
                            onCheckedChange={() => handleToggleFlag(key)}
                          />
                        ) : (
                          <Input
                            value={String(value)}
                            onChange={(e) => handleSetFlagValue(key, e.target.value)}
                            className="h-7 text-xs flex-1"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setForm(prev => {
                              const next = { ...prev.flags }
                              delete next[key]
                              return { ...prev, flags: next }
                            })
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Schedule</h4>
                <div className="flex items-center justify-between">
                  <Label>Enable Schedule</Label>
                  <Switch
                    checked={form.schedule?.enabled ?? false}
                    onCheckedChange={(v) => handleUpdateSchedule('enabled', v)}
                  />
                </div>

                {form.schedule?.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Schedule Type</Label>
                      <Select
                        value={form.schedule?.type ?? 'daily'}
                        onValueChange={(v) => handleUpdateSchedule('type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="cron">Cron Expression</SelectItem>
                          <SelectItem value="startup">On Startup</SelectItem>
                          <SelectItem value="idle">On Idle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(form.schedule?.type === 'daily' ||
                      form.schedule?.type === 'hourly' ||
                      form.schedule?.type === 'weekly' ||
                      form.schedule?.type === 'monthly') && (
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input
                          type="time"
                          value={form.schedule?.time ?? '00:00'}
                          onChange={(e) => handleUpdateSchedule('time', e.target.value)}
                        />
                      </div>
                    )}

                    {form.schedule?.type === 'weekly' && (
                      <div className="space-y-2">
                        <Label>Day of Week</Label>
                        <div className="flex gap-1">
                          {WEEKDAY_NAMES.map((day, i) => (
                            <Button
                              key={i}
                              variant={form.schedule?.dayOfWeek === i ? 'default' : 'outline'}
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => handleUpdateSchedule('dayOfWeek', i)}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.schedule?.type === 'monthly' && (
                      <div className="space-y-2">
                        <Label>Day of Month</Label>
                        <Select
                          value={String(form.schedule?.dayOfMonth ?? 1)}
                          onValueChange={(v) => handleUpdateSchedule('dayOfMonth', parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {form.schedule?.type === 'cron' && (
                      <div className="space-y-2">
                        <Label>Cron Expression</Label>
                        <Input
                          value={form.schedule?.cron ?? ''}
                          onChange={(e) => handleUpdateSchedule('cron', e.target.value)}
                          placeholder="0 */6 * * * (every 6 hours)"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Standard cron format: minute hour day-of-month month day-of-week
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Retry on Failure</Label>
                        <Switch
                          checked={form.schedule?.retryOnFailure ?? false}
                          onCheckedChange={(v) => handleUpdateSchedule('retryOnFailure', v)}
                        />
                      </div>
                      {form.schedule?.retryOnFailure && (
                        <div className="space-y-2 pl-4">
                          <Label className="text-xs">Max Retries</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={form.schedule?.maxRetries ?? 3}
                            onChange={(e) => handleUpdateSchedule('maxRetries', parseInt(e.target.value) || 3)}
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Notifications</h4>
                  <Switch
                    checked={form.notifications}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, notifications: v }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when this profile completes or fails
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tags</h4>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                        <button
                          className="ml-0.5 hover:text-destructive dark:hover:text-red-400"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag()
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    Command Preview
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewCommand(generatePreviewCommand(form))
                      setShowPreview(!showPreview)
                    }}
                  >
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                </div>
                {showPreview && (
                  <div className="rounded-md bg-muted p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                      {previewCommand || 'rclone <command> <source> <destination>'}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigator.clipboard.writeText(previewCommand)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim()}
            >
              {editingProfile ? 'Save Changes' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "
              {profiles.find(p => p.id === deleteConfirmId)?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicateName} onOpenChange={() => setDuplicateName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Profile</DialogTitle>
            <DialogDescription>Enter a name for the duplicated profile.</DialogDescription>
          </DialogHeader>
          <Input
            value={duplicateName?.name ?? ''}
            onChange={(e) => duplicateName && setDuplicateName({ ...duplicateName, name: e.target.value })}
            placeholder="Profile name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDuplicate()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateName(null)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName?.name.trim()}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ProfileCardProps {
  profile: SyncProfile
  onEdit: (profile: SyncProfile) => void
  onRun: (profile: SyncProfile) => void
  onDuplicate: (profile: SyncProfile) => void
  onDelete: (id: string) => void
  onExport: (profile: SyncProfile) => void
  onToggle: (profile: SyncProfile) => void
}

function ProfileCard({ profile, onEdit, onRun, onDuplicate, onDelete, onExport, onToggle }: ProfileCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-shadow ${!profile.enabled ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base truncate">{profile.name}</CardTitle>
              <Badge className={`text-[10px] shrink-0 ${COMMAND_COLORS[profile.command] ?? 'bg-secondary text-secondary-foreground'}`}>
                {profile.command}
              </Badge>
            </div>
            {profile.description && (
              <CardDescription className="line-clamp-1 text-xs">
                {profile.description}
              </CardDescription>
            )}
          </div>
          <Switch
            checked={profile.enabled}
            onCheckedChange={() => onToggle(profile)}
            className="shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{profile.source || '(no source)'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{profile.destination || '(no destination)'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {profile.schedule?.enabled && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              {formatSchedule(profile.schedule)}
            </Badge>
          )}
          {profile.lastRun && (
            <Badge
              variant={profile.lastStatus === 'success' ? 'success' : profile.lastStatus === 'failed' ? 'destructive' : 'secondary'}
              className="text-[10px] gap-1"
            >
              {profile.lastStatus === 'success' ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : profile.lastStatus === 'failed' ? (
                <XCircle className="h-2.5 w-2.5" />
              ) : (
                <Clock className="h-2.5 w-2.5" />
              )}
              {profile.lastStatus ? profile.lastStatus : 'ran'}
            </Badge>
          )}
          {!profile.lastRun && (
            <Badge variant="outline" className="text-[10px]">
              Never run
            </Badge>
          )}
          {profile.filters.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {profile.filters.length} filter{profile.filters.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {profile.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {profile.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-8"
            onClick={() => onRun(profile)}
            disabled={!profile.enabled}
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => onEdit(profile)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => onDuplicate(profile)}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => onExport(profile)}>
            <Download className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => onDelete(profile.id)}>
            <Trash2 className="h-3 w-3 text-destructive dark:text-red-400" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
