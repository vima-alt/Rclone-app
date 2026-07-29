import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { useRemoteStore } from '@/stores/remote.store'
import {
  Plus, Search, HardDrive, Copy, Trash2, Edit,
  RefreshCw, CheckCircle2, XCircle
} from 'lucide-react'
import { BACKEND_DEFINITIONS } from '@/metadata/backends'

export default function RemoteList() {
  const { remotes, loading, loadRemotes, deleteRemote, copyRemote } = useRemoteStore()
  const [search, setSearch] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadRemotes()
  }, [])

  const filtered = remotes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  )

  const getBackendInfo = (type: string) => {
    return BACKEND_DEFINITIONS.find(b => b.name === type)
  }

  const handleTest = async (name: string) => {
    try {
      const result = await window.electronAPI.config.testRemote(name)
      setTestResults(prev => ({ ...prev, [name]: result.exitCode === 0 }))
    } catch {
      setTestResults(prev => ({ ...prev, [name]: false }))
    }
  }

  const handleCopy = async (name: string) => {
    const newName = prompt(`Copy remote "${name}" to:`, `${name}-copy`)
    if (newName && newName !== name) {
      await copyRemote(name, newName)
    }
  }

  const handleDelete = async () => {
    if (deleteDialog) {
      await deleteRemote(deleteDialog)
      setDeleteDialog(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Remotes</h2>
          <p className="text-muted-foreground">Manage your Rclone remotes and storage backends</p>
        </div>
        <Link to="/remotes/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Remote
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search remotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => loadRemotes()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading remotes...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HardDrive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? 'No remotes match your search' : 'No remotes configured'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try a different search term' : 'Create your first remote to get started'}
            </p>
            {!search && (
              <Link to="/remotes/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Remote
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((remote) => {
            const backend = getBackendInfo(remote.type)
            const testResult = testResults[remote.name]

            return (
              <Card key={remote.name} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <HardDrive className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{remote.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{backend?.displayName || remote.type}</p>
                      </div>
                    </div>
                    {testResult !== undefined && (
                      testResult
                        ? <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>
                        : <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{remote.type}</Badge>
                    {backend?.tier && (
                      <Badge variant={backend.tier === 'core' ? 'default' : 'outline'} className="text-[10px]">
                        {backend.tier}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {backend?.description || 'No description available'}
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/remotes/edit/${remote.name}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleTest(remote.name)}>
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(remote.name)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteDialog(remote.name)}>
                      <Trash2 className="h-3 w-3 text-destructive dark:text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Remote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the remote "{deleteDialog}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
