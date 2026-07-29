import { create } from 'zustand'
import type { RemoteConfig } from '../../shared/types'

interface RemoteState {
  remotes: RemoteConfig[]
  loading: boolean
  error: string | null
  loadRemotes: () => Promise<void>
  addRemote: (remote: RemoteConfig) => Promise<void>
  updateRemote: (name: string, remote: RemoteConfig) => Promise<void>
  deleteRemote: (name: string) => Promise<void>
  renameRemote: (oldName: string, newName: string) => Promise<void>
  copyRemote: (sourceName: string, destName: string) => Promise<void>
}

export const useRemoteStore = create<RemoteState>((set, get) => ({
  remotes: [],
  loading: false,
  error: null,

  loadRemotes: async () => {
    set({ loading: true, error: null })
    try {
      const config = await window.electronAPI.config.read()
      set({ remotes: config.remotes, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  addRemote: async (remote) => {
    try {
      await window.electronAPI.config.createRemote(remote)
      await get().loadRemotes()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  updateRemote: async (name, remote) => {
    try {
      await window.electronAPI.config.updateRemote(name, remote)
      await get().loadRemotes()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteRemote: async (name) => {
    try {
      await window.electronAPI.config.deleteRemote(name)
      await get().loadRemotes()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  renameRemote: async (oldName, newName) => {
    try {
      await window.electronAPI.config.renameRemote(oldName, newName)
      await get().loadRemotes()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  copyRemote: async (sourceName, destName) => {
    try {
      await window.electronAPI.config.copyRemote(sourceName, destName)
      await get().loadRemotes()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  }
}))
