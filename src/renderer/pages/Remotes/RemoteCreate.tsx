import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useRemoteStore } from '@/stores/remote.store'
import { BACKEND_DEFINITIONS } from '@/metadata/backends'
import type { BackendDefinition } from '@shared/types'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, ArrowRight, Check, Search, Cloud, Server, Shield,
  FolderArchive, Layers, Globe, Wifi, Database
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Cloud Storage': <Cloud className="h-4 w-4" />,
  'Enterprise': <Server className="h-4 w-4" />,
  'Encryption': <Shield className="h-4 w-4" />,
  'Compression': <FolderArchive className="h-4 w-4" />,
  'Virtual': <Layers className="h-4 w-4" />,
  'Web': <Globe className="h-4 w-4" />,
  'Network': <Wifi className="h-4 w-4" />,
  'Database': <Database className="h-4 w-4" />
}

export default function RemoteCreate() {
  const navigate = useNavigate()
  const { addRemote } = useRemoteStore()
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedBackend, setSelectedBackend] = useState<BackendDefinition | null>(null)
  const [remoteName, setRemoteName] = useState('')
  const [options, setOptions] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const categories = [...new Set(BACKEND_DEFINITIONS.map(b => b.category))]

  const filteredBackends = BACKEND_DEFINITIONS.filter(b =>
    b.displayName.toLowerCase().includes(search.toLowerCase()) ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleNext = () => {
    if (step === 1 && !remoteName.trim()) {
      setError('Remote name is required')
      return
    }
    if (step === 1 && !/^[a-zA-Z0-9_-]+$/.test(remoteName)) {
      setError('Remote name can only contain letters, numbers, hyphens and underscores')
      return
    }
    setError('')
    setStep(s => s + 1)
  }

  const handleCreate = async () => {
    if (!selectedBackend || !remoteName.trim()) return

    setCreating(true)
    setError('')

    try {
      const obscuredOptions = { ...options }
      for (const [key, value] of Object.entries(obscuredOptions)) {
        if (value && selectedBackend.options.find(o => o.name === key && (o.type === 'password' || o.sensitive))) {
          const obscured = await window.electronAPI.config.obscure(value)
          if (obscured && typeof obscured === 'string') {
            obscuredOptions[key] = obscured
          }
        }
      }

      await addRemote({
        name: remoteName.trim(),
        type: selectedBackend.name,
        options: obscuredOptions
      })
      navigate('/remotes')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const updateOption = (key: string, value: string) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/remotes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Remote</h2>
          <p className="text-muted-foreground">Step {step + 1} of 3</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['Select Backend', 'Name & Configure', 'Review & Create'].map((label, i) => (
          <div key={label} className={cn('flex-1 h-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search backends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-6">
            {categories.map(category => {
              const backends = filteredBackends.filter(b => b.category === category)
              if (backends.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    {CATEGORY_ICONS[category] || <Cloud className="h-4 w-4" />}
                    {category}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {backends.map(backend => (
                      <button
                        key={backend.name}
                        onClick={() => { setSelectedBackend(backend); setStep(1) }}
                        className={cn(
                          'text-left rounded-lg border p-4 hover:bg-accent transition-colors',
                          selectedBackend?.name === backend.name && 'border-primary bg-accent'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{backend.displayName}</span>
                          <Badge variant="outline" className="text-[10px]">{backend.tier}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{backend.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {step === 1 && selectedBackend && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedBackend.displayName}</CardTitle>
            <CardDescription>{selectedBackend.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remote-name">Remote Name *</Label>
              <Input
                id="remote-name"
                placeholder="my-remote"
                value={remoteName}
                onChange={(e) => { setRemoteName(e.target.value); setError('') }}
              />
              {error && <p className="text-sm text-destructive dark:text-red-400">{error}</p>}
              <p className="text-xs text-muted-foreground">
                A unique name for this remote. Only letters, numbers, hyphens and underscores.
              </p>
            </div>

            {selectedBackend.options.filter(o => o.required).map(option => (
              <div key={option.name} className="space-y-2">
                <Label htmlFor={option.name}>
                  {option.displayName} {option.required && '*'}
                </Label>
                <Input
                  id={option.name}
                  type={option.type === 'password' || option.sensitive ? 'password' : 'text'}
                  placeholder={option.placeholder || option.displayName}
                  value={options[option.name] || ''}
                  onChange={(e) => updateOption(option.name, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            ))}

            {selectedBackend.options.filter(o => !o.required && !o.advanced).map(option => (
              <div key={option.name} className="space-y-2">
                <Label htmlFor={option.name} className="text-muted-foreground">
                  {option.displayName}
                </Label>
                <Input
                  id={option.name}
                  type={option.type === 'password' || option.sensitive ? 'password' : 'text'}
                  placeholder={option.placeholder || `Optional`}
                  value={options[option.name] || ''}
                  onChange={(e) => updateOption(option.name, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedBackend && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Review your remote configuration before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{remoteName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Backend</span>
                <span className="font-medium">{selectedBackend.displayName}</span>
              </div>
              {Object.entries(options).filter(([, v]) => v).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono text-xs">
                    {selectedBackend.options.find(o => o.name === key)?.sensitive ? '••••••••' : value}
                  </span>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-destructive dark:text-red-400">{error}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/remotes')}>
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={handleNext} disabled={step === 0 && !selectedBackend}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={creating}>
            <Check className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create Remote'}
          </Button>
        )}
      </div>
    </div>
  )
}
