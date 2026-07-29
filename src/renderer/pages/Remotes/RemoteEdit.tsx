import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useRemoteStore } from '@/stores/remote.store'
import { BACKEND_DEFINITIONS } from '@/metadata/backends'
import { ArrowLeft, Save, CheckCircle2, XCircle } from 'lucide-react'

export default function RemoteEdit() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { remotes, updateRemote, loadRemotes } = useRemoteStore()
  const [remoteName, setRemoteName] = useState('')
  const [options, setOptions] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRemotes()
  }, [])

  useEffect(() => {
    const remote = remotes.find(r => r.name === name)
    if (remote) {
      setRemoteName(remote.name)
      const cleanOptions = { ...remote.options }
      for (const [key, value] of Object.entries(cleanOptions)) {
        const opt = backend?.options.find(o => o.name === key)
        if (opt && (opt.type === 'password' || opt.sensitive) && value) {
          cleanOptions[key] = ''
        }
      }
      setOptions(cleanOptions)
    }
  }, [remotes, name])

  const remote = remotes.find(r => r.name === name)
  const backend = BACKEND_DEFINITIONS.find(b => b.name === remote?.type)

  if (!remote || !backend) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Remote "{name}" not found</p>
        <Button variant="outline" onClick={() => navigate('/remotes')} className="mt-4">
          Back to Remotes
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const finalOptions = { ...remote.options }
      for (const [key, value] of Object.entries(options)) {
        const isSensitive = backend.options.find(o => o.name === key && (o.type === 'password' || o.sensitive))
        if (isSensitive && value) {
          const obscured = await window.electronAPI.config.obscure(value)
          if (obscured && typeof obscured === 'string') {
            finalOptions[key] = obscured
          }
        } else if (!isSensitive) {
          finalOptions[key] = value
        }
      }

      await updateRemote(name!, {
        name: remoteName,
        type: remote.type,
        options: finalOptions
      })
      if (remoteName !== name) {
        navigate(`/remotes/edit/${remoteName}`)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.config.testRemote(name!)
      setTestResult(result.exitCode === 0)
    } catch {
      setTestResult(false)
    } finally {
      setTesting(false)
    }
  }

  const updateOption = (key: string, value: string) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const requiredOptions = backend.options.filter(o => o.required)
  const basicOptions = backend.options.filter(o => !o.required && !o.advanced)
  const advancedOptions = backend.options.filter(o => o.advanced)

  const renderOption = (option: any) => (
    <div key={option.name} className="space-y-2">
      <Label htmlFor={option.name}>
        {option.displayName}
        {option.required && <span className="text-destructive dark:text-red-400 ml-1">*</span>}
      </Label>
      {option.type === 'bool' ? (
        <div className="flex items-center gap-2">
          <Switch
            id={option.name}
            checked={options[option.name] === 'true'}
            onCheckedChange={(checked) => updateOption(option.name, checked ? 'true' : 'false')}
          />
          <span className="text-sm text-muted-foreground">{option.description}</span>
        </div>
      ) : option.enumValues ? (
        <select
          id={option.name}
          value={options[option.name] || option.default || ''}
          onChange={(e) => updateOption(option.name, e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {option.enumValues.map((v: any) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      ) : (
        <Input
          id={option.name}
          type={option.type === 'password' || option.sensitive ? 'password' : 'text'}
          placeholder={option.placeholder || option.default || option.displayName}
          value={options[option.name] || ''}
          onChange={(e) => updateOption(option.name, e.target.value)}
        />
      )}
      <p className="text-xs text-muted-foreground">{option.description}</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/remotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Edit Remote: {name}</h2>
            <p className="text-muted-foreground">{backend.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
            {testResult === true && <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />}
            {testResult === false && <XCircle className="h-4 w-4 ml-2 text-red-500 dark:text-red-400" />}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-6">
            <Label htmlFor="remote-name">Remote Name</Label>
            <Input
              id="remote-name"
              value={remoteName}
              onChange={(e) => setRemoteName(e.target.value)}
            />
          </div>

          <Tabs defaultValue="required">
            <TabsList>
              <TabsTrigger value="required">
                Required ({requiredOptions.length})
              </TabsTrigger>
              <TabsTrigger value="basic">
                Basic ({basicOptions.length})
              </TabsTrigger>
              <TabsTrigger value="advanced">
                Advanced ({advancedOptions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="required" className="space-y-4 mt-4">
              {requiredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No required options for this backend.</p>
              ) : (
                requiredOptions.map(renderOption)
              )}
            </TabsContent>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {basicOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No basic options for this backend.</p>
              ) : (
                basicOptions.map(renderOption)
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              {advancedOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No advanced options for this backend.</p>
              ) : (
                advancedOptions.map(renderOption)
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-destructive dark:text-red-400">{error}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
