import { create } from 'zustand'
import type { Job, RcloneStats } from '../../shared/types'

interface JobState {
  jobs: Job[]
  selectedJobId: string | null
  addJob: (job: Job) => void
  updateJobStats: (jobId: string, stats: RcloneStats) => void
  completeJob: (jobId: string, exitCode: number, error?: string) => void
  removeJob: (jobId: string) => void
  clearCompleted: () => void
  selectJob: (jobId: string | null) => void
  addJobLog: (jobId: string, log: string) => void
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  selectedJobId: null,

  addJob: (job) => set((state) => ({
    jobs: [...state.jobs, job]
  })),

  updateJobStats: (jobId, stats) => set((state) => ({
    jobs: state.jobs.map(j => j.id === jobId ? {
      ...j,
      stats,
      status: (j.status === 'paused' || j.status === 'cancelled') ? j.status : 'running' as const
    } : j)
  })),

  completeJob: (jobId, exitCode, error) => set((state) => ({
    jobs: state.jobs.map(j => {
      if (j.id !== jobId) return j
      if (exitCode === -3) {
        if (error === 'cancelled') return { ...j, status: 'cancelled' as const, endTime: Date.now() }
        return { ...j, status: 'paused' as const, endTime: Date.now() }
      }
      return {
        ...j,
        status: exitCode === 0 ? 'completed' as const : 'failed' as const,
        endTime: Date.now(),
        error
      }
    })
  })),

  removeJob: (jobId) => set((state) => ({
    jobs: state.jobs.filter(j => j.id !== jobId)
  })),

  clearCompleted: () => set((state) => ({
    jobs: state.jobs.filter(j => j.status !== 'completed' && j.status !== 'failed' && j.status !== 'cancelled')
  })),

  selectJob: (jobId) => set({ selectedJobId: jobId }),

  addJobLog: (jobId, log) => set((state) => ({
    jobs: state.jobs.map(j => j.id === jobId ? {
      ...j,
      logs: [...j.logs.slice(-999), log]
    } : j)
  }))
}))
