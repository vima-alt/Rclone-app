import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/app.store'
import { cn } from '@/lib/utils'
import { canUse, type UIMode } from '@/lib/mode-gating'
import iconUrl from '@/assets/icon.png'
import {
  LayoutDashboard,
  HardDrive,
  FolderOpen,
  ArrowUpDown,
  Terminal,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Mountain,
  ScrollText,
  Calendar,
  Clock,
  Monitor
} from 'lucide-react'

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, minMode: 'basic' as UIMode },
    ]
  },
  {
    label: 'Storage',
    items: [
      { path: '/remotes', label: 'Remotes', icon: HardDrive, minMode: 'basic' as UIMode },
      { path: '/explorer', label: 'File Browser', icon: FolderOpen, minMode: 'basic' as UIMode },
    ]
  },
  {
    label: 'Transfer',
    items: [
      { path: '/transfers', label: 'Transfers', icon: ArrowUpDown, minMode: 'basic' as UIMode },
      { path: '/profiles', label: 'Sync Profiles', icon: Calendar, minMode: 'advanced' as UIMode },
      { path: '/scheduler', label: 'Scheduler', icon: Clock, minMode: 'advanced' as UIMode },
    ]
  },
  {
    label: 'Tools',
    items: [
      { path: '/command-builder', label: 'Command Builder', icon: Terminal, minMode: 'advanced' as UIMode },
      { path: '/terminal', label: 'Terminal', icon: Monitor, minMode: 'advanced' as UIMode },
      { path: '/mount', label: 'Mount Manager', icon: Mountain, minMode: 'advanced' as UIMode },
    ]
  },
  {
    label: 'System',
    items: [
      { path: '/logs', label: 'Logs', icon: ScrollText, minMode: 'advanced' as UIMode },
      { path: '/settings', label: 'Settings', icon: Settings, minMode: 'basic' as UIMode },
      { path: '/help', label: 'Help', icon: HelpCircle, minMode: 'basic' as UIMode },
    ]
  }
]

export function Sidebar() {
  const collapsed = useAppStore(s => s.sidebarCollapsed)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  useAppStore(s => s.uiMode)
  const location = useLocation()
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.electronAPI.app.getVersion().then((v) => setAppVersion(v)).catch(() => {})
  }, [])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-12 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={iconUrl} alt="" className="h-5 w-5" />
            <span className="font-bold text-sm">Rclone App</span>
          </div>
        )}
        {collapsed && <img src={iconUrl} alt="" className="h-5 w-5 mx-auto" />}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(item => canUse(item.minMode))
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
              )}
              {collapsed && <div className="mx-3 my-1 border-t border-sidebar-border" />}
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t p-3">
          <p className="text-[10px] text-sidebar-foreground/40 text-center">v{appVersion || '1.1.0'}</p>
        </div>
      )}
    </aside>
  )
}
