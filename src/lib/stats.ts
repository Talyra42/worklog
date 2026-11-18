import dayjs from 'dayjs'
import type { Session } from '../types'
import { dateKey, HOUR_MS } from './time'

export interface DaySlice {
  date: string
  start: number
  end: number
  ms: number
}

/**
 * A session that runs past midnight is split into one slice per local day,
 * so hours always land on the day they were actually worked.
 */
export function splitSession(session: Session): DaySlice[] {
  const slices: DaySlice[] = []
  let cursor = session.start
  // Guard against corrupted data (e.g. a 10 year "session") blowing up rendering.
  for (let guard = 0; cursor < session.end && guard < 400; guard += 1) {
    const nextMidnight = dayjs(cursor).add(1, 'day').startOf('day').valueOf()
    const end = Math.min(session.end, nextMidnight)
    if (end <= cursor) break
    slices.push({ date: dateKey(cursor), start: cursor, end, ms: end - cursor })
    cursor = end
  }
  return slices
}

export function msByDate(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const session of sessions) {
    for (const slice of splitSession(session)) {
      map.set(slice.date, (map.get(slice.date) ?? 0) + slice.ms)
    }
  }
  return map
}

export function totalMs(sessions: Session[]): number {
  return sessions.reduce((sum, session) => sum + Math.max(0, session.end - session.start), 0)
}

/** Overlap between the sessions and the [from, to) window. */
export function msInWindow(sessions: Session[], from: number, to: number): number {
  let total = 0
  for (const session of sessions) {
    const start = Math.max(session.start, from)
    const end = Math.min(session.end, to)
    if (end > start) total += end - start
  }
  return total
}

export interface MonthStats {
  month: string
  totalMs: number
  /** Days with at least one minute recorded. */
  days: number
  averageMs: number
  longestMs: number
  longestDate: string | null
  byDate: Map<string, number>
}

export function monthStats(sessions: Session[], month: string): MonthStats {
  const byDate = new Map<string, number>()
  for (const [date, ms] of msByDate(sessions)) {
    if (date.startsWith(month)) byDate.set(date, ms)
  }

  let total = 0
  let longestMs = 0
  let longestDate: string | null = null
  for (const [date, ms] of byDate) {
    total += ms
    if (ms > longestMs) {
      longestMs = ms
      longestDate = date
    }
  }

  const days = [...byDate.values()].filter((ms) => ms > 0).length
  return {
    month,
    totalMs: total,
    days,
    averageMs: days > 0 ? total / days : 0,
    longestMs,
    longestDate,
    byDate,
  }
}

/** 0 = no work, 5 = a long day. Drives the heatmap. */
export function dayLevel(ms: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const hours = ms / HOUR_MS
  if (hours <= 0) return 0
  if (hours < 2) return 1
  if (hours < 4) return 2
  if (hours < 6) return 3
  if (hours < 8) return 4
  return 5
}

export function findOverlap(
  sessions: Session[],
  start: number,
  end: number,
  excludeId?: string,
): Session | null {
  return (
    sessions.find(
      (session) => session.id !== excludeId && session.start < end && session.end > start,
    ) ?? null
  )
}

export const sortByStart = (sessions: Session[]): Session[] =>
  [...sessions].sort((a, b) => a.start - b.start)
