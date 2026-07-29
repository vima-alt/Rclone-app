import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRemoteStore } from '@/stores/remote.store'
import { formatBytes, cn } from '@/lib/utils'
import {
  FolderOpen, Folder, File, FileText, FileImage, FileArchive, FileCode, FileAudio, FileVideo,
  ChevronRight, ArrowUp, RefreshCw, Home, Search, FolderPlus, Trash2,
  Download, Upload, Copy, Columns, LayoutGrid, SortAsc, SortDesc,
  MoreVertical, HardDrive, Cloud, SplitSquareVertical, X, AlertTriangle,
  Loader2, FileType
} from 'lucide-react'

interface FileEntry {
  name: string
  path: string
  size: number
  modTime: string
  isDir: boolean
  mimeType?: string
}

type SortField = 'name' | 'size' | 'modTime'
type ViewLayout = 'table' | 'grid'

interface PaneState {
  path: string
  viewMode: 'local' | 'remote'
  remoteName: string
  entries: FileEntry[]
  loading: boolean
  error: string | null
  selected: Set<string>
  searchQuery: string
  sortBy: SortField
  sortDesc: boolean
  viewLayout: ViewLayout
}

const INITIAL_PANE: PaneState = {
  path: '',
  viewMode: 'local',
  remoteName: '',
  entries: [],
  loading: false,
  error: null,
  selected: new Set(),
  searchQuery: '',
  sortBy: 'name',
  sortDesc: false,
  viewLayout: 'table',
}

const SEPARATOR = /[\\/]/

function getFileIcon(entry: FileEntry) {
  if (entry.isDir) return <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
  const ext = entry.name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext))
    return <FileImage className="h-4 w-4 text-purple-400 shrink-0" />
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext))
    return <FileArchive className="h-4 w-4 text-yellow-500 shrink-0" />
  if (['mp3', 'wav', 'flac', 'ogg', 'aac', 'wma'].includes(ext))
    return <FileAudio className="h-4 w-4 text-pink-400 shrink-0" />
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext))
    return <FileVideo className="h-4 w-4 text-red-400 dark:text-red-300 shrink-0" />
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'swift', 'kt', 'lua', 'sh', 'bash', 'ps1', 'bat', 'cmd'].includes(ext))
    return <FileCode className="h-4 w-4 text-green-500 shrink-0" />
  if (['md', 'txt', 'doc', 'docx', 'pdf', 'rtf', 'odt'].includes(ext))
    return <FileText className="h-4 w-4 text-blue-400 shrink-0" />
  if (['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(ext))
    return <FileType className="h-4 w-4 text-orange-400 shrink-0" />
  return <File className="h-4 w-4 text-muted-foreground shrink-0" />
}

function getFileTypeLabel(entry: FileEntry): string {
  if (entry.isDir) return 'Folder'
  const ext = entry.name.split('.').pop()?.toLowerCase() || ''
  if (!ext) return 'File'
  return ext.toUpperCase() + ' File'
}

function splitPath(path: string): string[] {
  if (!path) return []
  const normalized = path.replace(/\\/g, '/')
  return normalized.split('/').filter(Boolean)
}

function joinPath(parts: string[]): string {
  return parts.join('/')
}

function formatSelectedSize(entries: FileEntry[], selected: Set<string>): string {
  let total = 0
  for (const entry of entries) {
    if (selected.has(entry.path) && !entry.isDir) {
      total += entry.size
    }
  }
  return formatBytes(total)
}

export default function FileBrowser() {
  const { remotes, loadRemotes } = useRemoteStore()
  const [dualPane, setDualPane] = useState(false)
  const [panes, setPanes] = useState<PaneState[]>([
    { ...INITIAL_PANE },
    { ...INITIAL_PANE },
  ])
  const [activePane, setActivePane] = useState(0)
  const lastClickedRef = useRef<Record<number, string | null>>({ 0: null, 1: null })
  const dropTargetFolderRef = useRef<string | null>(null)

  // Dialog state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTargets, setDeleteTargets] = useState<FileEntry[]>([])
  const [operationError, setOperationError] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  useEffect(() => {
    loadRemotes()
  }, [])

  const loadDirectory = useCallback(async (paneIndex: number) => {
    setPanes(prev => {
      const next = [...prev]
      next[paneIndex] = { ...next[paneIndex], loading: true, error: null }
      return next
    })

    try {
      const pane = panes[paneIndex]
      if (pane.viewMode === 'local') {
        const path = pane.path || (await window.electronAPI.app.getConfigPath()).split(SEPARATOR).slice(0, 3).join('\\') || 'C:\\'
        const items = await window.electronAPI.fs.readDir(path)
        setPanes(prev => {
          const next = [...prev]
          next[paneIndex] = { ...next[paneIndex], entries: items, loading: false }
          return next
        })
      } else if (pane.remoteName) {
        const result = await window.electronAPI.rclone.execute({
          command: 'lsjson',
          source: `${pane.remoteName}:${pane.path}`,
          flags: { 'no-mimetype': true },
        })
        try {
          const items = JSON.parse(result.stdout)
          setPanes(prev => {
            const next = [...prev]
            next[paneIndex] = {
              ...next[paneIndex],
              entries: items.map((item: any) => ({
                name: item.Name,
                path: pane.path ? `${pane.path}/${item.Name}` : item.Name,
                size: item.Size || 0,
                modTime: item.ModTime || '',
                isDir: item.IsDir,
              })),
              loading: false,
            }
            return next
          })
        } catch {
          setPanes(prev => {
            const next = [...prev]
            next[paneIndex] = { ...next[paneIndex], entries: [], loading: false }
            return next
          })
        }
      }
    } catch (err) {
      setPanes(prev => {
        const next = [...prev]
        next[paneIndex] = { ...next[paneIndex], loading: false, error: (err as Error).message }
        return next
      })
    }
  }, [panes])

  useEffect(() => {
    loadDirectory(0)
  }, [panes[0].path, panes[0].viewMode, panes[0].remoteName])

  useEffect(() => {
    if (dualPane) {
      loadDirectory(1)
    }
  }, [dualPane, panes[1].path, panes[1].viewMode, panes[1].remoteName])

  const updatePane = useCallback((index: number, updates: Partial<PaneState>) => {
    setPanes(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }, [])

  const navigateUp = useCallback((paneIndex: number) => {
    const pane = panes[paneIndex]
    const parts = splitPath(pane.path)
    parts.pop()
    updatePane(paneIndex, { path: joinPath(parts), selected: new Set() })
  }, [panes, updatePane])

  const navigateHome = useCallback((paneIndex: number) => {
    updatePane(paneIndex, { path: '', selected: new Set() })
  }, [updatePane])

  const navigateTo = useCallback((paneIndex: number, entry: FileEntry) => {
    if (entry.isDir) {
      updatePane(paneIndex, { path: entry.path, selected: new Set() })
    }
  }, [updatePane])

  const navigateBreadcrumb = useCallback((paneIndex: number, index: number) => {
    const pane = panes[paneIndex]
    const parts = splitPath(pane.path)
    updatePane(paneIndex, { path: joinPath(parts.slice(0, index + 1)), selected: new Set() })
  }, [panes, updatePane])

  const getFilteredEntries = useCallback((paneIndex: number): FileEntry[] => {
    const pane = panes[paneIndex]
    return pane.entries
      .filter(e => !pane.searchQuery || e.name.toLowerCase().includes(pane.searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        let cmp = 0
        if (pane.sortBy === 'name') cmp = a.name.localeCompare(b.name)
        else if (pane.sortBy === 'size') cmp = a.size - b.size
        else cmp = a.modTime.localeCompare(b.modTime)
        return pane.sortDesc ? -cmp : cmp
      })
  }, [panes])

  const toggleSelect = useCallback((paneIndex: number, entryPath: string, shiftKey: boolean, ctrlKey: boolean) => {
    setPanes(prev => {
      const next = [...prev]
      const pane = { ...next[paneIndex] }
      const newSelected = new Set(pane.selected)

      if (ctrlKey) {
        if (newSelected.has(entryPath)) {
          newSelected.delete(entryPath)
        } else {
          newSelected.add(entryPath)
        }
      } else if (shiftKey && lastClickedRef.current[paneIndex]) {
        const filtered = pane.entries
          .filter(e => !pane.searchQuery || e.name.toLowerCase().includes(pane.searchQuery.toLowerCase()))
          .sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
            let cmp = 0
            if (pane.sortBy === 'name') cmp = a.name.localeCompare(b.name)
            else if (pane.sortBy === 'size') cmp = a.size - b.size
            else cmp = a.modTime.localeCompare(b.modTime)
            return pane.sortDesc ? -cmp : cmp
          })
        const lastIdx = filtered.findIndex(e => e.path === lastClickedRef.current[paneIndex])
        const currIdx = filtered.findIndex(e => e.path === entryPath)
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx)
          const end = Math.max(lastIdx, currIdx)
          for (let i = start; i <= end; i++) {
            newSelected.add(filtered[i].path)
          }
        }
      } else if (newSelected.has(entryPath) && pane.selected.size > 1) {
        newSelected.clear()
        newSelected.add(entryPath)
      } else if (newSelected.has(entryPath)) {
        newSelected.delete(entryPath)
      } else {
        newSelected.clear()
        newSelected.add(entryPath)
      }

      lastClickedRef.current[paneIndex] = entryPath
      pane.selected = newSelected
      next[paneIndex] = pane
      return next
    })
  }, [])

  const selectAll = useCallback((paneIndex: number) => {
    const filtered = getFilteredEntries(paneIndex)
    const allPaths = new Set(filtered.map(e => e.path))
    updatePane(paneIndex, { selected: allPaths })
  }, [getFilteredEntries, updatePane])

  const deselectAll = useCallback((paneIndex: number) => {
    updatePane(paneIndex, { selected: new Set() })
  }, [updatePane])

  const getSelectedEntries = useCallback((paneIndex: number): FileEntry[] => {
    const pane = panes[paneIndex]
    return pane.entries.filter(e => pane.selected.has(e.path))
  }, [panes])

  const handleSort = useCallback((paneIndex: number, field: SortField) => {
    setPanes(prev => {
      const next = [...prev]
      const pane = { ...next[paneIndex] }
      if (pane.sortBy === field) {
        pane.sortDesc = !pane.sortDesc
      } else {
        pane.sortBy = field
        pane.sortDesc = false
      }
      next[paneIndex] = pane
      return next
    })
  }, [])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const pane = panes[activePane]
    const path = pane.path ? `${pane.path}/${newFolderName.trim()}` : newFolderName.trim()
    try {
      if (pane.viewMode === 'local') {
        await window.electronAPI.fs.mkdir(path)
      } else if (pane.remoteName) {
        await window.electronAPI.rclone.execute({
          command: 'mkdir',
          source: `${pane.remoteName}:${path}`,
        })
      }
      setShowNewFolderDialog(false)
      setNewFolderName('')
      loadDirectory(activePane)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return
    const pane = panes[activePane]
    const dir = splitPath(renameTarget.path).slice(0, -1).join('/')
    const newPath = dir ? `${dir}/${renameValue.trim()}` : renameValue.trim()
    try {
      if (pane.viewMode === 'local') {
        await window.electronAPI.fs.rename(renameTarget.path, newPath)
      } else if (pane.remoteName) {
        await window.electronAPI.rclone.execute({
          command: 'moveto',
          source: `${pane.remoteName}:${renameTarget.path}`,
          destination: `${pane.remoteName}:${newPath}`,
        })
      }
      setShowRenameDialog(false)
      setRenameTarget(null)
      setRenameValue('')
      loadDirectory(activePane)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (deleteTargets.length === 0) return
    const pane = panes[activePane]
    try {
      for (const target of deleteTargets) {
        if (pane.viewMode === 'local') {
          await window.electronAPI.fs.delete(target.path, target.isDir)
        } else if (pane.remoteName) {
          await window.electronAPI.rclone.execute({
            command: target.isDir ? 'purge' : 'delete',
            source: `${pane.remoteName}:${target.path}`,
          })
        }
      }
      setShowDeleteDialog(false)
      setDeleteTargets([])
      updatePane(activePane, { selected: new Set() })
      loadDirectory(activePane)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const handleCopyBetweenPanes = async (direction: 'left-to-right' | 'right-to-left') => {
    const srcIdx = direction === 'left-to-right' ? 0 : 1
    const dstIdx = direction === 'left-to-right' ? 1 : 0
    const srcPane = panes[srcIdx]
    const dstPane = panes[dstIdx]
    const selectedEntries = getSelectedEntries(srcIdx)
    if (selectedEntries.length === 0) return

    const srcPrefix = srcPane.viewMode === 'remote' ? `${srcPane.remoteName}:` : ''
    const dstPrefix = dstPane.viewMode === 'remote' ? `${dstPane.remoteName}:` : ''

    try {
      for (const entry of selectedEntries) {
        const src = `${srcPrefix}${entry.path}`
        const dstFile = `${dstPrefix}${dstPane.path}/${entry.name}`
        await window.electronAPI.rclone.execute({
          command: 'copyto',
          source: src,
          destination: dstFile,
        })
      }
      updatePane(srcIdx, { selected: new Set() })
      loadDirectory(dstIdx)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, paneIndex: number, entry: FileEntry) => {
    const pane = panes[paneIndex]
    const entries = pane.selected.has(entry.path) 
      ? pane.entries.filter(e => pane.selected.has(e.path))
      : [entry]
    e.dataTransfer.setData('application/json', JSON.stringify({
      entries,
      sourcePane: paneIndex,
      sourceViewMode: pane.viewMode,
      sourceRemoteName: pane.remoteName,
      sourcePath: pane.path
    }))
    e.dataTransfer.effectAllowed = 'copyMove'
    
    // Create a compact drag image to avoid showing other pane content
    const dragEl = e.currentTarget as HTMLElement
    const clone = dragEl.cloneNode(true) as HTMLElement
    clone.style.position = 'absolute'
    clone.style.top = '-9999px'
    clone.style.width = '200px'
    clone.style.opacity = '0.85'
    clone.style.pointerEvents = 'none'
    clone.style.background = 'var(--background, #fff)'
    clone.style.border = '1px solid var(--border, #ccc)'
    clone.style.borderRadius = '6px'
    clone.style.padding = '4px 8px'
    clone.style.fontSize = '12px'
    clone.style.zIndex = '9999'
    document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, 100, 16)
    // Clean up after a short delay (browser needs the element during drag start)
    setTimeout(() => { document.body.removeChild(clone) }, 0)
  }, [panes])

  const handleDragOver = useCallback((e: React.DragEvent, paneIndex: number, entry?: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    if (entry?.isDir) {
      e.dataTransfer.dropEffect = 'copy'
      setDragOverPath(entry.path)
      dropTargetFolderRef.current = entry.path
    } else {
      e.dataTransfer.dropEffect = 'copy'
      setDragOverPath(panes[paneIndex].path || '__pane__')
      dropTargetFolderRef.current = null
    }
  }, [panes])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverPath(null)
    dropTargetFolderRef.current = null
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetPaneIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPath(null)
    
    const targetFolder = dropTargetFolderRef.current
    dropTargetFolderRef.current = null
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (!data.entries || data.entries.length === 0) return
    
      const targetPane = panes[targetPaneIndex]
      const srcPrefix = data.sourceViewMode === 'remote' ? `${data.sourceRemoteName}:` : ''
      const targetPrefix = targetPane.viewMode === 'remote' ? `${targetPane.remoteName}:` : ''
      
      const destDir = targetFolder || targetPane.path
      
      if (targetPaneIndex === data.sourcePane && destDir === data.sourcePath) {
        return
      }

      for (const entry of data.entries) {
        if (targetPaneIndex === data.sourcePane && entry.path === `${destDir}/${entry.name}`) continue
        if (targetPaneIndex === data.sourcePane && destDir === entry.path) continue
        if (targetPaneIndex === data.sourcePane && destDir.startsWith(entry.path + '/')) continue
        
        const src = `${srcPrefix}${entry.path}`
        const dst = `${targetPrefix}${destDir}/${entry.name}`
      
        await window.electronAPI.rclone.execute({
          command: 'copyto',
          source: src,
          destination: dst,
        })
      }
    
      loadDirectory(targetPaneIndex)
      if (targetPaneIndex !== data.sourcePane) {
        loadDirectory(data.sourcePane)
      }
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }, [panes, loadDirectory])

  const handleDownload = async () => {
    const pane = panes[activePane]
    if (pane.viewMode !== 'remote' || !pane.remoteName) return
    const selectedEntries = getSelectedEntries(activePane)
    if (selectedEntries.length === 0) return

    const dir = await window.electronAPI.dialog.openDirectory({ title: 'Select download destination' })
    if (!dir) return

    try {
      for (const entry of selectedEntries) {
        const src = `${pane.remoteName}:${entry.path}`
        const dst = `${dir}\\${entry.name}`
        await window.electronAPI.rclone.execute({
          command: 'copyto',
          source: src,
          destination: dst,
        })
      }
      loadDirectory(activePane)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const handleUpload = async () => {
    const pane = panes[activePane]
    if (pane.viewMode !== 'local') return

    const files = await window.electronAPI.dialog.openFile({ title: 'Select files to upload', properties: ['openFile', 'multiSelections'] })
    if (!files || files.length === 0) return

    if (!pane.remoteName) {
      setOperationError('No remote selected')
      return
    }

    try {
      for (const file of files) {
        const fileName = file.split(SEPARATOR).pop() || file
        const dst = `${pane.remoteName}:${pane.path}/${fileName}`
        await window.electronAPI.rclone.execute({
          command: 'copyto',
          source: file,
          destination: dst,
        })
      }
      loadDirectory(activePane)
    } catch (err) {
      setOperationError((err as Error).message)
    }
  }

  const breadcrumbs = useMemo(() => {
    return panes.map(pane => splitPath(pane.path))
  }, [panes])

  const pane0Filtered = useMemo(() => getFilteredEntries(0), [getFilteredEntries])
  const pane1Filtered = useMemo(() => getFilteredEntries(1), [getFilteredEntries])

  const renderPane = (paneIndex: number) => {
    const pane = panes[paneIndex]
    const filtered = paneIndex === 0 ? pane0Filtered : pane1Filtered
    const crumbs = breadcrumbs[paneIndex]

    return (
      <div className="flex flex-col h-full min-w-0" onClick={() => setActivePane(paneIndex)} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }} onDrop={(e) => handleDrop(e, paneIndex)}>
        {/* Pane Toolbar */}
        <div className="flex flex-col gap-2 p-3 border-b bg-muted/30">
          {/* Row 1: View mode + Remote selector */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                variant={pane.viewMode === 'local' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePane(paneIndex, { viewMode: 'local', path: '', selected: new Set() })}
              >
                <HardDrive className="h-3.5 w-3.5 mr-1.5" />
                Local
              </Button>
              <Button
                variant={pane.viewMode === 'remote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePane(paneIndex, { viewMode: 'remote', path: '', selected: new Set() })}
                disabled={remotes.length === 0}
              >
                <Cloud className="h-3.5 w-3.5 mr-1.5" />
                Remote
              </Button>
            </div>

            {pane.viewMode === 'remote' && (
              <Select
                value={pane.remoteName}
                onValueChange={(val) => updatePane(paneIndex, { remoteName: val, path: '', selected: new Set() })}
              >
                <SelectTrigger className="w-48 h-8 text-xs">
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
            )}

            <div className="flex-1" />

            {/* Layout toggle */}
            <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
              <Button
                variant={pane.viewLayout === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => updatePane(paneIndex, { viewLayout: 'table' })}
              >
                <Columns className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={pane.viewLayout === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => updatePane(paneIndex, { viewLayout: 'grid' })}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Row 2: Navigation + Path */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => navigateUp(paneIndex)} disabled={!pane.path}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => navigateHome(paneIndex)}>
              <Home className="h-3.5 w-3.5" />
            </Button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
              <button
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent shrink-0 transition-colors"
                onClick={() => updatePane(paneIndex, { path: '', selected: new Set() })}
              >
                {pane.viewMode === 'local' ? 'This PC' : (pane.remoteName || 'Remote')}
              </button>
              {crumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <button
                    className={cn(
                      "text-xs px-1 py-0.5 rounded truncate max-w-[120px] shrink-0 transition-colors",
                      i === crumbs.length - 1
                        ? "font-medium text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    onClick={() => navigateBreadcrumb(paneIndex, i)}
                    title={crumb}
                  >
                    {crumb}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => loadDirectory(paneIndex)}>
              <RefreshCw className={cn("h-3.5 w-3.5", pane.loading && "animate-spin")} />
            </Button>
          </div>

          {/* Row 3: Search + Quick actions */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={pane.searchQuery}
                onChange={(e) => updatePane(paneIndex, { searchQuery: e.target.value })}
                placeholder="Filter files..."
                className="h-8 pl-8 text-xs"
              />
              {pane.searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => updatePane(paneIndex, { searchQuery: '' })}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setNewFolderName(''); setShowNewFolderDialog(true) }}>
              <FolderPlus className="h-3.5 w-3.5 mr-1" />
              New Folder
            </Button>
            {pane.viewMode === 'remote' && pane.remoteName && (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleUpload}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={pane.selected.size === 0}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
              </>
            )}
            {pane.selected.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pane.selected.size === 0}
                  onClick={() => {
                    const sel = getSelectedEntries(paneIndex)
                    if (sel.length === 1) {
                      setRenameTarget(sel[0])
                      setRenameValue(sel[0].name)
                      setShowRenameDialog(true)
                    }
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-400"
                  onClick={() => { setDeleteTargets(getSelectedEntries(paneIndex)); setShowDeleteDialog(true) }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-hidden">
          <Card className="h-full border-0 rounded-none">
            <CardContent className="p-0 h-full">
              {pane.error ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                  <AlertTriangle className="h-10 w-10 text-destructive/60 dark:text-red-400/60" />
                  <p className="text-sm text-destructive dark:text-red-400 font-medium">Failed to load directory</p>
                  <p className="text-xs text-muted-foreground max-w-md text-center">{pane.error}</p>
                  <Button variant="outline" size="sm" onClick={() => loadDirectory(paneIndex)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                </div>
              ) : pane.loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {pane.searchQuery ? 'No files match your filter' : 'This directory is empty'}
                  </p>
                  {pane.searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => updatePane(paneIndex, { searchQuery: '' })}>
                      Clear filter
                    </Button>
                  )}
                </div>
              ) : pane.viewLayout === 'table' ? (
                <ScrollArea className="h-full">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2.5 pl-3 font-medium text-xs">
                          <input
                            type="checkbox"
                            className="rounded border-input"
                            checked={filtered.length > 0 && filtered.every(e => pane.selected.has(e.path))}
                            onChange={() => {
                              if (filtered.every(e => pane.selected.has(e.path))) {
                                deselectAll(paneIndex)
                              } else {
                                selectAll(paneIndex)
                              }
                            }}
                          />
                        </th>
                        <th
                          className="text-left p-2.5 font-medium text-xs cursor-pointer hover:bg-accent/50 select-none"
                          onClick={() => handleSort(paneIndex, 'name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {pane.sortBy === 'name' && (
                              pane.sortDesc ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-2.5 font-medium text-xs cursor-pointer hover:bg-accent/50 select-none w-24"
                          onClick={() => handleSort(paneIndex, 'size')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Size
                            {pane.sortBy === 'size' && (
                              pane.sortDesc ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-2.5 font-medium text-xs cursor-pointer hover:bg-accent/50 select-none w-36"
                          onClick={() => handleSort(paneIndex, 'modTime')}
                        >
                          <div className="flex items-center gap-1">
                            Modified
                            {pane.sortBy === 'modTime' && (
                              pane.sortDesc ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-2.5 font-medium text-xs w-28">
                          Type
                        </th>
                        <th className="w-10 p-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((entry) => (
                        <tr
                          key={entry.path}
                          draggable
                          onDragStart={(e) => handleDragStart(e, paneIndex, entry)}
                          onDragOver={(e) => handleDragOver(e, paneIndex, entry)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, paneIndex)}
                          className={cn(
                            "border-b cursor-pointer select-none transition-colors",
                            pane.selected.has(entry.path) ? "bg-accent" : "hover:bg-muted/50",
                            dragOverPath === entry.path && entry.isDir ? "ring-2 ring-primary/50 bg-primary/5" : ""
                          )}
                          onClick={(e) => toggleSelect(paneIndex, entry.path, e.shiftKey, e.ctrlKey)}
                          onDoubleClick={() => navigateTo(paneIndex, entry)}
                        >
                          <td className="p-2.5 pl-3">
                            <input
                              type="checkbox"
                              className="rounded border-input"
                              checked={pane.selected.has(entry.path)}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(entry)}
                              <span className="truncate font-medium">{entry.name}</span>
                              {entry.isDir && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                            </div>
                          </td>
                          <td className="text-right p-2.5 text-muted-foreground text-xs tabular-nums">
                            {entry.isDir ? '—' : formatBytes(entry.size)}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-xs">
                            {entry.modTime ? new Date(entry.modTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-xs">
                            {getFileTypeLabel(entry)}
                          </td>
                          <td className="p-2.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRenameTarget(entry)
                                setRenameValue(entry.name)
                                setShowRenameDialog(true)
                              }}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                /* Grid layout */
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 p-3">
                    {filtered.map((entry) => (
                      <button
                        key={entry.path}
                        draggable
                        onDragStart={(e) => handleDragStart(e, paneIndex, entry)}
                        onDragOver={(e) => handleDragOver(e, paneIndex, entry)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, paneIndex)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors text-center select-none",
                          pane.selected.has(entry.path) ? "bg-accent border-accent-foreground/20" : "hover:bg-muted/50 border-transparent hover:border-border",
                          dragOverPath === entry.path && entry.isDir ? "ring-2 ring-primary/50 bg-primary/5" : ""
                        )}
                        onClick={(e) => toggleSelect(paneIndex, entry.path, e.shiftKey, e.ctrlKey)}
                        onDoubleClick={() => navigateTo(paneIndex, entry)}
                      >
                        {entry.isDir ? (
                          <FolderOpen className="h-8 w-8 text-blue-500 shrink-0" />
                        ) : (
                          <div className="h-8 w-8 flex items-center justify-center">
                            {getFileIcon(entry)}
                          </div>
                        )}
                        <span className="text-xs font-medium truncate w-full" title={entry.name}>{entry.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.isDir ? 'Folder' : formatBytes(entry.size)}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
          <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          {pane.selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-foreground font-medium">{pane.selected.size} selected</span>
              <span>({formatSelectedSize(pane.entries, pane.selected)})</span>
            </>
          )}
          <div className="flex-1" />
          <span className="truncate max-w-[300px]" title={pane.path || '(root)'}>
            {pane.path || (pane.viewMode === 'local' ? '(home)' : pane.remoteName ? `${pane.remoteName}:/` : '(no remote)')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight">File Browser</h2>
        </div>
        <div className="flex items-center gap-2">
          {dualPane && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={panes[0].selected.size === 0}
                onClick={() => handleCopyBetweenPanes('left-to-right')}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy →
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={panes[1].selected.size === 0}
                onClick={() => handleCopyBetweenPanes('right-to-left')}
              >
                ← Copy
                <Copy className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          <Button
            variant={dualPane ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => {
              setDualPane(!dualPane)
              if (!dualPane) {
                setPanes(prev => {
                  const next = [...prev]
                  next[1] = { ...INITIAL_PANE }
                  return next
                })
              }
            }}
          >
            <SplitSquareVertical className="h-3.5 w-3.5 mr-1.5" />
            {dualPane ? 'Single Pane' : 'Dual Pane'}
          </Button>
        </div>
      </div>

      {/* Panes */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className={cn("flex-1 min-w-0 border-r", !dualPane && "border-r-0")}>
          {renderPane(0)}
        </div>
        {dualPane && (
          <div className="flex-1 min-w-0">
            {renderPane(1)}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder in the current directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
            />
          </div>
          {operationError && (
            <p className="text-sm text-destructive dark:text-red-400">{operationError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renameTarget?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-value">New name</Label>
            <Input
              id="rename-value"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
            />
          </div>
          {operationError && (
            <p className="text-sm text-destructive dark:text-red-400">{operationError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || renameValue === renameTarget?.name}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTargets.length > 0 ? `${deleteTargets.length} items` : 'item'}</DialogTitle>
            <DialogDescription>
              {deleteTargets.length === 1
                ? `Are you sure you want to delete "${deleteTargets[0]?.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${deleteTargets.length} selected items? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          {deleteTargets.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-xs space-y-1">
              {deleteTargets.slice(0, 20).map(t => (
                <div key={t.path} className="flex items-center gap-2 py-0.5">
                  {t.isDir ? <Folder className="h-3 w-3 text-blue-500" /> : <File className="h-3 w-3 text-muted-foreground" />}
                  <span className="truncate">{t.name}</span>
                </div>
              ))}
              {deleteTargets.length > 20 && (
                <p className="text-muted-foreground">...and {deleteTargets.length - 20} more</p>
              )}
            </div>
          )}
          {operationError && (
            <p className="text-sm text-destructive dark:text-red-400">{operationError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
