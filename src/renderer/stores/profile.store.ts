import { create } from 'zustand'
import type { SyncProfile } from '../../shared/types'

interface ProfileState {
  profiles: SyncProfile[]
  loading: boolean
  error: string | null
  loadProfiles: () => Promise<void>
  saveProfile: (profile: SyncProfile) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  duplicateProfile: (id: string, newName: string) => Promise<void>
  runProfile: (id: string) => Promise<void>
  exportProfile: (id: string, path: string) => Promise<void>
  importProfile: (path: string) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: false,
  error: null,

  loadProfiles: async () => {
    set({ loading: true, error: null })
    try {
      const profiles = await window.electronAPI.profiles.list()
      set({ profiles, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  saveProfile: async (profile) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.save(profile)
      await get().loadProfiles()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteProfile: async (id) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.delete(id)
      await get().loadProfiles()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  duplicateProfile: async (id, newName) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.duplicate(id, newName)
      await get().loadProfiles()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  runProfile: async (id) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.run(id)
      await get().loadProfiles()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  exportProfile: async (id, path) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.export(id, path)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  importProfile: async (path) => {
    set({ error: null })
    try {
      await window.electronAPI.profiles.import(path)
      await get().loadProfiles()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  }
}))
