import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, RefreshCw } from 'lucide-react'

export default function LogViewer() {
  const [logFiles, setLogFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [logContent, setLogContent] = useState('')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLogFiles()
  }, [])

  useEffect(() => {
    if (selectedFile) {
      loadLogFile(selectedFile)
    }
  }, [selectedFile])

  const loadLogFiles = async () => {
    const logDir = await window.electronAPI.app.getLogDir()
    const files = await window.electronAPI.fs.readDir(logDir)
    const logs = files
      .filter((f: any) => f.name.endsWith('.log'))
      .map((f: any) => f.name)
      .sort()
      .reverse()
    setLogFiles(logs)
    if (logs.length > 0 && !selectedFile) {
      setSelectedFile(logs[0])
    }
  }

  const loadLogFile = async (filename: string) => {
    try {
      const logDir = await window.electronAPI.app.getLogDir()
      const sep = navigator.platform === 'Win32' ? '\\' : '/'
      const content = await window.electronAPI.fs.readFile(`${logDir}${sep}${filename}`)
      setLogContent(content || '')
    } catch {
      setLogContent('Failed to load log file')
    }
  }

  const lines = logContent.split('\n').filter(Boolean)

  const filteredLines = lines.filter(line => {
    if (search && !line.toLowerCase().includes(search.toLowerCase())) return false
    if (levelFilter !== 'all' && !line.includes(`[${levelFilter}]`)) return false
    return true
  })

  const getLevelColor = (line: string): string => {
    if (line.includes('[ERROR]')) return 'text-red-400 dark:text-red-300'
    if (line.includes('[WARNING]')) return 'text-yellow-400'
    if (line.includes('[NOTICE]')) return 'text-blue-400'
    if (line.includes('[INFO]')) return 'text-green-400'
    if (line.includes('[DEBUG]')) return 'text-gray-400'
    return 'text-muted-foreground'
  }

  const handleExport = () => {
    const blob = new Blob([filteredLines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-export-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Log Viewer</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogFiles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="pl-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="NOTICE">Notice</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="DEBUG">Debug</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr] flex-1 overflow-hidden">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Log Files</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              {logFiles.map(file => (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted ${selectedFile === file ? 'bg-accent font-medium' : ''}`}
                >
                  {file}
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs">
              {selectedFile || 'Select a log file'}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {filteredLines.length} lines
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[calc(100vh-320px)]" ref={scrollRef}>
              <div className="p-3 font-mono text-xs space-y-0.5">
                {filteredLines.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No log entries</p>
                ) : (
                  filteredLines.map((line, i) => (
                    <div key={i} className={`whitespace-pre-wrap break-all ${getLevelColor(line)}`}>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
