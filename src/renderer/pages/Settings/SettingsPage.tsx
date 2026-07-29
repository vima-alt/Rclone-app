import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/stores/app.store'
import { cn } from '@/lib/utils'
import {
  Settings, FolderOpen, Zap, Monitor, Bell,
  RefreshCw, CheckCircle2, XCircle, Search, Download,
  Upload, Trash2, Sun, Moon, Laptop,
  FileJson, AlertTriangle, Info, Palette,
  ArrowRightLeft, Layers, Database, BookOpen, Link,
  Terminal, FileText, ChevronRight, Eye,
  ExternalLink, Globe
} from 'lucide-react'

export default function SettingsPage() {
  const settings = useAppStore()

  const [rclonePath, setRclonePath] = useState(settings.rclonePath)
  const [configPath, setConfigPath] = useState(settings.configPath)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; version?: any; error?: string } | null>(null)
  const [finding, setFinding] = useState(false)

  const [appVersion, setAppVersion] = useState('')
  const [rcloneVersion, setRcloneVersion] = useState('')
  const [setupStatus, setSetupStatus] = useState<{ found: boolean; path: string | null; version: string | null; configFound: boolean; configPath: string | null } | null>(null)

  const [logMaxSize, setLogMaxSize] = useState('10')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false)

  const [fontSize, setFontSize] = useState(settings.fontSize?.toString() || '14')
  const [compactMode, setCompactMode] = useState(settings.compactMode || false)

  useEffect(() => {
    if (settings.loaded) {
      setFontSize(settings.fontSize?.toString() || '14')
      setCompactMode(settings.compactMode || false)
    }
  }, [settings.loaded])

  useEffect(() => {
    window.electronAPI.app.getVersion().then((v) => setAppVersion(v)).catch(() => {})
    window.electronAPI.app.getSetupStatus().then((s) => setSetupStatus(s)).catch(() => {})
  }, [])

  useEffect(() => {
    if (settings.rclonePath) {
      setRcloneVersion('')
      window.electronAPI.app.testRclone(settings.rclonePath).then((result) => {
        if (result.valid && result.version) {
          setRcloneVersion(result.version.version)
        }
      }).catch(() => {})
    }
  }, [settings.rclonePath])

  const handleFind = async () => {
    setFinding(true)
    try {
      const path = await window.electronAPI.app.findRclone()
      if (path) {
        setRclonePath(path)
        settings.updateSettings({ rclonePath: path })
      }
    } finally {
      setFinding(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.app.testRclone(rclonePath)
      setTestResult(result)
    } catch (err) {
      setTestResult({ valid: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleBrowse = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [
        { name: 'Rclone', extensions: navigator.platform === 'Win32' ? ['exe'] : ['*'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (path && path[0]) {
      setRclonePath(path[0])
      settings.updateSettings({ rclonePath: path[0] })
    }
  }

  const handleConfigBrowse = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'Config', extensions: ['conf'] }]
    })
    if (path && path[0]) {
      setConfigPath(path[0])
      settings.updateSettings({ configPath: path[0] })
    }
  }

  const handleConfigBackup = async () => {
    const result = await window.electronAPI.config.backup()
    if (result) {
      await window.electronAPI.dialog.message({
        type: 'info',
        message: 'Config backup created successfully.',
        title: 'Backup Complete'
      })
    }
  }

  const handleConfigRestore = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'Config Backup', extensions: ['conf', 'bak'] }]
    })
    if (path && path[0]) {
      const confirmed = await window.electronAPI.dialog.message({
        type: 'warning',
        message: 'This will replace your current rclone configuration. Continue?',
        title: 'Restore Configuration',
        buttons: ['Cancel', 'Restore']
      })
      if (confirmed) {
        await window.electronAPI.config.restore(path[0])
        setConfigPath(path[0])
        settings.updateSettings({ configPath: path[0] })
      }
    }
  }

  const handleExportSettings = async () => {
    const path = await window.electronAPI.dialog.saveFile({
      defaultPath: 'rclone-app-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path) {
      await window.electronAPI.app.exportSettings(path)
    }
  }

  const handleImportSettings = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path && path[0]) {
      const confirmed = await window.electronAPI.dialog.message({
        type: 'warning',
        message: 'Importing settings will overwrite your current configuration. Continue?',
        title: 'Import Settings',
        buttons: ['Cancel', 'Import']
      })
      if (confirmed) {
        await window.electronAPI.app.importSettings(path[0])
        await settings.loadSettings()
      }
    }
  }

  const handleExportProfiles = async () => {
    const path = await window.electronAPI.dialog.saveFile({
      defaultPath: 'rclone-sync-profiles.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path) {
      const profiles = await window.electronAPI.profiles.list()
      const content = JSON.stringify(profiles, null, 2)
      await window.electronAPI.fs.writeFile(path, content)
    }
  }

  const handleImportProfiles = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path && path[0]) {
      const content = await window.electronAPI.fs.readFile(path[0])
      if (!content) return
      const profiles = JSON.parse(content)
      for (const profile of profiles) {
        const { id, ...rest } = profile
        await window.electronAPI.profiles.save(rest)
      }
    }
  }

  const handleExportPresets = async () => {
    const path = await window.electronAPI.dialog.saveFile({
      defaultPath: 'rclone-command-presets.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path) {
      const content = JSON.stringify(settings.commandPresets || [], null, 2)
      await window.electronAPI.fs.writeFile(path, content)
    }
  }

  const handleImportPresets = async () => {
    const path = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (path && path[0]) {
      const content = await window.electronAPI.fs.readFile(path[0])
      if (!content) return
      const presets = JSON.parse(content)
      settings.updateSettings({ commandPresets: presets })
    }
  }

  const handleResetAll = async () => {
    settings.updateSettings({
      theme: 'system',
      uiMode: 'advanced',
      language: 'en',
      defaultTransfers: 4,
      defaultCheckers: 8,
      defaultBufferSize: '16M',
      defaultBandwidthLimit: '',
      logLevel: 'INFO',
      logToFile: false,
      logFilePath: '',
      notifications: true,
      autoUpdate: true,
      tempDir: '',
      preserveRemotePasswords: false,
      defaultDedupMode: '',
      defaultSyncMode: '',
      autoMountOnStart: false,
      commandPresets: [],
    })
    setShowResetConfirm(false)
  }

  const handleClearLogs = async () => {
    const result = await window.electronAPI.app.clearLogs()
    setShowClearLogsConfirm(false)
    await window.electronAPI.dialog.message({
      type: 'info',
      message: `${result.count} log file(s) have been deleted.`,
      title: 'Logs Cleared'
    })
  }

  const handleOpenLogFolder = async () => {
    await window.electronAPI.app.openLogFolder()
  }

  const isSetupComplete = setupStatus?.found && setupStatus?.configFound

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Configure application preferences</p>
        </div>
        <Badge variant={isSetupComplete ? 'default' : 'destructive'} className="gap-1">
          {isSetupComplete ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {isSetupComplete ? 'Setup Complete' : 'Setup Incomplete'}
        </Badge>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="transfer">
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Transfer
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-1.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="logging">
            <FileText className="h-4 w-4 mr-1.5" />
            Logging
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4 mr-1.5" />
            Data
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="h-4 w-4 mr-1.5" />
            About
          </TabsTrigger>
        </TabsList>

        {/* ======================== GENERAL TAB ======================== */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Rclone Executable
              </CardTitle>
              <CardDescription>Configure the path to the rclone binary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Executable Path</Label>
                <div className="flex gap-2">
                  <Input
                    value={rclonePath}
                    onChange={(e) => setRclonePath(e.target.value)}
                    onBlur={() => {
                      if (rclonePath !== settings.rclonePath) {
                        settings.updateSettings({ rclonePath })
                      }
                    }}
                    placeholder="Path to rclone executable..."
                    className="flex-1 font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleBrowse}>Browse</Button>
                  <Button variant="outline" size="sm" onClick={handleFind} disabled={finding}>
                    {finding ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-1" />
                    )}
                    Auto-Detect
                  </Button>
                  <Button size="sm" onClick={handleTest} disabled={testing || !rclonePath}>
                    {testing ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-1" />
                    )}
                    Test
                  </Button>
                </div>
                {testResult && (
                  <div className={cn(
                    'flex items-center gap-2 text-sm p-2 rounded-md',
                    testResult.valid
                      ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
                      : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
                  )}>
                    {testResult.valid ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                    {testResult.valid
                      ? `Rclone ${testResult.version?.version} detected (${testResult.version?.os}/${testResult.version?.arch})`
                      : testResult.error}
                  </div>
                )}
                {!testResult && rcloneVersion && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Rclone {rcloneVersion}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Configuration File
              </CardTitle>
              <CardDescription>Manage the rclone configuration file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Configuration Path</Label>
                <div className="flex gap-2">
                  <Input
                    value={configPath}
                    onChange={(e) => setConfigPath(e.target.value)}
                    onBlur={() => {
                      if (configPath !== settings.configPath) {
                        settings.updateSettings({ configPath })
                      }
                    }}
                    placeholder="Path to rclone.conf..."
                    className="flex-1 font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleConfigBrowse}>Browse</Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConfigBackup}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Backup
                </Button>
                <Button variant="outline" size="sm" onClick={handleConfigRestore}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Restore
                </Button>
              </div>
              {setupStatus && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {setupStatus.found ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
                    <span className="text-muted-foreground">Rclone binary:</span>
                    <span className={setupStatus.found ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {setupStatus.found ? 'Found' : 'Not Found'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {setupStatus.configFound ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
                    <span className="text-muted-foreground">Config file:</span>
                    <span className={setupStatus.configFound ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {setupStatus.configFound ? 'Found' : 'Not Found'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications</Label>
                  <p className="text-xs text-muted-foreground">Show desktop notifications for completed transfers</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => settings.updateSettings({ notifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Update</Label>
                  <p className="text-xs text-muted-foreground">Automatically check for application updates on startup</p>
                </div>
                <Switch
                  checked={settings.autoUpdate}
                  onCheckedChange={(checked) => settings.updateSettings({ autoUpdate: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preserve Remote Passwords</Label>
                  <p className="text-xs text-muted-foreground">Store passwords in rclone config (may reduce security)</p>
                </div>
                <Switch
                  checked={settings.preserveRemotePasswords}
                  onCheckedChange={(checked) => settings.updateSettings({ preserveRemotePasswords: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Start at Windows Startup</Label>
                  <p className="text-xs text-muted-foreground">Launch Rclone App automatically when Windows starts</p>
                </div>
                <Switch
                  checked={settings.autoLaunch || false}
                  onCheckedChange={(checked) => {
                    settings.updateSettings({ autoLaunch: checked } as any)
                    window.electronAPI.app.setAutoLaunch(checked)
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Minimize to System Tray</Label>
                  <p className="text-xs text-muted-foreground">When closing the window, hide in system tray instead of quitting</p>
                </div>
                <Switch
                  checked={settings.minimizeToTray || false}
                  onCheckedChange={(checked) => {
                    settings.updateSettings({ minimizeToTray: checked } as any)
                    window.electronAPI.app.setMinimizeToTray(checked)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== TRANSFER TAB ======================== */}
        <TabsContent value="transfer" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Parallel Transfers
              </CardTitle>
              <CardDescription>Control how many files are transferred simultaneously</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Transfers</Label>
                  <Input
                    type="number"
                    min={1}
                    max={256}
                    value={settings.defaultTransfers}
                    onChange={(e) => settings.updateSettings({ defaultTransfers: parseInt(e.target.value) || 4 })}
                  />
                  <p className="text-xs text-muted-foreground">Parallel file transfers (default: 4)</p>
                </div>
                <div className="space-y-2">
                  <Label>Default Checkers</Label>
                  <Input
                    type="number"
                    min={1}
                    max={256}
                    value={settings.defaultCheckers}
                    onChange={(e) => settings.updateSettings({ defaultCheckers: parseInt(e.target.value) || 8 })}
                  />
                  <p className="text-xs text-muted-foreground">Parallel checkers for sync verification (default: 8)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Buffer &amp; Bandwidth
              </CardTitle>
              <CardDescription>Control memory usage and transfer speed limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Buffer Size</Label>
                  <Input
                    value={settings.defaultBufferSize}
                    onChange={(e) => settings.updateSettings({ defaultBufferSize: e.target.value })}
                    placeholder="16M"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">In-memory buffer per file (e.g. 16M, 64K, 1G)</p>
                </div>
                <div className="space-y-2">
                  <Label>Bandwidth Limit</Label>
                  <Input
                    value={settings.defaultBandwidthLimit}
                    onChange={(e) => settings.updateSettings({ defaultBandwidthLimit: e.target.value })}
                    placeholder="Off (unlimited)"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for unlimited. Examples: 512K, 10M</p>
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Time-based scheduling example</p>
                <p className="font-mono text-[11px]">--bwlimit "08:00,512k 12:00,10M 13:00,512k 20:00,off"</p>
                <p>Limits bandwidth to 512K during morning/evening, allows 10M at midday, unlimited at night.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Sync Behavior
              </CardTitle>
              <CardDescription>Configure default deduplication and sync modes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Dedup Mode</Label>
                  <Select
                    value={settings.defaultDedupMode || 'off'}
                    onValueChange={(v) => settings.updateSettings({ defaultDedupMode: v === 'off' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Off (no dedup)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off (no dedup)</SelectItem>
                      <SelectItem value="rename">Rename conflicting files</SelectItem>
                      <SelectItem value="older">Delete older files</SelectItem>
                      <SelectItem value="newer">Delete newer files</SelectItem>
                      <SelectItem value="largest">Delete largest files</SelectItem>
                      <SelectItem value="smallest">Delete smallest files</SelectItem>
                      <SelectItem value="first">Delete first (by name)</SelectItem>
                      <SelectItem value="last">Delete last (by name)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How to handle duplicate files during sync</p>
                </div>
                <div className="space-y-2">
                  <Label>Default Sync Mode</Label>
                  <Select
                    value={settings.defaultSyncMode || 'copy'}
                    onValueChange={(v) => settings.updateSettings({ defaultSyncMode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Copy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copy">Copy (safe, preserves source)</SelectItem>
                      <SelectItem value="sync">Sync (makes dest match source)</SelectItem>
                      <SelectItem value="bisync">BiSync (two-way sync)</SelectItem>
                      <SelectItem value="move">Move (copy then delete source)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default command for sync profile operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== APPEARANCE TAB ======================== */}
        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme
              </CardTitle>
              <CardDescription>Choose your preferred color scheme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light' as const, label: 'Light', icon: Sun, bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-800' },
                  { value: 'dark' as const, label: 'Dark', icon: Moon, bg: 'bg-gray-900', border: 'border-gray-700', text: 'text-gray-100' },
                  { value: 'system' as const, label: 'System', icon: Laptop, bg: 'bg-gradient-to-br from-white to-gray-900', border: 'border-gray-400', text: 'text-gray-600' },
                ]).map(theme => {
                  const Icon = theme.icon
                  const isActive = settings.theme === theme.value
                  return (
                    <button
                      key={theme.value}
                      onClick={() => settings.setTheme(theme.value)}
                      className={cn(
                        'relative rounded-lg border-2 p-4 text-center transition-all hover:scale-[1.02]',
                        isActive
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('mx-auto mb-2 h-12 w-20 rounded-md border flex items-center justify-center', theme.bg, theme.border)}>
                        <Icon className={cn('h-5 w-5', theme.text)} />
                      </div>
                      <span className="text-sm font-medium">{theme.label}</span>
                      {isActive && (
                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                UI Mode
              </CardTitle>
              <CardDescription>Control how many options and settings are visible</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {([
                  { value: 'basic' as const, label: 'Basic', description: 'Shows only the most commonly used options. Ideal for casual users.' },
                  { value: 'advanced' as const, label: 'Advanced', description: 'Includes most options and flags. Recommended for regular users.' },
                  { value: 'expert' as const, label: 'Expert', description: 'All options and flags are exposed. For power users who want full control.' },
                ]).map(mode => {
                  const isActive = settings.uiMode === mode.value
                  return (
                    <button
                      key={mode.value}
                      onClick={() => settings.setUiMode(mode.value)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {mode.value === 'basic' ? '1' : mode.value === 'advanced' ? '2' : '3'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{mode.label}</span>
                          {isActive && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                      </div>
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isActive && 'text-primary')} />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Display
              </CardTitle>
              <CardDescription>Adjust font size and layout density</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Size</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={10}
                    max={22}
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    onBlur={() => settings.updateSettings({ fontSize: parseInt(fontSize) || 14 })}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
                <p className="text-xs text-muted-foreground">Base font size for the application UI (12-18 recommended)</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">Reduce spacing and padding for a denser layout</p>
                </div>
                <Switch
                  checked={compactMode}
                  onCheckedChange={(checked) => {
                    setCompactMode(checked)
                    settings.updateSettings({ compactMode: checked } as any)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== LOGGING TAB ======================== */}
        <TabsContent value="logging" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Log Settings
              </CardTitle>
              <CardDescription>Configure rclone logging behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Log Level</Label>
                <Select value={settings.logLevel} onValueChange={(v) => settings.updateSettings({ logLevel: v })}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBUG">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        Debug
                      </div>
                    </SelectItem>
                    <SelectItem value="INFO">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Info
                      </div>
                    </SelectItem>
                    <SelectItem value="NOTICE">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Notice
                      </div>
                    </SelectItem>
                    <SelectItem value="WARNING">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Warning
                      </div>
                    </SelectItem>
                    <SelectItem value="ERROR">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                        Error
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Higher verbosity levels produce more detailed output</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Log to File</Label>
                  <p className="text-xs text-muted-foreground">Write rclone output to a persistent log file</p>
                </div>
                <Switch
                  checked={settings.logToFile}
                  onCheckedChange={(checked) => settings.updateSettings({ logToFile: checked })}
                />
              </div>
              {settings.logToFile && (
                <>
                  <div className="space-y-2">
                    <Label>Log File Path</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.logFilePath}
                        onChange={(e) => settings.updateSettings({ logFilePath: e.target.value })}
                        placeholder="Path to log file..."
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const path = await window.electronAPI.dialog.saveFile({
                            defaultPath: 'rclone.log',
                            filters: [{ name: 'Log', extensions: ['log'] }]
                          })
                          if (path) {
                            settings.updateSettings({ logFilePath: path })
                          }
                        }}
                      >
                        Browse
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Log File Size (MB)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={logMaxSize}
                      onChange={(e) => setLogMaxSize(e.target.value)}
                      onBlur={() => settings.updateSettings({ logMaxSizeMB: parseInt(logMaxSize) || 10 } as any)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">Log file will be rotated when it exceeds this size</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Log Maintenance
              </CardTitle>
              <CardDescription>Manage log files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowClearLogsConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear Log Files
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenLogFolder}>
                  <FolderOpen className="h-4 w-4 mr-1.5" />
                  Open Log Folder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== DATA TAB ======================== */}
        <TabsContent value="data" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Application Settings
              </CardTitle>
              <CardDescription>Export or import all application settings as JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportSettings}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export All Settings
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportSettings}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Import Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Backup Destination
              </CardTitle>
              <CardDescription>Default location for saving backup files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={settings.backupPath || ''}
                  onChange={(e) => settings.updateSettings({ backupPath: e.target.value } as any)}
                  placeholder="Default: app data directory"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" className="shrink-0"
                  onClick={async () => {
                    const result = await window.electronAPI.app.browseBackupPath({ defaultPath: settings.backupPath || '' })
                    if (!result.canceled && result.filePaths[0]) {
                      settings.updateSettings({ backupPath: result.filePaths[0] } as any)
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Where rclone config backups and exported profiles are saved by default</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Config Backup &amp; Restore
              </CardTitle>
              <CardDescription>Backup or restore the rclone configuration file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConfigBackup}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Backup Config
                </Button>
                <Button variant="outline" size="sm" onClick={handleConfigRestore}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Restore Config
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Sync Profiles
              </CardTitle>
              <CardDescription>Export or import your sync profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportProfiles}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export Profiles
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportProfiles}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Import Profiles
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Command Presets
              </CardTitle>
              <CardDescription>Export or import your saved command presets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPresets}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export Presets
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportPresets}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Import Presets
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 dark:border-red-500/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              {!showResetConfirm ? (
                <Button variant="destructive" size="sm" onClick={() => setShowResetConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Reset All Settings
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to reset all settings to defaults? This cannot be undone. Your rclone path and config path will be preserved.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleResetAll}>
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Yes, Reset Everything
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== ABOUT TAB ======================== */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Application Version</span>
                  <Badge variant="secondary" className="font-mono">{appVersion || 'Unknown'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Rclone Version</span>
                  <Badge variant="secondary" className="font-mono">{rcloneVersion || 'Not detected'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Platform</span>
                  <Badge variant="secondary" className="font-mono">{navigator.platform}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Architecture</span>
                  <Badge variant="secondary" className="font-mono">{navigator.userAgent.includes('x64') ? 'x64' : navigator.userAgent.includes('arm') ? 'arm64' : 'Unknown'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">User Agent</span>
                  <span className="text-xs text-muted-foreground font-mono max-w-xs truncate">{navigator.userAgent}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="h-4 w-4" />
                Links &amp; Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => window.electronAPI.app.openExternal('https://rclone.org')}
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Rclone Website
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => window.electronAPI.app.openExternal('https://rclone.org/docs')}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Rclone Documentation
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => window.electronAPI.app.openExternal('https://github.com/rclone/rclone')}
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Rclone on GitHub
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Separator className="my-2" />
              <p className="text-xs text-center text-muted-foreground pt-1">
                Built with Electron and React. Powered by rclone.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showClearLogsConfirm} onOpenChange={setShowClearLogsConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Log Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all log files? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearLogsConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearLogs}>Delete All Logs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
