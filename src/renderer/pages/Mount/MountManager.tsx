import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { useRemoteStore } from '@/stores/remote.store'
import { useAppStore } from '@/stores/app.store'
import { useMountStore, type MountEntry } from '@/stores/mount.store'
import { Mountain, Play, Square, AlertTriangle, Download, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const WINFSP_DOWNLOAD_URL = 'https://winfsp.dev/rel/'

export default function MountManager() {
  const { remotes } = useRemoteStore()
  const settings = useAppStore()
  const { mounts, addMount, removeMount, setMounts } = useMountStore()
  const [remote, setRemote] = useState('')
  const [mountPoint, setMountPoint] = useState('')
  const [mountType, setMountType] = useState('mount')
  const [mountOptions, setMountOptions] = useState({
    allowOther: false,
    allowNonEmpty: false,
    vfsCacheMode: 'full',
    pollInterval: '1m'
  })

  const [winfspStatus, setWinfspStatus] = useState<'loading' | 'found' | 'missing' | 'skipped' | 'not-windows'>('loading')
  const [winfspPath, setWinfspPathState] = useState<string | null>(null)
  const [showWinfspDialog, setShowWinfspDialog] = useState(false)

  const checkWinfsp = useCallback(async () => {
    if (navigator.platform !== 'Win32') {
      setWinfspStatus('not-windows')
      return
    }
    if (settings.winfspSkipped) {
      setWinfspStatus('skipped')
      return
    }
    if (settings.winfspPath) {
      setWinfspStatus('found')
      setWinfspPathState(settings.winfspPath)
      return
    }
    setWinfspStatus('loading')
    try {
      const result = await window.electronAPI.mount.checkWinFsp()
      if (result.installed) {
        setWinfspStatus('found')
        setWinfspPathState(result.path)
      } else {
        setWinfspStatus('missing')
      }
    } catch {
      setWinfspStatus('missing')
    }
  }, [settings.winfspPath, settings.winfspSkipped])

  useEffect(() => {
    checkWinfsp()
    window.electronAPI.mount.listActive().then((activeMounts: any[]) => {
      setMounts(activeMounts)
    })
  }, [])

  const isWindows = navigator.platform === 'Win32'

  const handleMount = async () => {
    if (!remote || !mountPoint) return

    if (isWindows && mountType === 'mount' && winfspStatus !== 'found' && winfspStatus !== 'not-windows') {
      setShowWinfspDialog(true)
      return
    }

    const flags: Record<string, any> = {
      'vfs-cache-mode': mountOptions.vfsCacheMode,
      'poll-interval': mountOptions.pollInterval,
      'allow-other': mountOptions.allowOther,
      'allow-non-empty': mountOptions.allowNonEmpty
    }

    const result = await window.electronAPI.mount.doMount({
      remote,
      mountPoint,
      type: mountType,
      flags
    })

    addMount({
      id: Math.random().toString(36).slice(2),
      remote,
      mountPoint,
      type: mountType,
      status: result.exitCode === 0 ? 'mounted' : 'error',
      pid: result.pid
    })
  }

  const handleUnmount = async (mount: MountEntry) => {
    await window.electronAPI.mount.doUnmount({
      remote: mount.remote,
      mountPoint: mount.mountPoint,
      pid: mount.pid
    })
    removeMount(mount.id)
  }

  const handleAutoDetectWinfsp = async () => {
    setWinfspStatus('loading')
    try {
      const path = await window.electronAPI.mount.findWinFsp()
      if (path) {
        setWinfspPathState(path)
        setWinfspStatus('found')
        await settings.updateSettings({ winfspPath: path })
      } else {
        setWinfspStatus('missing')
      }
    } catch {
      setWinfspStatus('missing')
    }
  }

  const handleBrowseWinfsp = async () => {
    const selected = await window.electronAPI.dialog.openFile({
      title: 'Select winfsp-x64.dll',
      filters: [
        { name: 'WinFsp DLL', extensions: ['dll'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (selected && selected[0]) {
      setWinfspPathState(selected[0])
      setWinfspStatus('found')
      await settings.updateSettings({ winfspPath: selected[0] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mount Manager</h2>
        <p className="text-muted-foreground">Mount Rclone remotes as local drives</p>
      </div>

      {isWindows && (
        <Card className={winfspStatus === 'found' ? 'border-green-500/30' : winfspStatus === 'missing' ? 'border-destructive/30 dark:border-red-500/30' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">WinFsp (Windows File System Proxy)</CardTitle>
                {winfspStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {winfspStatus === 'found' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {(winfspStatus === 'missing' || winfspStatus === 'skipped') && <XCircle className="h-4 w-4 text-destructive dark:text-red-400" />}
              </div>
              {winfspStatus === 'found' && (
                <Badge variant="outline" className="text-[10px] text-green-500">Detected</Badge>
              )}
              {winfspStatus === 'skipped' && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Skipped</Badge>
              )}
              {winfspStatus === 'missing' && (
                <Badge variant="destructive" className="text-[10px]">Required</Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {winfspStatus === 'found'
                ? `WinFsp is installed${winfspPath ? ` (${winfspPath})` : ''}`
                : winfspStatus === 'skipped'
                  ? 'WinFsp detection was skipped. Mounting may not work.'
                  : 'Required for rclone mount on Windows'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {winfspStatus === 'loading' ? (
              <p className="text-xs text-muted-foreground">Detecting WinFsp installation...</p>
            ) : winfspStatus === 'found' ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAutoDetectWinfsp}>
                  Re-detect
                </Button>
              </div>
            ) : winfspStatus === 'skipped' ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAutoDetectWinfsp}>
                  Re-detect
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBrowseWinfsp}>
                  Browse for DLL
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAutoDetectWinfsp}>
                  Auto-detect
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBrowseWinfsp}>
                  Browse for DLL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setWinfspStatus('skipped')
                    settings.updateSettings({ winfspSkipped: true })
                  }}
                >
                  Skip for now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Mount</CardTitle>
          <CardDescription>Mount a remote as a local filesystem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Remote</Label>
              <Select value={remote} onValueChange={setRemote}>
                <SelectTrigger>
                  <SelectValue placeholder="Select remote..." />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name} ({r.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mount Type</Label>
              <Select value={mountType} onValueChange={setMountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mount">FUSE Mount</SelectItem>
                  <SelectItem value="nfsmount">NFS Mount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mount Point</Label>
            <Input
              value={mountPoint}
              onChange={(e) => setMountPoint(e.target.value)}
              placeholder={isWindows ? 'Z:' : '/mnt/rclone'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>VFS Cache Mode</Label>
              <Select
                value={mountOptions.vfsCacheMode}
                onValueChange={(v) => setMountOptions(prev => ({ ...prev, vfsCacheMode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="writes">Writes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Poll Interval</Label>
              <Input
                value={mountOptions.pollInterval}
                onChange={(e) => setMountOptions(prev => ({ ...prev, pollInterval: e.target.value }))}
                placeholder="1m"
              />
            </div>
          </div>

          <Button onClick={handleMount} disabled={!remote || !mountPoint}>
            <Play className="h-4 w-4 mr-2" />
            Mount
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Mounts ({mounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active mounts</p>
          ) : (
            <div className="space-y-3">
              {mounts.map(mount => (
                <div key={mount.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{mount.remote}: → {mount.mountPoint}</p>
                      <p className="text-xs text-muted-foreground">{mount.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={mount.status === 'mounted' ? 'default' : 'destructive'}>
                      {mount.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleUnmount(mount)}>
                      <Square className="h-3 w-3 mr-1" />
                      Unmount
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WinFsp Required Dialog */}
      <Dialog open={showWinfspDialog} onOpenChange={setShowWinfspDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              WinFsp Required
            </DialogTitle>
            <DialogDescription>
              Rclone mount on Windows requires <strong>WinFsp (Windows File System Proxy)</strong> to create
              a virtual filesystem. Please install WinFsp to use the mount feature.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 text-xs space-y-1">
            <p className="font-medium">What is WinFsp?</p>
            <p className="text-muted-foreground">
              WinFsp provides a FUSE (Filesystem in Userspace) implementation for Windows,
              allowing rclone to mount remotes as local drive letters.
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowWinfspDialog(false)}
            >
              OK
            </Button>
            <Button
              onClick={() => {
                window.electronAPI.app.openExternal(WINFSP_DOWNLOAD_URL)
                setShowWinfspDialog(false)
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download WinFsp
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
