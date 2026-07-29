import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import type { ScheduledTask, ScheduleConfig } from '../../shared/types'

export class ScheduleService {
  private filePath: string
  private tasks: ScheduledTask[] = []

  constructor() {
    this.filePath = join(app.getPath('userData'), 'schedules.json')
    this.load()
  }

  list(): ScheduledTask[] {
    return [...this.tasks]
  }

  getById(id: string): ScheduledTask | undefined {
    return this.tasks.find(t => t.id === id)
  }

  getByProfileId(profileId: string): ScheduledTask | undefined {
    return this.tasks.find(t => t.profileId === profileId)
  }

  save(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> & { id?: string }): ScheduledTask {
    const now = Date.now()

    if (task.id) {
      const index = this.tasks.findIndex(t => t.id === task.id)
      if (index === -1) throw new Error(`Schedule "${task.id}" not found`)

      const updated: ScheduledTask = {
        ...this.tasks[index],
        ...task,
        updatedAt: now
      }
      this.tasks[index] = updated
      this.persist()
      return updated
    }

    const newTask: ScheduledTask = {
      ...task,
      id: randomUUID(),
      runCount: 0,
      nextRun: this.calculateNextRun(task.schedule),
      createdAt: now,
      updatedAt: now
    }

    this.tasks.push(newTask)
    this.persist()
    return newTask
  }

  delete(id: string): boolean {
    const index = this.tasks.findIndex(t => t.id === id)
    if (index === -1) return false

    this.tasks.splice(index, 1)
    this.persist()
    return true
  }

  toggle(id: string, enabled: boolean): ScheduledTask | undefined {
    const task = this.getById(id)
    if (!task) return undefined

    task.enabled = enabled
    if (enabled) {
      task.nextRun = this.calculateNextRun(task.schedule)
    }
    task.updatedAt = Date.now()
    this.persist()
    return task
  }

  getEnabledTasks(): ScheduledTask[] {
    return this.tasks.filter(t => t.enabled)
  }

  getDueTasks(): ScheduledTask[] {
    const now = Date.now()
    return this.getEnabledTasks().filter(t => t.schedule.type !== 'after' && t.nextRun && t.nextRun <= now)
  }

  getDependents(triggerTaskId: string): ScheduledTask[] {
    return this.getEnabledTasks().filter(t => t.nextScheduleId === triggerTaskId)
  }

  listSchedules(): ScheduledTask[] {
    return this.list()
  }

  saveSchedule(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> & { id?: string }): ScheduledTask {
    return this.save(task)
  }

  deleteSchedule(id: string): boolean {
    return this.delete(id)
  }

  toggleSchedule(id: string, enabled: boolean): ScheduledTask | undefined {
    return this.toggle(id, enabled)
  }

  async runScheduleNow(id: string): Promise<void> {
    const task = this.getById(id)
    if (!task) throw new Error(`Schedule "${id}" not found`)
    // Schedule execution is handled by the renderer through the profile system
  }

  markRun(id: string, status: 'success' | 'failed' | 'cancelled'): void {
    const task = this.tasks.find(t => t.id === id)
    if (!task) return

    task.lastRun = Date.now()
    task.lastStatus = status
    task.runCount++
    task.nextRun = this.calculateNextRun(task.schedule)
    task.updatedAt = Date.now()
    this.persist()
  }

  calculateNextRun(schedule: ScheduleConfig): number | undefined {
    if (!schedule.enabled) return undefined

    const now = new Date()

    switch (schedule.type) {
      case 'startup':
      case 'idle':
        return undefined

      case 'hourly':
        return this.nextHourly(now)

      case 'daily':
        return this.nextDaily(now, schedule.time)

      case 'weekly':
        return this.nextWeekly(now, schedule.time, schedule.dayOfWeek)

      case 'monthly':
        return this.nextMonthly(now, schedule.time, schedule.dayOfMonth)

      case 'cron':
        return schedule.cron ? this.nextCron(schedule.cron, now) : undefined

      case 'interval':
        return this.nextInterval(now, schedule.intervalMinutes)

      default:
        return undefined
    }
  }

  private nextHourly(now: Date): number {
    const next = new Date(now)
    next.setMinutes(0, 0, 0)
    next.setHours(next.getHours() + 1)
    return next.getTime()
  }

  private nextInterval(now: Date, intervalMinutes?: number): number {
    const interval = intervalMinutes ?? 60
    const next = new Date(now)
    next.setMinutes(next.getMinutes() + interval)
    next.setSeconds(0, 0)
    return next.getTime()
  }

  private nextDaily(now: Date, time?: string): number {
    const next = new Date(now)
    const [hours, minutes] = this.parseTime(time)
    next.setHours(hours, minutes, 0, 0)

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1)
    }

    return next.getTime()
  }

  private nextWeekly(now: Date, time?: string, dayOfWeek?: number): number {
    const next = new Date(now)
    const [hours, minutes] = this.parseTime(time)
    const targetDay = dayOfWeek ?? 0

    next.setHours(hours, minutes, 0, 0)

    const currentDay = next.getDay()
    let daysUntilTarget = targetDay - currentDay

    if (daysUntilTarget < 0) {
      daysUntilTarget += 7
    }

    if (daysUntilTarget === 0 && next.getTime() <= now.getTime()) {
      daysUntilTarget = 7
    }

    next.setDate(next.getDate() + daysUntilTarget)
    return next.getTime()
  }

  private nextMonthly(now: Date, time?: string, dayOfMonth?: number): number {
    const next = new Date(now)
    const [hours, minutes] = this.parseTime(time)
    const targetDay = dayOfMonth ?? 1

    next.setDate(targetDay)
    next.setHours(hours, minutes, 0, 0)

    if (next.getTime() <= now.getTime()) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDay)
    }

    const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    if (targetDay > daysInMonth) {
      next.setDate(daysInMonth)
    }

    return next.getTime()
  }

  private nextCron(cron: string, now: Date): number | undefined {
    const parts = cron.trim().split(/\s+/)
    if (parts.length !== 5) return undefined

    const [minuteField, hourField, domField, monthField, dowField] = parts

    const next = new Date(now)
    next.setSeconds(0, 0)

    for (let attempt = 0; attempt < 366 * 24 * 60; attempt++) {
      next.setMinutes(next.getMinutes() + 1)

      if (next.getMonth() + 1 < parseInt(monthField.split('-')[0], 10) && monthField !== '*') {
        next.setDate(1)
        next.setHours(0, 0, 0, 0)
        continue
      }

      if (!this.matchCronField(monthField, next.getMonth() + 1)) continue
      if (!this.matchCronField(domField, next.getDate())) continue
      if (!this.matchCronField(dowField, next.getDay())) continue
      if (!this.matchCronField(hourField, next.getHours())) continue
      if (!this.matchCronField(minuteField, next.getMinutes())) continue

      return next.getTime()
    }

    return undefined
  }

  private matchCronField(field: string, value: number): boolean {
    if (field === '*') return true

    for (const part of field.split(',')) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10)
        const max = parseInt(rangeMatch[2], 10)
        if (value >= min && value <= max) return true
        continue
      }

      const stepMatch = part.match(/^\*\/(\d+)$/)
      if (stepMatch) {
        const step = parseInt(stepMatch[1], 10)
        if (value % step === 0) return true
        continue
      }

      if (parseInt(part, 10) === value) return true
    }

    return false
  }

  private parseTime(time?: string): [number, number] {
    if (!time) return [0, 0]

    const parts = time.split(':')
    const hours = parseInt(parts[0], 10) || 0
    const minutes = parseInt(parts[1], 10) || 0

    return [Math.min(23, Math.max(0, hours)), Math.min(59, Math.max(0, minutes))]
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      this.tasks = []
      return
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8')
      this.tasks = JSON.parse(content)
    } catch {
      this.tasks = []
    }
  }

  private persist(): void {
    writeFileSync(this.filePath, JSON.stringify(this.tasks, null, 2), 'utf-8')
  }
}
