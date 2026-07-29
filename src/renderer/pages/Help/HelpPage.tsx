import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BookOpen, ExternalLink,
  Terminal, HardDrive, FolderOpen, ArrowUpDown,
  Settings, Mountain, Shield
} from 'lucide-react'

export default function HelpPage() {
  const openUrl = (url: string) => window.electronAPI.app.openExternal(url)

  const sections = [
    {
      icon: <Terminal className="h-5 w-5" />,
      title: 'Command Builder',
      description: 'Build Rclone commands visually without remembering CLI syntax.',
      tips: [
        'Select an operation from the dropdown',
        'Choose source and destination remotes',
        'Toggle options using the switches',
        'Copy or execute the generated command'
      ]
    },
    {
      icon: <HardDrive className="h-5 w-5" />,
      title: 'Remote Manager',
      description: 'Create and configure connections to storage backends.',
      tips: [
        'Use the wizard to create new remotes step-by-step',
        'Test connections before saving',
        'Each backend has required and optional settings',
        'OAuth backends will open a browser for authentication'
      ]
    },
    {
      icon: <FolderOpen className="h-5 w-5" />,
      title: 'File Browser',
      description: 'Browse local and remote file systems graphically.',
      tips: [
        'Double-click folders to navigate into them',
        'Use the filter to quickly find files',
        'Click column headers to sort',
        'Select multiple files for batch operations'
      ]
    },
    {
      icon: <ArrowUpDown className="h-5 w-5" />,
      title: 'Transfer Queue',
      description: 'Monitor running transfers and manage the job queue.',
      tips: [
        'Click a job to see detailed stats and logs',
        'Pause or resume running transfers',
        'View progress, speed, and ETA in real-time',
        'Filter by status to find specific jobs'
      ]
    },
    {
      icon: <Mountain className="h-5 w-5" />,
      title: 'Mount Manager',
      description: 'Mount remotes as local filesystems using FUSE or NFS.',
      tips: [
        'Select a remote and mount point',
        'Choose VFS cache mode based on use case',
        'Full cache mode is best for random access',
        'Monitor mount status and unmount when done'
      ]
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Settings',
      description: 'Configure the application and Rclone defaults.',
      tips: [
        'Set the Rclone executable path on first use',
        'Use Auto-Detect to find rclone automatically',
        'Adjust UI mode to show more or fewer options',
        'Configure default transfer settings'
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Help & Documentation</h2>
        <p className="text-muted-foreground">Learn how to use Rclone App effectively</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {section.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription className="text-xs">{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {section.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Useful Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={() => openUrl('https://rclone.org/docs/')}>
            <BookOpen className="h-4 w-4 mr-3" />
            Rclone Official Documentation
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => openUrl('https://rclone.org/commands/')}>
            <Terminal className="h-4 w-4 mr-3" />
            Rclone Command Reference
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => openUrl('https://rclone.org/overview/')}>
            <HardDrive className="h-4 w-4 mr-3" />
            Supported Backends
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => openUrl('https://rclone.org/flags/')}>
            <Settings className="h-4 w-4 mr-3" />
            All Flags Reference
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => openUrl('https://github.com/rclone/rclone')}>
            <Shield className="h-4 w-4 mr-3" />
            Rclone GitHub Repository
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Go to Dashboard</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+1</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Go to Remotes</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+2</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Go to File Browser</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+3</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Go to Transfers</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+4</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Go to Command Builder</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+5</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Go to Settings</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+,</kbd></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Toggle Sidebar</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+B</kbd></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
