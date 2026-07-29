import { randomUUID } from 'crypto'
import type { Job, RcloneStats } from '../../shared/types'
import type { RcloneService } from './rclone.service'
import type { BrowserWindow } from 'electron'

export class JobService {
  private jobs: Map<string, Job> = new Map()
  private rcloneService: RcloneService

  constructor(rcloneService: RcloneService) {
    this.rcloneService = rcloneService
  }

  createJob(command: string, args: string[], source: string, destination: string): Job {
    const job: Job = {
      id: randomUUID(),
      command,
      args,
      source,
      destination,
      status: 'queued',
      stats: null,
      startTime: Date.now(),
      logs: []
    }
    this.jobs.set(job.id, job)
    return job
  }

  createJobFromData(data: { id: string; command: string; args: string[]; source: string; destination: string; logFile?: string }): Job {
    const job: Job = {
      ...data,
      status: 'running',
      stats: null,
      startTime: Date.now(),
      logs: []
    }
    this.jobs.set(job.id, job)
    return job
  }

  async startJob(jobId: string, window: BrowserWindow): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error(`Job ${jobId} not found`)

    job.status = 'running'

    const execArgs = {
      command: job.command,
      source: job.source,
      destination: job.destination,
      flags: job.command === 'rc' ? this.parseFlagsFromArgs(job.args) : undefined,
      positionalArgs: job.command === 'rc' ? job.args : undefined,
      rawArgs: job.command !== 'rc' ? job.args : undefined
    }

    await this.rcloneService.executeStream(jobId, execArgs, window, job.logFile)
  }

  stopJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    this.rcloneService.stopJob(jobId)
    job.status = 'cancelled'
    job.endTime = Date.now()
    return true
  }

  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (job && job.status === 'running') {
      job.status = 'paused'
      job.endTime = Date.now()
      this.rcloneService.killJob(jobId)
    }
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  getRunningJobs(): Job[] {
    return this.getAllJobs().filter(j => j.status === 'running')
  }

  getQueuedJobs(): Job[] {
    return this.getAllJobs().filter(j => j.status === 'queued')
  }

  updateJobStats(jobId: string, stats: RcloneStats): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.stats = stats
    }
  }

  completeJob(jobId: string, exitCode: number, error?: string): void {
    const job = this.jobs.get(jobId)
    if (job) {
      if (job.status === 'paused' || job.status === 'cancelled') return
      job.status = exitCode === 0 ? 'completed' : 'failed'
      job.endTime = Date.now()
      if (error) job.error = error
    }
  }

  addLog(jobId: string, log: string): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.logs.push(log)
      if (job.logs.length > 1000) {
        job.logs = job.logs.slice(-500)
      }
    }
  }

  clearCompleted(): void {
    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        this.jobs.delete(id)
      }
    }
  }

  stopAll(): void {
    for (const job of this.getRunningJobs()) {
      this.stopJob(job.id)
    }
  }

  private parseFlagsFromArgs(args: string[]): Record<string, string | boolean> {
    const flags: Record<string, string | boolean> = {}
    let i = 0
    while (i < args.length) {
      const arg = args[i]
      if (arg.startsWith('-')) {
        const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1)
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          flags[key] = args[i + 1]
          i += 2
        } else {
          flags[key] = true
          i++
        }
      } else {
        i++
      }
    }
    return flags
  }
}
