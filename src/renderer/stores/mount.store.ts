import { create } from 'zustand'

export interface MountEntry {
  id: string
  remote: string
  mountPoint: string
  type: string
  status: 'mounted' | 'error' | 'unmounted'
  pid?: number
}

interface MountState {
  mounts: MountEntry[]
  addMount: (mount: MountEntry) => void
  removeMount: (id: string) => void
  setMounts: (mounts: MountEntry[]) => void
  clearMounts: () => void
}

export const useMountStore = create<MountState>((set) => ({
  mounts: [],
  addMount: (mount) => set((state) => ({ mounts: [...state.mounts, mount] })),
  removeMount: (id) => set((state) => ({ mounts: state.mounts.filter(m => m.id !== id) })),
  setMounts: (mounts) => set({ mounts }),
  clearMounts: () => set({ mounts: [] })
}))
