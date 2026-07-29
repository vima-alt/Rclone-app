import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from '@/components/ui/tooltip'
import { COMMAND_DEFINITIONS } from '@/metadata/commands'
import { FLAG_DEFINITIONS } from '@/metadata/flags'
import { useRemoteStore } from '@/stores/remote.store'
import { useJobStore } from '@/stores/job.store'
import { useAppStore } from '@/stores/app.store'
import { generateId, cn } from '@/lib/utils'
import { getUiMode } from '@/lib/mode-gating'
import type { CommandPreset, CommandDefinition, FlagDefinition } from '../../../shared/types'
import {
  Terminal, Play, Copy, Save, Trash2, ChevronDown, ChevronRight,
  ArrowUpDown, History, Search, ArrowLeftRight, AlertTriangle,
  Info, Download, Upload, X, CheckCircle2, FileJson, Folder,
  Cloud, Server, Shield, Settings, Eye, RefreshCw,
  Zap, Filter, BarChart3, Hash, Mountain, List
} from 'lucide-react'

const COMMAND_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Transfer: <ArrowUpDown className="h-3.5 w-3.5" />,
  Verification: <CheckCircle2 className="h-3.5 w-3.5" />,
  Listing: <List className="h-3.5 w-3.5" />,
  Operations: <Settings className="h-3.5 w-3.5" />,
  Information: <Info className="h-3.5 w-3.5" />,
  Mount: <Mountain className="h-3.5 w-3.5" />,
  Server: <Server className="h-3.5 w-3.5" />,
  Advanced: <Zap className="h-3.5 w-3.5" />,
}

const COMMAND_CATEGORY_COLORS: Record<string, string> = {
  Transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Verification: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Listing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Operations: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Information: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  Mount: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Server: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Advanced: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const FLAG_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Transfer: <ArrowUpDown className="h-3 w-3" />,
  Bandwidth: <BarChart3 className="h-3 w-3" />,
  Comparison: <RefreshCw className="h-3 w-3" />,
  Sync: <ArrowLeftRight className="h-3 w-3" />,
  Filter: <Filter className="h-3 w-3" />,
  Logging: <FileJson className="h-3 w-3" />,
  'Error Handling': <Shield className="h-3 w-3" />,
  Network: <Cloud className="h-3 w-3" />,
  Performance: <Zap className="h-3 w-3" />,
  Metadata: <Hash className="h-3 w-3" />,
  Advanced: <Settings className="h-3 w-3" />,
}

const QUICK_FLAGS = [
  { name: 'dry-run', label: 'Dry Run', description: 'Test without changes' },
  { name: 'verbose', label: 'Verbose', description: 'Extended logging' },
  { name: 'progress', label: 'Progress', description: 'Show transfer progress' },
  { name: 'checksum', label: 'Checksum', description: 'Compare by checksum' },
  { name: 'fast-list', label: 'Fast List', description: 'Recursive listing (more RAM)' },
  { name: 'size-only', label: 'Size Only', description: 'Skip by size only' },
  { name: 'ignore-existing', label: 'Ignore Existing', description: 'Skip existing files' },
  { name: 'metadata', label: 'Metadata', description: 'Preserve metadata' },
  { name: 'resync', label: 'Resync', description: 'Reset bisync tracking (first run or recovery)' },
]

const FLAG_CONFLICTS: Record<string, string[]> = {
  'delete-before': ['delete-during', 'delete-after'],
  'delete-during': ['delete-before', 'delete-after'],
  'delete-after': ['delete-before', 'delete-during'],
  'checksum': ['size-only', 'update'],
  'size-only': ['checksum'],
  'update': ['checksum'],
  'quiet': ['verbose', 'progress'],
  'verbose': ['quiet'],
  'progress': ['quiet'],
}

function buildCommand(
  command: string,
  source: string,
  destination: string,
  flags: Record<string, string | boolean>,
  cmd: CommandDefinition | undefined,
): string {
  const parts = ['rclone', command]
  if (source) parts.push(source)
  if (destination && cmd?.usesDestination !== false) parts.push(destination)
  for (const [key, value] of Object.entries(flags)) {
    if (value === true) {
      parts.push(`--${key}`)
    } else if (value !== false && value !== '' && value !== undefined) {
      parts.push(`--${key} ${String(value)}`)
    }
  }
  return parts.join(' ')
}

function getActiveConflicts(flags: Record<string, string | boolean>): string[] {
  const warnings: string[] = []
  for (const [flag, conflicts] of Object.entries(FLAG_CONFLICTS)) {
    if (flags[flag] === true || (flags[flag] !== undefined && flags[flag] !== false && flags[flag] !== '')) {
      for (const c of conflicts) {
        if (flags[c] === true || (flags[c] !== undefined && flags[c] !== false && flags[c] !== '')) {
          warnings.push(`--${flag} conflicts with --${c}`)
        }
      }
    }
  }
  return [...new Set(warnings)]
}

function RemoteTypeIcon({ type }: { type: string }) {
  if (type === 'local') return <Folder className="h-3 w-3 text-muted-foreground" />
  return <Cloud className="h-3 w-3 text-muted-foreground" />
}

export default function CommandBuilder() {
  const { remotes } = useRemoteStore()
  const { addJob } = useJobStore()
  const { recentCommands, commandPresets, updateSettings, uiMode } = useAppStore()

  const [command, setCommand] = useState('copy')
  const [source, setSource] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [destination, setDestination] = useState('')
  const [destPath, setDestPath] = useState('')
  const [flags, setFlags] = useState<Record<string, string | boolean>>({})

  const [commandSearch, setCommandSearch] = useState('')
  const [expandedCmdCategories, setExpandedCmdCategories] = useState<Set<string>>(new Set(['Transfer']))

  const [flagSearch, setFlagSearch] = useState('')
  const [expandedFlagCategories, setExpandedFlagCategories] = useState<Set<string>>(new Set(['Transfer']))
  const [activeTab, setActiveTab] = useState('flags')

  const [presetSearch, setPresetSearch] = useState('')
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const cmd = COMMAND_DEFINITIONS.find(c => c.name === command)

  const sourceFull = source + sourcePath
  const destFull = destination + destPath

  const generatedCommand = useMemo(() => {
    return buildCommand(command, sourceFull, destFull, flags, cmd)
  }, [command, sourceFull, destFull, flags, cmd])

  const validationWarnings = useMemo(() => {
    const warnings: string[] = []
    warnings.push(...getActiveConflicts(flags))
    if (flags['dry-run'] === true) {
      warnings.push('Dry-run mode: no changes will be made')
    }
    return warnings
  }, [flags])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (cmd?.usesSource !== false && !sourceFull) {
      errors.push('Source is required')
    }
    if (cmd?.usesDestination !== false && !destFull) {
      errors.push('Destination is required')
    }
    return errors
  }, [cmd, sourceFull, destFull])

  const commandCategories = useMemo(() => {
    const cats = new Map<string, CommandDefinition[]>()
    for (const c of COMMAND_DEFINITIONS) {
      const matchesSearch = !commandSearch ||
        c.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
        c.description.toLowerCase().includes(commandSearch.toLowerCase())
      if (!matchesSearch) continue
      if (!cats.has(c.category)) cats.set(c.category, [])
      cats.get(c.category)!.push(c)
    }
    return Array.from(cats.entries())
  }, [commandSearch])

  const filteredFlagCategories = useMemo(() => {
    const allCats = new Map<string, FlagDefinition[]>()
    for (const flag of FLAG_DEFINITIONS) {
      if (uiMode === 'basic' && flag.level !== 'basic') continue
      if (uiMode === 'advanced' && flag.level === 'expert') continue
      if (flagSearch) {
        const q = flagSearch.toLowerCase()
        if (!flag.name.toLowerCase().includes(q) && !flag.description.toLowerCase().includes(q)) continue
      }
      if (!allCats.has(flag.category)) allCats.set(flag.category, [])
      allCats.get(flag.category)!.push(flag)
    }
    return Array.from(allCats.entries()).filter(([, f]) => f.length > 0)
  }, [flagSearch, uiMode])

  const activeFlagCount = useMemo(() => {
    return Object.entries(flags).filter(
      ([, v]) => v !== false && v !== '' && v !== undefined
    ).length
  }, [flags])

  const filteredPresets = useMemo(() => {
    if (!presetSearch) return commandPresets
    const q = presetSearch.toLowerCase()
    return commandPresets.filter(
      p => p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.command.toLowerCase().includes(q)
    )
  }, [commandPresets, presetSearch])

  const filteredHistory = useMemo(() => {
    if (!historySearch) return recentCommands
    const q = historySearch.toLowerCase()
    return recentCommands.filter(c => c.toLowerCase().includes(q))
  }, [recentCommands, historySearch])

  const toggleFlag = useCallback((name: string) => {
    setFlags(prev => ({
      ...prev,
      [name]: prev[name] === true ? false : true,
    }))
  }, [])

  const setFlagValue = useCallback((name: string, value: string) => {
    setFlags(prev => ({ ...prev, [name]: value }))
  }, [])

  const removeFlag = useCallback((name: string) => {
    setFlags(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const swapSourceDest = useCallback(() => {
    setSource(destination)
    setDestPath(sourcePath)
    setDestination(source)
    setSourcePath(destPath)
  }, [source, destination, sourcePath, destPath])

  const handleLoadPreset = useCallback((preset: CommandPreset) => {
    setCommand(preset.command)
    try {
      const parsed = JSON.parse(preset.args)
      if (parsed.source !== undefined) {
        const remote = remotes.find(r => parsed.source.startsWith(r.name))
        if (remote) {
          setSource(parsed.source.slice(0, parsed.source.indexOf(':') + 1))
          setSourcePath(parsed.source.slice(parsed.source.indexOf(':') + 1))
        } else {
          setSource('')
          setSourcePath(parsed.source)
        }
      }
      if (parsed.destination !== undefined) {
        const remote = remotes.find(r => parsed.destination.startsWith(r.name))
        if (remote) {
          setDestination(parsed.destination.slice(0, parsed.destination.indexOf(':') + 1))
          setDestPath(parsed.destination.slice(parsed.destination.indexOf(':') + 1))
        } else {
          setDestination('')
          setDestPath(parsed.destination)
        }
      }
      if (parsed.flags) {
        setFlags(parsed.flags)
      } else {
        setFlags({})
      }
    } catch {
      setFlags({})
    }
  }, [remotes])

  const handleLoadHistory = useCallback((cmdStr: string) => {
    const parts = cmdStr.trim().split(/\s+/)
    if (parts[0] === 'rclone') parts.shift()
    if (parts.length > 0) {
      const cmdName = parts[0]
      const cmdDef = COMMAND_DEFINITIONS.find(c => c.name === cmdName)
      if (cmdDef) {
        setCommand(cmdName)
        const positional = parts.slice(1).filter(p => !p.startsWith('--'))
        const newFlags: Record<string, string | boolean> = {}
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].startsWith('--')) {
            const flagName = parts[i].slice(2)
            const nextPart = parts[i + 1]
            if (nextPart && !nextPart.startsWith('--')) {
              newFlags[flagName] = nextPart
              i++
            } else {
              newFlags[flagName] = true
            }
          }
        }
        if (positional[0]) {
          const remote = remotes.find(r => positional[0].startsWith(r.name))
          if (remote) {
            setSource(positional[0].slice(0, positional[0].indexOf(':') + 1))
            setSourcePath(positional[0].slice(positional[0].indexOf(':') + 1))
          } else {
            setSource('')
            setSourcePath(positional[0])
          }
        }
        if (positional[1]) {
          const remote = remotes.find(r => positional[1].startsWith(r.name))
          if (remote) {
            setDestination(positional[1].slice(0, positional[1].indexOf(':') + 1))
            setDestPath(positional[1].slice(positional[1].indexOf(':') + 1))
          } else {
            setDestination('')
            setDestPath(positional[1])
          }
        }
        setFlags(newFlags)
      }
    }
  }, [remotes])

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return
    const preset: CommandPreset = {
      id: generateId(),
      name: presetName.trim(),
      description: presetDescription.trim(),
      command,
      args: JSON.stringify({ source: sourceFull, destination: destFull, flags }),
      createdAt: Date.now(),
    }
    updateSettings({ commandPresets: [...commandPresets, preset] })
    setPresetName('')
    setPresetDescription('')
    setShowSaveDialog(false)
  }, [presetName, presetDescription, command, sourceFull, destFull, flags, commandPresets, updateSettings])

  const handleDeletePreset = useCallback(() => {
    if (!deletePresetId) return
    updateSettings({ commandPresets: commandPresets.filter(p => p.id !== deletePresetId) })
    setDeletePresetId(null)
  }, [deletePresetId, commandPresets, updateSettings])

  const handleExportPresets = useCallback(() => {
    const data = JSON.stringify(commandPresets, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rclone-presets-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [commandPresets])

  const handleImportPresets = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const validPresets = Array.isArray(data)
        ? data.filter((p: any) => p.name && p.command)
        : data.name && data.command ? [data] : []
      if (validPresets.length > 0) {
        const newPresets = validPresets.map((p: any) => ({
          id: p.id || generateId(),
          name: p.name,
          description: p.description || '',
          command: p.command,
          args: p.args || '{}',
          createdAt: p.createdAt || Date.now(),
        }))
        updateSettings({ commandPresets: [...commandPresets, ...newPresets] })
      }
    } catch {}
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [commandPresets, updateSettings])

  const handleExecute = useCallback(async () => {
    if (validationErrors.length > 0) return

    const activeFlags: Record<string, string | boolean> = {}
    for (const [key, value] of Object.entries(flags)) {
      if (value !== false && value !== '' && value !== undefined) {
        activeFlags[key] = value
      }
    }

    const args: any = {
      command,
      source: sourceFull || undefined,
      destination: destFull || undefined,
      flags: activeFlags,
    }

    const job = {
      id: generateId(),
      command,
      args: Object.entries(activeFlags).flatMap(([k, v]) =>
        v === true ? [`--${k}`] : [`--${k}`, String(v)]
      ),
      source: sourceFull,
      destination: destFull,
      status: 'running' as const,
      stats: null,
      startTime: Date.now(),
      logs: [],
    }

    addJob(job)
    await window.electronAPI.rclone.executeStream({ id: job.id, command: job.command, args: job.args, source: job.source, destination: job.destination, logFile: command }, args)

    updateSettings({
      recentCommands: [generatedCommand, ...recentCommands.filter(c => c !== generatedCommand)].slice(0, 100),
    })
  }, [command, sourceFull, destFull, flags, generatedCommand, recentCommands, addJob, updateSettings, validationErrors])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCommand)
  }, [generatedCommand])

  const hasActiveFlags = activeFlagCount > 0

  return (
    <TooltipProvider delayDuration={300}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportPresets}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Command Builder</h2>
            <p className="text-muted-foreground">Build and execute Rclone commands visually</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
              {recentCommands.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                  {recentCommands.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={!generatedCommand}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            {/* Command Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Command
                </CardTitle>
                {cmd && (
                  <CardDescription className="text-xs">{cmd.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Commands</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={commandSearch}
                      onChange={(e) => setCommandSearch(e.target.value)}
                      placeholder="Search commands..."
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <ScrollArea className="h-[260px]">
                    <div className="space-y-2 pr-2">
                      {commandCategories.map(([category, cmds]) => (
                        <div key={category}>
                          <button
                            className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5 w-full hover:text-foreground transition-colors"
                            onClick={() => {
                              const next = new Set(expandedCmdCategories)
                              if (next.has(category)) next.delete(category)
                              else next.add(category)
                              setExpandedCmdCategories(next)
                            }}
                          >
                            {expandedCmdCategories.has(category)
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronRight className="h-3 w-3" />}
                            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold', COMMAND_CATEGORY_COLORS[category] || 'bg-secondary text-secondary-foreground')}>
                              {COMMAND_CATEGORY_ICONS[category]}
                              {category}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70">({cmds.length})</span>
                          </button>
                          {expandedCmdCategories.has(category) && (
                            <div className="space-y-1 pl-4">
                              {cmds.map(c => (
                                <button
                                  key={c.name}
                                  className={cn(
                                    'flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                                    command === c.name
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-muted'
                                  )}
                                  onClick={() => {
                                    setCommand(c.name)
                                    setCommandSearch('')
                                  }}
                                >
                                  <span className="font-mono text-xs font-medium">{c.name}</span>
                                  <span className={cn(
                                    'text-[10px] truncate',
                                    command === c.name ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  )}>
                                    {c.description}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {commandCategories.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No commands match "{commandSearch}"
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {cmd && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('text-[10px]', COMMAND_CATEGORY_COLORS[cmd.category] || 'bg-secondary text-secondary-foreground')}>
                      {COMMAND_CATEGORY_ICONS[cmd.category]}
                      <span className="ml-1">{cmd.category}</span>
                    </Badge>
                    {cmd.usesSource !== false && (
                      <Badge variant="outline" className="text-[10px]">Needs Source</Badge>
                    )}
                    {cmd.usesDestination !== false && (
                      <Badge variant="outline" className="text-[10px]">Needs Destination</Badge>
                    )}
                    {cmd.commonFlags.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">{cmd.commonFlags.length} common flags</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source / Destination */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Paths
                  </CardTitle>
                  {cmd?.usesSource !== false && cmd?.usesDestination !== false && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={swapSourceDest}
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Swap source &amp; destination</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {cmd?.usesSource !== false && (
                  <div className="space-y-2">
                    <Label className="text-xs">Source</Label>
                    <div className="flex gap-2">
                      <Select
                        value={source}
                        onValueChange={(v) => setSource(v === '__local__' ? '' : v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select remote..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__local__">
                            <div className="flex items-center gap-2">
                              <Folder className="h-3 w-3 text-muted-foreground" />
                              <span>Local path</span>
                            </div>
                          </SelectItem>
                          {remotes.map(r => (
                            <SelectItem key={r.name} value={`${r.name}:`}>
                              <div className="flex items-center gap-2">
                                <RemoteTypeIcon type={r.type} />
                                <span>{r.name}:</span>
                                <Badge variant="outline" className="text-[9px] px-1 ml-auto">
                                  {r.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={sourcePath}
                        onChange={(e) => setSourcePath(e.target.value)}
                        placeholder={source ? 'path/within/remote' : '/local/path'}
                        className="flex-1"
                      />
                    </div>
                    {source && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {sourceFull || 'Select a remote and enter a path'}
                      </p>
                    )}
                  </div>
                )}

                {cmd?.usesSource !== false && cmd?.usesDestination !== false && (
                  <div className="flex justify-center">
                    <div className="h-px bg-border flex-1 my-2" />
                  </div>
                )}

                {cmd?.usesDestination !== false && (
                  <div className="space-y-2">
                    <Label className="text-xs">Destination</Label>
                    <div className="flex gap-2">
                      <Select
                        value={destination}
                        onValueChange={(v) => setDestination(v === '__local__' ? '' : v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select remote..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__local__">
                            <div className="flex items-center gap-2">
                              <Folder className="h-3 w-3 text-muted-foreground" />
                              <span>Local path</span>
                            </div>
                          </SelectItem>
                          {remotes.map(r => (
                            <SelectItem key={r.name} value={`${r.name}:`}>
                              <div className="flex items-center gap-2">
                                <RemoteTypeIcon type={r.type} />
                                <span>{r.name}:</span>
                                <Badge variant="outline" className="text-[9px] px-1 ml-auto">
                                  {r.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={destPath}
                        onChange={(e) => setDestPath(e.target.value)}
                        placeholder={destination ? 'path/within/remote' : '/local/path'}
                        className="flex-1"
                      />
                    </div>
                    {destination && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {destFull || 'Select a remote and enter a path'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flags */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Options
                    {hasActiveFlags && (
                      <Badge variant="default" className="text-[10px] ml-1">
                        {activeFlagCount} active
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={flagSearch}
                      onChange={(e) => setFlagSearch(e.target.value)}
                      placeholder="Search flags..."
                      className="pl-7 h-8 w-48 text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="px-4 pt-1">
                    <TabsList className="w-full h-9">
                      <TabsTrigger value="flags" className="text-xs flex-1">
                        <Settings className="h-3 w-3 mr-1" />
                        All Flags
                      </TabsTrigger>
                      <TabsTrigger value="quick" className="text-xs flex-1">
                        <Zap className="h-3 w-3 mr-1" />
                        Quick Toggle
                      </TabsTrigger>
                      {hasActiveFlags && (
                        <TabsTrigger value="active" className="text-xs flex-1">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active ({activeFlagCount})
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <TabsContent value="quick" className="mt-0">
                    <ScrollArea className="h-[340px]">
                      <div className="p-4 grid grid-cols-1 gap-2">
                        {QUICK_FLAGS.map(flag => {
                          const isActive = flags[flag.name] === true
                          return (
                            <Tooltip key={flag.name}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition-colors',
                                    isActive
                                      ? 'border-primary bg-primary/5'
                                      : 'hover:bg-muted'
                                  )}
                                  onClick={() => toggleFlag(flag.name)}
                                >
                                  <Switch
                                    checked={isActive}
                                    className="shrink-0 pointer-events-none"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono font-medium">--{flag.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{flag.description}</p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">{flag.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="active" className="mt-0">
                    <ScrollArea className="h-[340px]">
                      <div className="p-4 space-y-2">
                        {Object.entries(flags)
                          .filter(([, v]) => v !== false && v !== '' && v !== undefined)
                          .map(([name, value]) => {
                            return (
                              <div key={name} className="flex items-center gap-2 group">
                                <Badge variant="success" className="text-[9px] px-1 shrink-0">on</Badge>
                                <span className="text-xs font-mono flex-1 truncate">--{name}</span>
                                {typeof value === 'string' && (
                                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                                    {value}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                                  onClick={() => removeFlag(name)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          })}
                        {Object.entries(flags).filter(([, v]) => v !== false && v !== '' && v !== undefined).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">
                            No active flags. Enable flags from the other tabs.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="flags" className="mt-0">
                    <ScrollArea className="h-[340px]">
                      <div className="p-4 space-y-4">
                        {filteredFlagCategories.map(([category, catFlags]) => (
                          <div key={category}>
                            <button
                              className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2 w-full hover:text-foreground transition-colors"
                              onClick={() => {
                                const next = new Set(expandedFlagCategories)
                                if (next.has(category)) next.delete(category)
                                else next.add(category)
                                setExpandedFlagCategories(next)
                              }}
                            >
                              {expandedFlagCategories.has(category)
                                ? <ChevronDown className="h-3 w-3" />
                                : <ChevronRight className="h-3 w-3" />}
                              <span className="inline-flex items-center gap-1">
                                {FLAG_CATEGORY_ICONS[category] || <Settings className="h-3 w-3" />}
                                {category}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">({catFlags.length})</span>
                              {catFlags.some(f => flags[f.name] !== undefined && flags[f.name] !== false && flags[f.name] !== '') && (
                                <Badge variant="default" className="text-[9px] ml-auto px-1">
                                  {catFlags.filter(f => flags[f.name] !== undefined && flags[f.name] !== false && flags[f.name] !== '').length}
                                </Badge>
                              )}
                            </button>
                            {expandedFlagCategories.has(category) && (
                              <div className="space-y-2 pl-5">
                                {catFlags.map(flag => (
                                  <FlagRow
                                    key={flag.name}
                                    flag={flag}
                                    value={flags[flag.name]}
                                    onToggle={() => toggleFlag(flag.name)}
                                    onChangeValue={(v) => setFlagValue(flag.name, v)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {filteredFlagCategories.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No flags match "{flagSearch}"
                          </p>
                        )}
                        {getUiMode() === 'expert' && (
                          <div className="border-t pt-4 mt-2">
                            <Label className="text-xs text-muted-foreground mb-2 block">Custom Flags</Label>
                            <Input
                              placeholder="--flag-name value --another-flag"
                              className="h-8 text-xs font-mono"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.currentTarget
                                  const text = input.value.trim()
                                  if (!text) return
                                  const parts = text.split(/\s+/)
                                  const newFlags = { ...flags }
                                  for (let i = 0; i < parts.length; i++) {
                                    if (parts[i].startsWith('--')) {
                                      const flagName = parts[i].slice(2)
                                      const nextPart = parts[i + 1]
                                      if (nextPart && !nextPart.startsWith('--')) {
                                        newFlags[flagName] = nextPart
                                        i++
                                      } else {
                                        newFlags[flagName] = true
                                      }
                                    }
                                  }
                                  setFlags(newFlags)
                                  input.value = ''
                                }
                              }}
                            />
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              Enter raw flags. Press Enter to apply.
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Generated Command */}
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Generated Command
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted p-3 relative group">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground leading-relaxed">
                    {generatedCommand.split(/(--?\S+)/g).map((part, i) => {
                      if (part.startsWith('--')) {
                        return <span key={i} className="text-blue-600 dark:text-blue-400">{part}</span>
                      }
                      if (part.startsWith('-') && part.length === 2) {
                        return <span key={i} className="text-blue-600 dark:text-blue-400">{part}</span>
                      }
                      if (part === 'rclone') {
                        return <span key={i} className="text-green-600 dark:text-green-400 font-semibold">{part}</span>
                      }
                      return <span key={i}>{part}</span>
                    })}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1.5 right-1.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Validation */}
                {validationWarnings.length > 0 && (
                  <div className="space-y-1">
                    {validationWarnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2.5 py-1.5">
                        {w.includes('Dry-run') ? (
                          <Eye className="h-3 w-3 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                        )}
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {validationErrors.length > 0 && (
                  <div className="space-y-1">
                    {validationErrors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md px-2.5 py-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleExecute}
                    className="flex-1"
                    disabled={validationErrors.length > 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Quick Toggle Flags in sidebar */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Quick Flags</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(getUiMode() === 'basic'
                      ? QUICK_FLAGS.slice(0, 3)
                      : getUiMode() === 'advanced'
                        ? QUICK_FLAGS.slice(0, 6)
                        : QUICK_FLAGS
                    ).map(flag => (
                      <div
                        key={flag.name}
                        className={cn(
                          'flex items-center gap-1.5 rounded border px-2 py-1.5 cursor-pointer text-[10px] transition-colors',
                          flags[flag.name] === true
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        )}
                        onClick={() => toggleFlag(flag.name)}
                      >
                        <div className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          flags[flag.name] === true ? 'bg-primary' : 'bg-muted-foreground/30'
                        )} />
                        {flag.label}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Saved Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Presets</Label>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={handleExportPresets}
                            disabled={commandPresets.length === 0}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export presets as JSON</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Import presets from JSON</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {commandPresets.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={presetSearch}
                        onChange={(e) => setPresetSearch(e.target.value)}
                        placeholder="Search presets..."
                        className="pl-7 h-7 text-[10px]"
                      />
                    </div>
                  )}

                  {filteredPresets.length > 0 ? (
                    <ScrollArea className="h-[140px]">
                      <div className="space-y-1.5 pr-2">
                        {filteredPresets.map(preset => (
                          <div
                            key={preset.id}
                            className="flex items-center justify-between rounded-md border p-2 group hover:bg-muted/50 transition-colors"
                          >
                            <button
                              className="flex-1 min-w-0 text-left"
                              onClick={() => handleLoadPreset(preset)}
                            >
                              <p className="text-xs font-medium truncate">{preset.name}</p>
                              {preset.description && (
                                <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground/70 font-mono truncate mt-0.5">
                                {preset.command}
                              </p>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={() => setDeletePresetId(preset.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      {presetSearch ? 'No presets match your search' : 'No presets saved yet'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* History Panel (Slide-in) */}
      {showHistory && (
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Command History
              </DialogTitle>
              <DialogDescription>
                Recent commands. Click to reload a command.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search history..."
                  className="pl-9 h-9"
                />
              </div>

              {filteredHistory.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-2">
                    {filteredHistory.map((cmd, i) => (
                      <button
                        key={i}
                        className="w-full text-left rounded-md border p-2.5 hover:bg-muted transition-colors group"
                        onClick={() => {
                          handleLoadHistory(cmd)
                          setShowHistory(false)
                        }}
                      >
                        <p className="text-xs font-mono truncate group-hover:text-primary transition-colors">
                          {cmd}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {historySearch ? 'No commands match your search' : 'No command history yet'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateSettings({ recentCommands: [] })
                  setHistorySearch('')
                }}
                disabled={recentCommands.length === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear History
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Command Preset
            </DialogTitle>
            <DialogDescription>
              Save the current command configuration for quick reuse.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive dark:text-red-400">*</span>
                </Label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g. Backup to Google Drive"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="rounded-md bg-muted p-2.5">
                <p className="text-[10px] text-muted-foreground mb-1">Command preview:</p>
                <p className="text-xs font-mono break-all text-foreground whitespace-pre-wrap">{generatedCommand}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Preset Confirmation */}
      <Dialog open={!!deletePresetId} onOpenChange={() => setDeletePresetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Preset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this preset? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePresetId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePreset}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

interface FlagRowProps {
  flag: FlagDefinition
  value: string | boolean | undefined
  onToggle: () => void
  onChangeValue: (value: string) => void
}

function FlagRow({ flag, value, onToggle, onChangeValue }: FlagRowProps) {
  const isActive = value !== undefined && value !== false && value !== ''

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-md p-1.5 transition-colors',
      isActive && 'bg-primary/5',
    )}>
      {flag.type === 'bool' ? (
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-mono', isActive && 'font-semibold text-foreground')}>
              --{flag.name}
            </span>
            {flag.short && (
              <Badge variant="outline" className="text-[9px] px-1">-{flag.short}</Badge>
            )}
            {isActive && (
              <Badge variant="success" className="text-[9px] px-1">active</Badge>
            )}
          </div>
          <Input
            value={String(value || '')}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder={flag.placeholder || flag.default?.toString() || ''}
            className="h-7 text-xs mt-1"
          />
        </div>
      )}

      {flag.type === 'bool' && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs font-mono', isActive && 'font-semibold')}>
              --{flag.name}
            </span>
            {flag.short && (
              <Badge variant="outline" className="text-[9px] px-1">-{flag.short}</Badge>
            )}
            {isActive && (
              <Badge variant="success" className="text-[9px] px-1">active</Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            {flag.description}
          </p>
          {flag.warning && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              {flag.warning}
            </p>
          )}
        </div>
      )}

      {flag.type !== 'bool' && (
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
            {flag.description}
          </p>
          {flag.warning && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">{flag.warning}</p>
          )}
        </div>
      )}
    </div>
  )
}
