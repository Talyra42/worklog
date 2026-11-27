import type { ActiveSession, Session } from '../types'
import { supabase } from './supabase'

/** One row of `public.worklog_sessions`. `end_ms === null` means "running". */
export interface SessionRow {
  id: string
  user_id: string
  start_ms: number
  end_ms: number | null
}

export interface ProfileRow {
  user_id: string
  daily_goal_minutes: number
}

export const SESSION_COLUMNS = 'id,user_id,start_ms,end_ms'
export const PROFILE_COLUMNS = 'user_id,daily_goal_minutes'

const asNumber = (value: number | string | null): number => Number(value)

export function sessionFromRow(row: SessionRow): Session {
  return {
    id: row.id,
    start: asNumber(row.start_ms),
    end: asNumber(row.end_ms),
  }
}

export function activeFromRow(row: SessionRow): ActiveSession {
  return { id: row.id, start: asNumber(row.start_ms) }
}

export function rowFromSession(userId: string, session: Session): SessionRow {
  return { id: session.id, user_id: userId, start_ms: session.start, end_ms: session.end }
}

export function rowFromActive(userId: string, active: ActiveSession): SessionRow {
  return { id: active.id, user_id: userId, start_ms: active.start, end_ms: null }
}

export interface CloudSnapshot {
  profile: ProfileRow | null
  rows: SessionRow[]
}

const REQUEST_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('cloud request timed out')), REQUEST_TIMEOUT_MS)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** Everything a signed-in user needs to render the app. */
export async function fetchCloud(userId: string): Promise<CloudSnapshot> {
  const [profileResult, sessionsResult] = await withTimeout(
    Promise.all([
      supabase.from('worklog_profiles').select(PROFILE_COLUMNS).eq('user_id', userId).maybeSingle(),
      supabase
        .from('worklog_sessions')
        .select(SESSION_COLUMNS)
        .eq('user_id', userId)
        .order('start_ms', { ascending: true }),
    ]),
  )

  if (profileResult.error) throw profileResult.error
  if (sessionsResult.error) throw sessionsResult.error

  return {
    profile: (profileResult.data as ProfileRow | null) ?? null,
    rows: (sessionsResult.data as SessionRow[] | null) ?? [],
  }
}

/**
 * The signup trigger normally creates the profile, but an old/deleted trigger
 * or a manually created user should not lock the app. Insert defaults if needed.
 */
export async function ensureProfile(userId: string): Promise<ProfileRow> {
  const { error } = await supabase
    .from('worklog_profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error && !isDuplicateError(error)) throw error

  const { data, error: readError } = await supabase
    .from('worklog_profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw readError
  if (!data) throw new Error('无法创建用户配置')
  return data as ProfileRow
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'daily_goal_minutes'>>,
): Promise<void> {
  const { error } = await supabase
    .from('worklog_profiles')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function insertCloudSession(userId: string, session: Session): Promise<void> {
  const { error } = await supabase.from('worklog_sessions').insert(rowFromSession(userId, session))
  if (error) throw error
}

export async function insertCloudActive(userId: string, active: ActiveSession): Promise<void> {
  const { error } = await supabase.from('worklog_sessions').insert(rowFromActive(userId, active))
  if (error) throw error
}

export async function updateCloudSession(
  userId: string,
  id: string,
  patch: Pick<Session, 'start' | 'end'>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('worklog_sessions')
    .update({ start_ms: patch.start, end_ms: patch.end })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Finish the running row; only touches it while it is still running. */
export async function stopCloudSession(userId: string, id: string, end: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('worklog_sessions')
    .update({ end_ms: end })
    .eq('user_id', userId)
    .eq('id', id)
    .is('end_ms', null)
    .select('id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function deleteCloudSession(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('worklog_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function deleteAllCloudSessions(userId: string): Promise<void> {
  const { error } = await supabase.from('worklog_sessions').delete().eq('user_id', userId)
  if (error) throw error
}

/** Insert many completed sessions, skipping ids that already exist. Returns added count. */
export async function insertCloudSessions(userId: string, sessions: Session[]): Promise<number> {
  if (sessions.length === 0) return 0
  const rows = sessions.map((session) => rowFromSession(userId, session))
  const { data, error } = await supabase
    .from('worklog_sessions')
    .upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

export function errorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

export function isDuplicateError(error: unknown): boolean {
  if (errorCode(error) === '23505') return true
  const message = errorMessage(error).toLowerCase()
  return message.includes('duplicate key') || message.includes('unique constraint')
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return ''
}

/** Turn Supabase/network errors into something a person can act on. */
export function cloudMessage(error: unknown, fallback = '云端同步失败，请稍后重试'): string {
  const message = errorMessage(error).toLowerCase()
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed') ||
    message.includes('timed out')
  ) {
    return '网络连接失败，请检查网络后重试'
  }
  if (
    message.includes('jwt') ||
    message.includes('refresh token') ||
    message.includes('invalid token')
  ) {
    return '登录状态已失效，请重新登录'
  }
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return '没有权限访问这条云端记录'
  }
  if (isDuplicateError(error)) return '这段记录已经在云端了'
  return fallback
}
