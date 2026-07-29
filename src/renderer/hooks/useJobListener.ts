import { useEffect, useRef, useCallback } from 'react'
import { useJobStore } from '../stores/job.store'

export function useJobListener() {
  const { updateJobStats, completeJob, addJobLog } = useJobStore()
  const cleanupFns = useRef<(() => void)[]>([])

  useEffect(() => {
    const unsubOutput = window.electronAPI.rclone.onOutput((data) => {
      addJobLog(data.jobId, `[${data.stream}] ${data.data}`)
    })

    const unsubStats = window.electronAPI.rclone.onStats((data) => {
      updateJobStats(data.jobId, data.stats)
    })

    const unsubExit = window.electronAPI.rclone.onExit((data) => {
      completeJob(data.jobId, data.exitCode, data.error)
    })

    cleanupFns.current.push(unsubOutput, unsubStats, unsubExit)

    return () => {
      cleanupFns.current.forEach(fn => fn())
      cleanupFns.current = []
    }
  }, [])
}

export function useRclone() {
  const execute = useCallback(async (args: any) => {
    return window.electronAPI.rclone.execute(args)
  }, [])

  const executeStream = useCallback(async (jobData: { id: string; command: string; args: string[]; source: string; destination: string; logFile?: string }, args: any) => {
    return window.electronAPI.rclone.executeStream(jobData, args)
  }, [])

  const stop = useCallback(async (jobId: string) => {
    return window.electronAPI.rclone.stop(jobId)
  }, [])

  return { execute, executeStream, stop }
}
