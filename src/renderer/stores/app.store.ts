import { create } from 'zustand'
import type { AppSettings } from '../../shared/types'

interface AppState extends AppSettings {
  loaded: boolean
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  setTheme: (theme: AppSettings['theme']) => void
  setUiMode: (mode: AppSettings['uiMode']) => void
  toggleSidebar: () => void
  applyTheme: (theme: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  rclonePath: '',
  configPath: '',
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
  windowBounds: { width: 1400, height: 900 },
  sidebarCollapsed: false,
  setupComplete: false,
  preserveRemotePasswords: false,
  defaultDedupMode: '',
  defaultSyncMode: '',
  autoMountOnStart: false,
  recentCommands: [],
  commandPresets: [],
  autoLaunch: false,
  minimizeToTray: false,
  backupPath: '',
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.app.getSettings()
      set({ ...settings, loaded: true })
      get().applyTheme(settings.theme || 'system')
    } catch (err) {
      set({ loaded: true })
    }
  },

  updateSettings: async (newSettings) => {
    await window.electronAPI.app.setSettings(newSettings)
    set(newSettings as any)
    if (newSettings.theme) {
      get().applyTheme(newSettings.theme)
    }
  },

  setTheme: (theme) => {
    get().updateSettings({ theme })
  },

  setUiMode: (uiMode) => {
    get().updateSettings({ uiMode })
  },

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed
    set({ sidebarCollapsed: collapsed })
    window.electronAPI.app.setSettings({ sidebarCollapsed: collapsed })
  },

  applyTheme: (theme: string) => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(isDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }
}))
