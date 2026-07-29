import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/app.store'
import { Badge } from '@/components/ui/badge'
import { Sun, Moon, Monitor } from 'lucide-react'
import iconUrl from '@/assets/icon.png'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/remotes': 'Remote Manager',
  '/remotes/create': 'Create Remote',
  '/explorer': 'File Browser',
  '/transfers': 'Transfer Queue',
  '/command-builder': 'Command Builder',
  '/profiles': 'Sync Profiles',
  '/scheduler': 'Scheduler',
  '/terminal': 'Terminal',
  '/mount': 'Mount Manager',
  '/logs': 'Log Viewer',
  '/settings': 'Settings',
  '/help': 'Help'
}

export function Header() {
  const location = useLocation()
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)
  const uiMode = useAppStore(s => s.uiMode)

  const title = pageTitles[location.pathname] || 'Rclone App'

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['dark', 'light', 'system']
    const idx = themes.indexOf(theme)
    setTheme(themes[(idx + 1) % themes.length])
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <header className="titlebar flex h-12 items-center justify-between border-b bg-background/95 backdrop-blur px-6">
      <div className="flex items-center gap-3">
        <img src={iconUrl} alt="Rclone App" className="h-6 w-6" />
        <h1 className="text-sm font-semibold">{title}</h1>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {uiMode}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
