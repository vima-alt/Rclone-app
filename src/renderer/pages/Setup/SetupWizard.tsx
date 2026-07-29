import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/stores/app.store'
import { Zap, Search, FolderOpen, CheckCircle2, XCircle, Download, ArrowRight, ArrowLeft, Settings } from 'lucide-react'

const STEPS = ['Welcome', 'Rclone Detection', 'Configuration']
const STEP_ICONS = [Zap, Search, Settings]
const DOWNLOAD_URL = 'https://rclone.org/downloads/'

interface RcloneTestResult {
  valid: boolean
  version?: { version: string; os: string; arch: string }
  error?: string
}

export default function SetupWizard() {
  const [step, setStep] = useState(0)
  const [searching, setSearching] = useState(false)
  const [rclonePath, setRclonePath] = useState('')
  const [testResult, setTestResult] = useState<RcloneTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [configPath, setConfigPath] = useState('')
  const [configFound, setConfigFound] = useState<boolean | null>(null)
  const [configSearching, setConfigSearching] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const updateSettings = useAppStore(s => s.updateSettings)
  const loadSettings = useAppStore(s => s.loadSettings)

  const detectRclone = useCallback(async () => {
    setSearching(true)
    try {
      const found = await window.electronAPI.app.findRclone()
      if (found) {
        setRclonePath(found)
        const result: RcloneTestResult = await window.electronAPI.app.testRclone(found)
        setTestResult(result)
      }
    } catch {
      // silently fail - user can browse or enter manually
    } finally {
      setSearching(false)
    }
  }, [])

  const detectConfig = useCallback(async () => {
    setConfigSearching(true)
    try {
      const found = await window.electronAPI.config.find()
      if (found) {
        setConfigPath(found)
        setConfigFound(true)
      } else {
        const defaultPath = await window.electronAPI.app.getConfigPath()
        setConfigPath(defaultPath)
        setConfigFound(false)
      }
    } catch {
      setConfigFound(false)
    } finally {
      setConfigSearching(false)
    }
  }, [])

  const [configDetecting, setConfigDetecting] = useState(false)

  useEffect(() => {
    if (step === 1 && !rclonePath && !searching) {
      detectRclone()
    }
    if (step === 2 && !configPath && !configSearching && !configDetecting) {
      setConfigDetecting(true)
      detectConfig()
    }
  }, [step])

  const handleTestRclone = async () => {
    if (!rclonePath) return
    setTesting(true)
    setTestResult(null)
    try {
      const result: RcloneTestResult = await window.electronAPI.app.testRclone(rclonePath)
      setTestResult(result)
    } catch (err) {
      setTestResult({ valid: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleBrowseRclone = async () => {
    const selected = await window.electronAPI.dialog.openFile({
      filters: [
        { name: 'Rclone', extensions: navigator.platform === 'Win32' ? ['exe'] : ['*'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (selected && selected[0]) {
      setRclonePath(selected[0])
      setTestResult(null)
    }
  }

  const handleBrowseConfig = async () => {
    const selected = await window.electronAPI.dialog.openFile({
      filters: [{ name: 'Rclone Config', extensions: ['conf'] }]
    })
    if (selected && selected[0]) {
      setConfigPath(selected[0])
      setConfigFound(true)
    }
  }

  const handleCreateConfig = async () => {
    const dir = await window.electronAPI.dialog.openDirectory({
      title: 'Select directory for rclone.conf'
    })
    if (dir) {
      const newPath = dir + '/rclone.conf'
      setConfigPath(newPath)
      setConfigFound(false)
    }
  }

  const canProceed = () => {
    if (step === 0) return true
    if (step === 1) return testResult?.valid === true
    if (step === 2) return configPath.length > 0
    return false
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await window.electronAPI.app.setRclonePath(rclonePath)
      await updateSettings({ rclonePath, configPath, setupComplete: true })
      await window.electronAPI.app.completeSetup()
      await loadSettings()
      window.location.reload()
    } catch (err) {
      console.error('Setup failed:', err)
    } finally {
      setFinishing(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl mx-4 space-y-6">
        <Progress value={progress} className="h-1.5" />

        <div className="flex items-center justify-center gap-8">
          {STEPS.map((label, i) => {
            const Icon = STEP_ICONS[i]
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isDone
                      ? 'bg-green-500/20 border-green-500 text-green-500'
                      : isActive
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        <Card className="shadow-lg border-border/50">
          <CardContent className="p-8">
            {step === 0 && <WelcomeStep />}
            {step === 1 && (
              <DetectionStep
                rclonePath={rclonePath}
                setRclonePath={setRclonePath}
                searching={searching}
                testResult={testResult}
                testing={testing}
                onTest={handleTestRclone}
                onBrowse={handleBrowseRclone}
                onDetect={detectRclone}
              />
            )}
            {step === 2 && (
              <ConfigStep
                configPath={configPath}
                setConfigPath={setConfigPath}
                configFound={configFound}
                configSearching={configSearching}
                onBrowse={handleBrowseConfig}
                onCreate={handleCreateConfig}
                rclonePath={rclonePath}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || finishing}
              className="gap-2"
            >
              {finishing ? (
                'Finishing...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Welcome to Rclone App</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          A modern GUI for{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.electronAPI.app.openExternal('https://rclone.org')
            }}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            rclone
          </a>
          , the world's most popular command-line program for syncing and moving files to
          cloud storage.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-left max-w-md mx-auto">
        {[
          { icon: FolderOpen, label: 'Browse & manage\nremote files' },
          { icon: Zap, label: 'Fast parallel\ntransfers' },
          { icon: Settings, label: 'Schedule &\nsync profiles' }
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center whitespace-pre-line">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Let's get you set up in just a couple of steps.
      </p>
    </div>
  )
}

interface DetectionStepProps {
  rclonePath: string
  setRclonePath: (v: string) => void
  searching: boolean
  testResult: RcloneTestResult | null
  testing: boolean
  onTest: () => void
  onBrowse: () => void
  onDetect: () => void
}

function DetectionStep({
  rclonePath,
  setRclonePath,
  searching,
  testResult,
  testing,
  onTest,
  onBrowse,
  onDetect
}: DetectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Find Rclone</h2>
        <p className="text-sm text-muted-foreground">
          We'll try to find rclone automatically, or you can specify the path manually.
        </p>
      </div>

      {searching && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="relative">
            <Search className="h-8 w-8 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <p className="text-sm text-muted-foreground">Searching for rclone...</p>
        </div>
      )}

      {!searching && testResult?.valid && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-500">Rclone Found</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1 ml-7">
            <p>
              Path:{' '}
              <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                {rclonePath}
              </code>
            </p>
            {testResult.version && (
              <p>
                Version:{' '}
                <Badge variant="secondary">
                  v{testResult.version.version}
                </Badge>{' '}
                <Badge variant="outline">
                  {testResult.version.os}/{testResult.version.arch}
                </Badge>
              </p>
            )}
          </div>
        </div>
      )}

      {!searching && testResult && !testResult.valid && (
        <div className="rounded-lg border border-red-500/30 dark:border-red-500/50 bg-red-500/10 dark:bg-red-500/20 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            <span className="font-medium text-red-500 dark:text-red-400">Not Found</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-7">
            {testResult.error || 'Could not find a valid rclone executable.'}
          </p>
        </div>
      )}

      {!searching && !testResult && !rclonePath && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Rclone wasn't automatically detected. You can:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
            <li>Download it from the official website</li>
            <li>Browse to the executable location</li>
            <li>Enter the path manually</li>
          </ul>
          <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={() => window.electronAPI.app.openExternal(DOWNLOAD_URL)}>
            <Download className="h-4 w-4" />
            Download Rclone
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <Label>Executable Path</Label>
        <div className="flex gap-2">
          <Input
            value={rclonePath}
            onChange={e => setRclonePath(e.target.value)}
            placeholder="e.g. /usr/bin/rclone or C:\rclone\rclone.exe"
            className="flex-1 font-mono text-sm"
          />
          <Button variant="outline" onClick={onBrowse}>
            Browse
          </Button>
          <Button variant="outline" onClick={onTest} disabled={!rclonePath || testing}>
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </div>
        {!searching && (
          <Button variant="ghost" size="sm" onClick={onDetect} className="gap-2">
            <Search className="h-3.5 w-3.5" />
            Search Again
          </Button>
        )}
      </div>
    </div>
  )
}

interface ConfigStepProps {
  configPath: string
  setConfigPath: (v: string) => void
  configFound: boolean | null
  configSearching: boolean
  onBrowse: () => void
  onCreate: () => void
  rclonePath: string
}

function ConfigStep({
  configPath,
  setConfigPath,
  configFound,
  configSearching,
  onBrowse,
  onCreate,
  rclonePath
}: ConfigStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Configuration File</h2>
        <p className="text-sm text-muted-foreground">
          Locate your existing rclone.conf or create a new one.
        </p>
      </div>

      {configSearching && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="relative">
            <Search className="h-8 w-8 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <p className="text-sm text-muted-foreground">Searching for config...</p>
        </div>
      )}

      {!configSearching && configFound === true && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="font-medium text-green-500">Config Found</p>
            <p className="text-sm text-muted-foreground font-mono text-xs mt-1 break-all">
              {configPath}
            </p>
          </div>
        </div>
      )}

      {!configSearching && configFound === false && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            No existing config was found. You can browse for one, create a new config file, or use the default path.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Label>Config File Path</Label>
        <Input
          value={configPath}
          onChange={e => {
            setConfigPath(e.target.value)
          }}
          placeholder="Path to rclone.conf..."
          className="font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBrowse}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse
          </Button>
          <Button variant="outline" onClick={onCreate}>
            Create New
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <h4 className="text-sm font-medium">Summary</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            Rclone:{' '}
            <code className="text-foreground bg-background px-1.5 py-0.5 rounded text-xs font-mono truncate max-w-[280px]">
              {rclonePath}
            </code>
          </p>
          <p className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 shrink-0" />
            Config:{' '}
            <code className="text-foreground bg-background px-1.5 py-0.5 rounded text-xs font-mono truncate max-w-[280px]">
              {configPath || 'Not set'}
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
