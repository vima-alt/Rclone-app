import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAppInit } from '@/hooks/useAppInit'
import { useJobListener } from '@/hooks/useJobListener'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import SetupWizard from '@/pages/Setup/SetupWizard'
import Dashboard from '@/pages/Dashboard'
import RemoteList from '@/pages/Remotes/RemoteList'
import RemoteCreate from '@/pages/Remotes/RemoteCreate'
import RemoteEdit from '@/pages/Remotes/RemoteEdit'
import FileBrowser from '@/pages/Explorer/FileBrowser'
import TransferQueue from '@/pages/Transfers/TransferQueue'
import CommandBuilder from '@/pages/CommandBuilder/CommandBuilder'
import MountManager from '@/pages/Mount/MountManager'
import LogViewer from '@/pages/Logs/LogViewer'
import SettingsPage from '@/pages/Settings/SettingsPage'
import HelpPage from '@/pages/Help/HelpPage'
import SyncProfiles from '@/pages/Profiles/SyncProfiles'
import SchedulerPage from '@/pages/Scheduler/SchedulerPage'
import TerminalOutput from '@/pages/Terminal/TerminalOutput'
import { useAppStore } from '@/stores/app.store'

export default function App() {
  const loaded = useAppStore(s => s.loaded)
  const setupComplete = useAppStore(s => s.setupComplete)
  const compactMode = useAppStore(s => s.compactMode)

  useAppInit()
  useJobListener()
  useKeyboardShortcuts()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('compact', !!compactMode)
  }, [compactMode])

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!setupComplete) {
    return (
      <TooltipProvider>
        <SetupWizard />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/remotes" element={<RemoteList />} />
          <Route path="/remotes/create" element={<RemoteCreate />} />
          <Route path="/remotes/edit/:name" element={<RemoteEdit />} />
          <Route path="/explorer" element={<FileBrowser />} />
          <Route path="/transfers" element={<TransferQueue />} />
          <Route path="/command-builder" element={<CommandBuilder />} />
          <Route path="/profiles" element={<SyncProfiles />} />
          <Route path="/scheduler" element={<SchedulerPage />} />
          <Route path="/terminal" element={<TerminalOutput />} />
          <Route path="/mount" element={<MountManager />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </TooltipProvider>
  )
}
