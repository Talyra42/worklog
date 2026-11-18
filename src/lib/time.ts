import dayjs from 'dayjs'
import type { Session } from '../types'

export const SECOND_MS = 1000
export const MINUTE_MS = 60 * SECOND_MS
export const HOUR_MS = 60 * MINUTE_MS

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value))

export const dateKey = (value: number | Date): string => dayjs(value).format('YYYY-MM-DD')

export const monthKey = (value: number | Date): string => dayjs(value).format('YYYY-MM')

export const startOfDay = (value: number): number => dayjs(value).startOf('day').valueOf()

/** Monday based, matching the calendar grid. */
export const startOfWeek = (value: number): number => {
  const day = dayjs(value).startOf('day')
  const offset = (day.day() + 6) % 7
  return day.subtract(offset, 'day').valueOf()
}

export const shiftMonth = (month: string, delta: number): string =>
  dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM')

export const daysInMonth = (month: string): number => dayjs(`${month}-01`).daysInMonth()

/** 1 (Monday) … 7 (Sunday). */
export const isoWeekday = (value: number | string): number => {
  const day = dayjs(value).day()
  return day === 0 ? 7 : day
}

export const formatTime = (value: number): string => dayjs(value).format('HH:mm')

export function formatTimeRange(session: Session): string {
  return `${formatTime(session.start)} – ${formatTime(session.end)}`
}

/** `03:20` or `03:20:45` — used by the big timer. */
export function formatClock(ms: number, showSeconds = false): string {
  const total = Math.max(0, Math.floor(ms / SECOND_MS))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return showSeconds
    ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(hours)}:${pad2(minutes)}`
}

/** `3 小时 20 分` / `45 分钟` */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE_MS))
  if (total === 0) return ms > 0 ? '不足 1 分钟' : '0 分钟'
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} 分钟`
  if (minutes === 0) return `${hours} 小时`
  return `${hours} 小时 ${minutes} 分`
}

/** Compact label for tight spots: `6.5h`, `45m`. */
export function formatHoursShort(ms: number): string {
  const minutes = ms / MINUTE_MS
  if (minutes <= 0) return ''
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  const rounded =
    Math.abs(hours - Math.round(hours)) < 0.05 ? Math.round(hours) : Number(hours.toFixed(1))
  return `${rounded}h`
}

export const weekdayLabel = (value: number | string): string => WEEKDAYS[dayjs(value).day()]

/** `11月18日 周三` */
export const formatDayLabel = (value: number | string): string => {
  const day = dayjs(value)
  return `${day.month() + 1}月${day.date()}日 ${WEEKDAYS[day.day()]}`
}

/** `11月18日` */
export const formatMonthDay = (value: number | string): string => {
  const day = dayjs(value)
  return `${day.month() + 1}月${day.date()}日`
}

/** `2026年11月` */
export const formatMonthLabel = (month: string): string => {
  const day = dayjs(`${month}-01`)
  return `${day.year()}年${day.month() + 1}月`
}

export function greeting(now: number): string {
  const hour = dayjs(now).hour()
  if (hour < 5) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了'
}

/** Turn `<date>` + `<time>` inputs (both local) into epoch ms. */
export function toTimestamp(date: string, time: string): number {
  return dayjs(`${date}T${time}`).valueOf()
}

export function fromTimestamp(ts: number): { date: string; time: string } {
  const day = dayjs(ts)
  return { date: day.format('YYYY-MM-DD'), time: day.format('HH:mm') }
}

export const addDays = (value: number, days: number): number =>
  dayjs(value).add(days, 'day').valueOf()
