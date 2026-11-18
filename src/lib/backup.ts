import type { Session } from '../types'
import { uid } from './id'
import { dateKey, formatDuration, formatTime, MINUTE_MS } from './time'

export interface BackupPayload {
  app: 'worklog'
  version: 1
  exportedAt: string
  sessions: Session[]
  settings: { dailyGoalMinutes: number }
}

export function buildBackup(sessions: Session[], dailyGoalMinutes: number): BackupPayload {
  return {
    app: 'worklog',
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: [...sessions].sort((a, b) => a.start - b.start),
    settings: { dailyGoalMinutes },
  }
}

export function toCsv(sessions: Session[]): string {
  const header = ['日期', '开始', '结束', '时长(分钟)', '时长']
  const rows = [...sessions]
    .sort((a, b) => a.start - b.start)
    .map((session) => [
      dateKey(session.start),
      formatTime(session.start),
      formatTime(session.end),
      String(Math.round((session.end - session.start) / MINUTE_MS)),
      formatDuration(session.end - session.start),
    ])
  return [`\uFEFF${header.join(',')}`, ...rows.map((row) => row.join(','))].join('\r\n')
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface ParsedBackup {
  sessions: Session[]
  dailyGoalMinutes?: number
}

const toMillis = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return Date.parse(value)
  return Number.NaN
}

const MAX_SESSION_MS = 48 * 60 * MINUTE_MS

/** Accepts our own backup file, a bare session array, or `{ sessions: [...] }`. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }

  const payload = Array.isArray(raw) ? { sessions: raw } : (raw as Record<string, unknown>)
  const list = payload?.sessions

  if (!Array.isArray(list)) throw new Error('文件里没有找到 sessions 列表')

  const sessions: Session[] = []
  const seen = new Set<string>()

  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const start = toMillis(candidate.start)
    const end = toMillis(candidate.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    if (end <= start || end - start > MAX_SESSION_MS) continue

    const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : uid()
    if (seen.has(id)) continue
    seen.add(id)
    sessions.push({ id, start: Math.round(start), end: Math.round(end) })
  }

  if (sessions.length === 0) throw new Error('没有找到可导入的记录')

  const settings = payload.settings as { dailyGoalMinutes?: unknown } | undefined
  const goal = settings?.dailyGoalMinutes
  const dailyGoalMinutes =
    typeof goal === 'number' && goal >= 30 && goal <= 24 * 60 ? Math.round(goal) : undefined

  return { sessions, dailyGoalMinutes }
}
