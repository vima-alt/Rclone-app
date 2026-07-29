import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useJobStore } from '@/stores/job.store'
import { generateId } from '@/lib/utils'
import { parseAnsi } from '@/lib/ansi'
import { Terminal, Search, Copy, Download, Trash2, ArrowDown, Pause, Play, ZoomIn, ZoomOut, WrapText, Maximize2, X, ChevronRight } from 'lucide-react'
import type { JobStatus, TerminalLine } from '../../../shared/types'

const STREAM_COLORS: Record<string, string> = {
  stdout: 'text-foreground',
  stderr: 'text-red-400 dark:text-red-300',
  system: 'text-blue-400'
}

const STREAM_BADGE_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  stdout: 'default',
  stderr: 'destructive',
  system: 'secondary'
}

const STATUS_FILTER_OPTIONS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Queued', value: 'queued' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' }
]

function parseLogLine(raw: string, index: number): TerminalLine {
  const timestampMatch = raw.match(/^\[([^\]]+)\]\s*/)
  if (timestampMatch) {
    const ts = timestampMatch[1]
    const rest = raw.slice(timestampMatch[0].length)
    let stream: TerminalLine['stream'] = 'stdout'
    if (rest.startsWith('(stderr)')) {
      stream = 'stderr'
      return { id: index, timestamp: 0, stream, content: rest.slice(8).trimStart(), ansiClasses: [] }
    }
    if (rest.startsWith('(system)')) {
      stream = 'system'
      return { id: index, timestamp: 0, stream, content: rest.slice(8).trimStart(), ansiClasses: [] }
    }
    const parsed = Date.parse(ts)
    return {
      id: index,
      timestamp: isNaN(parsed) ? 0 : parsed,
      stream,
      content: rest,
      ansiClasses: []
    }
  }
  return { id: index, timestamp: 0, stream: 'stdout', content: raw, ansiClasses: [] }
}

function formatTimestamp(ts: number): string {
  if (ts === 0) return ''
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

interface TerminalOutputProps {
  jobId?: string
}

export default function TerminalOutput({ jobId: initialJobId }: TerminalOutputProps) {
  const jobs = useJobStore(s => s.jobs)
  const selectedJobId = useJobStore(s => s.selectedJobId)
  const selectJob = useJobStore(s => s.selectJob)
  const removeJob = useJobStore(s => s.removeJob)

  const activeJobId = initialJobId || selectedJobId
  const activeJob = useMemo(() => jobs.find(j => j.id === activeJobId) || null, [jobs, activeJobId])

  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [fontSize, setFontSize] = useState(12)
  const [wordWrap, setWordWrap] = useState(true)
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr' | 'system'>('all')
  const [maximized, setMaximized] = useState(false)
  const [customCommand, setCustomCommand] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const filteredJobs = useMemo(() => {
    return statusFilter === 'all'
      ? jobs
      : jobs.filter(j => j.status === statusFilter)
  }, [jobs, statusFilter])

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const aRunning = a.status === 'running' ? 0 : 1
      const bRunning = b.status === 'running' ? 0 : 1
      if (aRunning !== bRunning) return aRunning - bRunning
      return b.startTime - a.startTime
    })
  }, [filteredJobs])

  const terminalLines: TerminalLine[] = useMemo(() => {
    if (!activeJob) return []
    return activeJob.logs.map((raw, i) => parseLogLine(raw, i))
  }, [activeJob?.logs])

  const displayedLines = useMemo(() => {
    let lines = terminalLines

    if (streamFilter !== 'all') {
      lines = lines.filter(l => l.stream === streamFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      lines = lines.filter(l => l.content.toLowerCase().includes(q))
    }

    return lines
  }, [terminalLines, streamFilter, searchQuery])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (autoScroll && !isPaused) {
      scrollToBottom()
    }
  }, [displayedLines.length, autoScroll, isPaused, scrollToBottom])

  const handleSelectJob = useCallback((jobId: string) => {
    selectJob(jobId)
    if (autoScroll) {
      setTimeout(scrollToBottom, 50)
    }
  }, [selectJob, autoScroll, scrollToBottom])

  const handleClear = useCallback(() => {
    if (activeJobId) {
      const job = jobs.find(j => j.id === activeJobId)
      if (job) {
        useJobStore.setState(state => ({
          jobs: state.jobs.map(j =>
            j.id === activeJobId ? { ...j, logs: [] } : j
          )
        }))
      }
    }
  }, [activeJobId, jobs])

  const handleCopyAll = useCallback(async () => {
    const text = displayedLines
      .map(l => {
        const ts = formatTimestamp(l.timestamp)
        return ts ? `[${ts}] ${l.content}` : l.content
      })
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [displayedLines])

  const handleSaveToFile = useCallback(() => {
    const text = displayedLines
      .map(l => {
        const ts = formatTimestamp(l.timestamp)
        const streamTag = `[${l.stream}]`
        return ts ? `${ts} ${streamTag} ${l.content}` : `${streamTag} ${l.content}`
      })
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const jobName = activeJob ? activeJob.command : 'terminal'
    a.download = `rclone-output-${jobName}-${new Date().toISOString().split('T')[0]}.log`
    a.click()
    URL.revokeObjectURL(url)
  }, [displayedLines, activeJob])

  const increaseFontSize = useCallback(() => setFontSize(s => Math.min(s + 1, 24)), [])
  const decreaseFontSize = useCallback(() => setFontSize(s => Math.max(s - 1, 8)), [])

  const stdoutCount = terminalLines.filter(l => l.stream === 'stdout').length
  const stderrCount = terminalLines.filter(l => l.stream === 'stderr').length
  const systemCount = terminalLines.filter(l => l.stream === 'system').length

  const getStatusBadge = (status: JobStatus) => {
    const variants: Record<JobStatus, { className: string }> = {
      queued: { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      running: { className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      paused: { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      completed: { className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      failed: { className: 'bg-red-500/20 text-red-400 border-red-500/30 dark:bg-red-500/30 dark:text-red-300 dark:border-red-500/40' },
      cancelled: { className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    }
    return variants[status] || variants.queued
  }

  const handleRunCustomCommand = useCallback(async () => {
    const trimmed = customCommand.trim()
    if (!trimmed) return

    let cmdLine = trimmed
    if (cmdLine.startsWith('rclone ')) cmdLine = cmdLine.slice(7).trimStart()
    const parts = cmdLine.split(' ').filter(Boolean)
    const cmdName = parts[0]
    const cmdArgs = parts.slice(1)

    const jobId = generateId()
    const job = {
      id: jobId,
      command: cmdName,
      args: cmdArgs,
      source: cmdArgs[0] || '',
      destination: cmdArgs[1] || '',
      status: 'running' as const,
      stats: null,
      startTime: Date.now(),
      logs: []
    }

    useJobStore.getState().addJob(job)
    useJobStore.getState().selectJob(jobId)
    setCustomCommand('')

    await window.electronAPI.rclone.executeStream(
      { id: jobId, command: cmdName, args: cmdArgs, source: cmdArgs[0] || '', destination: cmdArgs[1] || '' },
      { command: cmdName, source: cmdArgs[0] || '', destination: cmdArgs[1] || '', flags: {} }
    )
  }, [customCommand])

  const handleCommandKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRunCustomCommand()
  }, [handleRunCustomCommand])

  return (
    <div className={`space-y-4 h-full flex flex-col ${maximized ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">Terminal Output</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMaximized(!maximized)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
        <Card className="w-64 shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Jobs</CardTitle>
          </CardHeader>
          <div className="px-3 pb-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              {STATUS_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {sortedJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 px-3">
                  No jobs found
                </p>
              ) : (
                sortedJobs.map(job => (
                  <div
                    key={job.id}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/50 transition-colors cursor-pointer group ${
                      activeJobId === job.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleSelectJob(job.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate max-w-[120px]">
                        {job.command}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 ${getStatusBadge(job.status).className}`}
                        >
                          {job.status}
                        </Badge>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive dark:hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeJob(job.id)
                            if (activeJobId === job.id) selectJob(null)
                          }}
                          title="Remove job"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {job.source && job.destination
                        ? `${job.source} → ${job.destination}`
                        : job.args?.slice(0, 3).join(' ') || 'No arguments'}
                    </div>
                    {job.logs.length > 0 && (
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{job.logs.length} lines</span>
                        {job.error && (
                          <span className="text-red-400 dark:text-red-300">error</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 min-w-[200px]">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                placeholder="Type a custom rclone command (e.g. rclone copy /src remote:dst -vP)..."
                className="pl-9 h-8 text-xs font-mono"
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-8"
              onClick={handleRunCustomCommand}
              disabled={!customCommand.trim()}
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              Run
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search output..."
                className="pl-9 h-8 text-xs"
              />
              {searchQuery && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {displayedLines.length} matches
                </span>
              )}
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleCopyAll}
                title="Copy output"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleSaveToFile}
                title="Save to file"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleClear}
                title="Clear output"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {activeJobId && (activeJob?.status === 'completed' || activeJob?.status === 'failed' || activeJob?.status === 'cancelled') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-400"
                  onClick={() => { removeJob(activeJobId); selectJob(null) }}
                  title="Remove job"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button
                variant={autoScroll ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setAutoScroll(!autoScroll)}
                title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={isPaused ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={decreaseFontSize} title="Decrease font size">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground w-6 text-center">{fontSize}</span>
              <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={increaseFontSize} title="Increase font size">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <div className="flex items-center gap-1.5">
                <WrapText className="h-3.5 w-3.5 text-muted-foreground" />
                <Switch
                  checked={wordWrap}
                  onCheckedChange={setWordWrap}
                  className="scale-75"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {(['all', 'stdout', 'stderr', 'system'] as const).map(stream => (
              <Button
                key={stream}
                variant={streamFilter === stream ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setStreamFilter(stream)}
              >
                {stream === 'all' ? 'All' : stream}
                {stream === 'stdout' && <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-3">{stdoutCount}</Badge>}
                {stream === 'stderr' && <Badge variant="destructive" className="ml-1 text-[9px] px-1 h-3">{stderrCount}</Badge>}
                {stream === 'system' && <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-3">{systemCount}</Badge>}
              </Button>
            ))}

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Badge variant="outline" className="text-[10px] font-mono">
              {displayedLines.length} / {terminalLines.length} lines
            </Badge>
          </div>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-hidden p-0">
              {!activeJob ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Terminal className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Select a job to view terminal output</p>
                  <p className="text-xs mt-1">
                    {jobs.length === 0 ? 'No jobs have been run yet' : 'Choose a job from the list'}
                  </p>
                </div>
              ) : displayedLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Terminal className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No matching output' : 'No output yet'}
                  </p>
                  <p className="text-xs mt-1">
                    {searchQuery ? 'Try a different search query' : 'Output will appear here when the job runs'}
                  </p>
                </div>
              ) : (
                <div
                  ref={scrollRef}
                  className="h-full overflow-y-auto"
                  onScroll={(e) => {
                    const target = e.currentTarget
                    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
                    if (!atBottom && autoScroll) {
                      setAutoScroll(false)
                    }
                  }}
                >
                  <div
                    className="p-3 font-mono"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {displayedLines.map((line, idx) => {
                      const ansiHtml = parseAnsi(line.content)
                      const ts = formatTimestamp(line.timestamp)
                      const streamColor = STREAM_COLORS[line.stream]

                      return (
                        <div
                          key={line.id}
                          className={`flex gap-0 leading-relaxed hover:bg-muted/30 group ${
                            wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
                          }`}
                        >
                          <span className="inline-block w-12 shrink-0 text-right pr-2 text-muted-foreground/50 select-none text-[10px] leading-[inherit]">
                            {idx + 1}
                          </span>

                          {ts && (
                            <span className="inline-block shrink-0 text-muted-foreground/40 select-none text-[10px] leading-[inherit] pr-2">
                              {ts}
                            </span>
                          )}

                          <span className="inline-block shrink-0 w-2 pr-1 text-[10px] leading-[inherit]">
                            <Badge
                              variant={STREAM_BADGE_VARIANTS[line.stream]}
                              className="text-[7px] px-0.5 py-0 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {line.stream[0].toUpperCase()}
                            </Badge>
                          </span>

                          <span
                            className={`flex-1 ${streamColor}`}
                            dangerouslySetInnerHTML={{ __html: ansiHtml }}
                          />
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {activeJob && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span>Job: {activeJob.command}</span>
              {activeJob.source && activeJob.destination && (
                <span>{activeJob.source} → {activeJob.destination}</span>
              )}
              <span>Started: {new Date(activeJob.startTime).toLocaleTimeString()}</span>
              {activeJob.endTime && (
                <span>Ended: {new Date(activeJob.endTime).toLocaleTimeString()}</span>
              )}
              {activeJob.error && (
                <span className="text-red-400 dark:text-red-300">Error: {activeJob.error}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
