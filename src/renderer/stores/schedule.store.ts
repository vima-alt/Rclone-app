import { create } from 'zustand'
import type { ScheduledTask } from '../../shared/types'

interface ScheduleState {
  tasks: ScheduledTask[]
  loading: boolean
  error: string | null
  loadTasks: () => Promise<void>
  saveTask: (task: ScheduledTask) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string, enabled: boolean) => Promise<void>
  runNow: (id: string) => Promise<void>
  subscribeToUpdates: () => () => void
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await window.electronAPI.schedules.list()
      set({ tasks, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  saveTask: async (task) => {
    set({ error: null })
    try {
      await window.electronAPI.schedules.save(task)
      await get().loadTasks()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteTask: async (id) => {
    set({ error: null })
    try {
      await window.electronAPI.schedules.delete(id)
      await get().loadTasks()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  toggleTask: async (id, enabled) => {
    set({ error: null })
    try {
      await window.electronAPI.schedules.toggle(id, enabled)
      await get().loadTasks()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  runNow: async (id) => {
    set({ error: null })
    try {
      await window.electronAPI.schedules.runNow(id)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  subscribeToUpdates: () => {
    return window.electronAPI.schedules.onUpdate(() => {
      get().loadTasks()
    })
  }
}))
