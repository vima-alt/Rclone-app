import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useJobStore } from '@/stores/job.store'
import { useRemoteStore } from '@/stores/remote.store'
import { formatBytes, formatSpeed, formatEta, formatDuration } from '@/lib/utils'
import {
  Square, Trash2,
  ArrowUpDown, CheckCircle2, XCircle, Clock, Loader2, Plus
} from 'lucide-react'

const STATUS_CONFIG = {
  queued: { icon: Clock, color: 'text-yellow-500', badge: 'warning' as const, label: 'Queued' },
  running: { icon: Loader2, color: 'text-blue-500', badge: 'default' as const, label: 'Running' },
  paused: { icon: Square, color: 'text-orange-500', badge: 'secondary' as const, label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'text-green-500', badge: 'success' as const, label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500 dark:text-red-400', badge: 'destructive' as const, label: 'Failed' },
  cancelled: { icon: Square, color: 'text-gray-500', badge: 'secondary' as const, label: 'Cancelled' }
}

export default function TransferQueue() {
  const { jobs, selectedJobId, selectJob, removeJob, clearCompleted } = useJobStore()
  const { remotes } = useRemoteStore()
  const [filter, setFilter] = useState<string>('all')
  const [showNewTransfer, setShowNewTransfer] = useState(false)
  const [transferCommand, setTransferCommand] = useState('copy')
  const [transferSource, setTransferSource] = useState('')
  const [transferDest, setTransferDest] = useState('')
  const [transferRunning, setTransferRunning] = useState(false)

  const filtered = jobs.filter(j => {
    if (filter === 'all') return true
    return j.status === filter
  })

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Transfer Queue</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setTransferSource(''); setTransferDest(''); setShowNewTransfer(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={clearCompleted}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Completed
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'running', 'queued', 'completed', 'failed'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {jobs.filter(j => f === 'all' || j.status === f).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[1fr_350px] overflow-hidden">
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jobs ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transfer jobs</p>
                  <p className="text-xs mt-1">Jobs will appear here when you start operations</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map(job => {
                    const config = STATUS_CONFIG[job.status]
                    const Icon = config.icon
                    const progress = job.stats
                      ? job.stats.totalBytes > 0
                        ? (job.stats.bytes / job.stats.totalBytes) * 100
                        : 0
                      : 0

                    return (
                      <div
                        key={job.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedJobId === job.id ? 'bg-accent' : ''}`}
                        onClick={() => selectJob(job.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color} ${job.status === 'running' ? 'animate-spin' : ''}`} />
                            <span className="font-medium text-sm">{job.command}</span>
                          </div>
                          <Badge variant={config.badge} className="text-[10px]">{config.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {job.source && <span>{job.source}</span>}
                          {job.source && job.destination && <span> → </span>}
                          {job.destination && <span>{job.destination}</span>}
                        </div>
                        {job.status === 'running' && job.stats && (
                          <div className="space-y-1">
                            <Progress value={progress} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{formatBytes(job.stats.bytes)} / {formatBytes(job.stats.totalBytes)}</span>
                              <span>{formatSpeed(job.stats.speed)}</span>
                              <span>ETA: {formatEta(job.stats.eta)}</span>
                            </div>
                          </div>
                        )}
                        {job.error && (
                          <p className="text-xs text-destructive dark:text-red-400 mt-1 truncate">{job.error}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {selectedJob ? (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={STATUS_CONFIG[selectedJob.status].badge}>
                      {STATUS_CONFIG[selectedJob.status].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Command</span>
                    <span className="font-mono">{selectedJob.command}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{selectedJob.source || '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{selectedJob.destination || '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{formatDuration(((selectedJob.endTime || Date.now()) - selectedJob.startTime) / 1000)}</span>
                  </div>
                </div>

                {selectedJob.stats && (
                  <>
                    <div className="text-xs font-medium text-muted-foreground">Transfer Stats</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Transferred: </span>{formatBytes(selectedJob.stats.bytes)}</div>
                      <div><span className="text-muted-foreground">Speed: </span>{formatSpeed(selectedJob.stats.speed)}</div>
                      <div><span className="text-muted-foreground">Total: </span>{formatBytes(selectedJob.stats.totalBytes)}</div>
                      <div><span className="text-muted-foreground">Files: </span>{selectedJob.stats.transfers}/{selectedJob.stats.totalTransfers}</div>
                      <div><span className="text-muted-foreground">Errors: </span>{selectedJob.stats.errors}</div>
                      <div><span className="text-muted-foreground">Checks: </span>{selectedJob.stats.totalChecks}</div>
                    </div>
                  </>
                )}

                {selectedJob.logs.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-muted-foreground">Logs</div>
                    <ScrollArea className="h-48">
                      <div className="font-mono text-xs space-y-0.5">
                        {selectedJob.logs.slice(-50).map((log, i) => (
                          <div key={i} className={log.includes('[stderr]') ? 'text-red-400 dark:text-red-300' : 'text-muted-foreground'}>
                            {log.replace(/^\[(stdout|stderr)\]\s*/, '')}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}

                <div className="flex gap-2">
                  {(selectedJob.status === 'running' || selectedJob.status === 'queued' || selectedJob.status === 'paused') && (
                    <Button variant="outline" size="sm" onClick={() => window.electronAPI.jobs.stop(selectedJob.id)}>
                      <Square className="h-3 w-3 mr-1" /> Stop
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (selectedJob.status === 'running' || selectedJob.status === 'queued' || selectedJob.status === 'paused') {
                      await window.electronAPI.jobs.stop(selectedJob.id)
                    }
                    removeJob(selectedJob.id)
                    selectJob(null)
                  }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground p-4">
                <p className="text-sm">Select a job to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Transfer Dialog */}
      <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transfer</DialogTitle>
            <DialogDescription>
              Specify source and destination paths. Use remotes with the format "remote:path".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Command</Label>
              <Select value={transferCommand} onValueChange={setTransferCommand}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy">Copy</SelectItem>
                  <SelectItem value="move">Move</SelectItem>
                  <SelectItem value="sync">Sync</SelectItem>
                  <SelectItem value="bisync">Bi-sync</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-source">Source</Label>
              <Input
                id="transfer-source"
                value={transferSource}
                onChange={(e) => setTransferSource(e.target.value)}
                placeholder="e.g. remote:path/to/files or C:\Users\..."
              />
              {remotes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {remotes.map(r => (
                    <Button
                      key={r.name}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setTransferSource(`${r.name}:`)}
                    >
                      {r.name}:
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-dest">Destination</Label>
              <Input
                id="transfer-dest"
                value={transferDest}
                onChange={(e) => setTransferDest(e.target.value)}
                placeholder="e.g. remote:backup or D:\Backups"
              />
              {remotes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {remotes.map(r => (
                    <Button
                      key={r.name}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setTransferDest(`${r.name}:`)}
                    >
                      {r.name}:
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTransfer(false)}>Cancel</Button>
            <Button
              disabled={!transferSource || !transferDest || transferRunning}
              onClick={async () => {
                setTransferRunning(true)
                try {
                  await window.electronAPI.rclone.execute({
                    command: transferCommand,
                    source: transferSource,
                    destination: transferDest,
                    flags: { progress: true }
                  })
                } catch {
                  // errors handled by job listener
                } finally {
                  setTransferRunning(false)
                  setShowNewTransfer(false)
                }
              }}
            >
              {transferRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpDown className="h-4 w-4 mr-2" />}
              Start Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
