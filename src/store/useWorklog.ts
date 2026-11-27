import { create } from 'zustand'
import type { ActiveSession, Session, Theme, View } from '../types'
import { uid } from '../lib/id'
import {
  activeFromRow,
  cloudMessage,
  deleteAllCloudSessions,
  deleteCloudSession,
  ensureProfile,
  fetchCloud,
  insertCloudActive,
  insertCloudSession,
  insertCloudSessions,
  isDuplicateError,
  sessionFromRow,
  stopCloudSession,
  updateCloudSession,
  updateProfile,
  type ProfileRow,
  type SessionRow,
} from '../lib/cloud'
import { monthKey } from '../lib/time'
import { useToast } from './useToast'

export const DEFAULT_GOAL_MINUTES = 8 * 60
export const MIN_GOAL_MINUTES = 60
export const MAX_GOAL_MINUTES = 16 * 60

/** UI preference cache; worklog data itself is never persisted in the browser. */
const THEME_KEY = 'worklog.theme'

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'
export type RealtimeStatus = 'offline' | 'connecting' | 'live'

const initialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    const legacy = localStorage.getItem('worklog.store.v1')
    if (legacy) {
      const parsed = JSON.parse(legacy) as { state?: { theme?: unknown } }
      if (parsed.state?.theme === 'light' || parsed.state?.theme === 'dark') {
        return parsed.state.theme
      }
    }
  } catch {
    /* localStorage can be unavailable in private mode */
  }
  if (document.documentElement.dataset.theme === 'dark') return 'dark'
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

const byStart = (a: Session, b: Session) => a.start - b.start

function splitRows(rows: SessionRow[]): { sessions: Session[]; active: ActiveSession | null } {
  const sessions: Session[] = []
  let active: ActiveSession | null = null

  for (const row of rows) {
    if (row.end_ms === null) {
      const candidate = activeFromRow(row)
      if (!active || candidate.start > active.start) active = candidate
    } else {
      sessions.push(sessionFromRow(row))
    }
  }

  sessions.sort(byStart)
  return { sessions, active }
}

/** Guards double clicks while the start/stop request is in flight. */
let punchLock = false

/** Counts realtime patches so an in-flight refetch cannot apply a stale snapshot. */
let remoteRevision = 0

interface WorklogState {
  userId: string | null
  sessions: Session[]
  active: ActiveSession | null
  dailyGoalMinutes: number
  theme: Theme
  view: View
  /** Month shown by the monthly view, `YYYY-MM`. */
  month: string

  status: SyncStatus
  loadError: string | null
  syncing: number
  realtime: RealtimeStatus

  /** Fetch the whole account from Supabase. */
  load: (userId: string) => Promise<void>
  /** Silent refetch, used on focus and after a sync conflict. */
  refresh: (options?: { force?: boolean }) => Promise<void>
  reset: () => void
  setRealtime: (status: RealtimeStatus) => void

  /** Start a session, or close the running one. */
  punch: (now?: number) => Promise<void>
  stopActive: (end: number) => Promise<void>
  discardActive: () => Promise<void>

  addSession: (session: Session) => Promise<boolean>
  updateSession: (id: string, patch: Pick<Session, 'start' | 'end'>) => Promise<boolean>
  deleteSession: (id: string) => Promise<boolean>
  /** Returns the number of imported rows, or -1 when the request failed. */
  importSessions: (sessions: Session[], options?: { replace?: boolean }) => Promise<number>
  clearSessions: () => Promise<boolean>

  setGoal: (minutes: number) => Promise<void>
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setView: (view: View) => void
  setMonth: (month: string) => void

  applyRemoteSession: (row: SessionRow, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
  applyRemoteProfile: (row: ProfileRow) => void
}

export const useWorklog = create<WorklogState>()((set, get) => {
  const beginSync = () => set((state) => ({ syncing: state.syncing + 1 }))
  const endSync = () => set((state) => ({ syncing: Math.max(0, state.syncing - 1) }))
  const toastError = (error: unknown, fallback?: string) =>
    useToast.getState().push(cloudMessage(error, fallback), 'danger')

  const persistProfile = (
    userId: string,
    patch: Partial<Pick<ProfileRow, 'daily_goal_minutes' | 'theme'>>,
  ) => {
    void updateProfile(userId, patch).catch(() => {
      /* Theme/goal failures are surfaced by the caller when they matter. */
    })
  }

  return {
    userId: null,
    sessions: [],
    active: null,
    dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
    theme: initialTheme(),
    view: 'today',
    month: monthKey(Date.now()),

    status: 'idle',
    loadError: null,
    syncing: 0,
    realtime: 'offline',

    load: async (userId) => {
      set({ userId, status: 'loading', loadError: null })
      try {
        const snapshot = await fetchCloud(userId)
        if (get().userId !== userId) return
        const profile = snapshot.profile ?? (await ensureProfile(userId, get().theme))
        if (get().userId !== userId) return

        applyTheme(profile.theme)
        set({
          ...splitRows(snapshot.rows),
          dailyGoalMinutes: profile.daily_goal_minutes,
          theme: profile.theme,
          status: 'ready',
          loadError: null,
        })
      } catch (error) {
        if (get().userId !== userId) return
        set({
          status: 'error',
          loadError: cloudMessage(error, '无法从云端加载记录'),
        })
      }
    },

    refresh: async (options = {}) => {
      const userId = get().userId
      if (!userId || get().status === 'loading') return
      // Focus events must not overwrite an optimistic write that is still in flight.
      if (!options.force && get().syncing > 0) return
      const revision = remoteRevision
      try {
        const snapshot = await fetchCloud(userId)
        if (get().userId !== userId || !snapshot.profile) return
        if (remoteRevision !== revision) return
        applyTheme(snapshot.profile.theme)
        set({
          ...splitRows(snapshot.rows),
          dailyGoalMinutes: snapshot.profile.daily_goal_minutes,
          theme: snapshot.profile.theme,
          status: 'ready',
          loadError: null,
        })
      } catch {
        /* keep the last known snapshot; realtime or the next focus will retry */
      }
    },

    reset: () =>
      set({
        userId: null,
        sessions: [],
        active: null,
        dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
        status: 'idle',
        loadError: null,
        syncing: 0,
        realtime: 'offline',
      }),

    setRealtime: (realtime) => set({ realtime }),

    punch: async (now = Date.now()) => {
      const { userId, active } = get()
      if (!userId) return
      if (active) {
        await get().stopActive(now)
        return
      }
      if (punchLock) return

      punchLock = true
      const draft: ActiveSession = { id: uid(), start: now }
      beginSync()
      set({ active: draft })
      try {
        await insertCloudActive(userId, draft)
      } catch (error) {
        if (isDuplicateError(error)) {
          // Another device started first; adopt whatever the cloud has.
          set({ active: null })
          await get().refresh({ force: true })
        } else {
          set({ active: null })
          toastError(error, '开始计时失败，请重试')
        }
      } finally {
        endSync()
        punchLock = false
      }
    },

    stopActive: async (end) => {
      const { userId, active, sessions } = get()
      if (!userId || !active || punchLock) return

      punchLock = true
      const finalEnd = Math.max(end, active.start + 1000)
      const finished: Session = { id: active.id, start: active.start, end: finalEnd }
      const before = sessions
      beginSync()
      set({ active: null, sessions: [...sessions, finished].sort(byStart) })
      try {
        const updated = await stopCloudSession(userId, active.id, finalEnd)
        if (!updated) {
          // Already finished elsewhere: reload instead of guessing.
          set({ sessions: before, active: null })
          await get().refresh({ force: true })
        }
      } catch (error) {
        set({ sessions: before, active })
        toastError(error, '结束计时失败，请重试')
      } finally {
        endSync()
        punchLock = false
      }
    },

    discardActive: async () => {
      const { userId, active } = get()
      if (!userId || !active) return

      beginSync()
      set({ active: null })
      try {
        await deleteCloudSession(userId, active.id)
      } catch (error) {
        set({ active })
        toastError(error, '作废计时失败，请重试')
      } finally {
        endSync()
      }
    },

    addSession: async (session) => {
      const userId = get().userId
      if (!userId) return false
      const before = get().sessions
      beginSync()
      set({ sessions: [...before, session].sort(byStart) })
      try {
        await insertCloudSession(userId, session)
        return true
      } catch (error) {
        set({ sessions: before })
        toastError(error)
        return false
      } finally {
        endSync()
      }
    },

    updateSession: async (id, patch) => {
      const userId = get().userId
      const before = get().sessions
      const target = before.find((session) => session.id === id)
      if (!userId || !target) return false

      const next = { ...target, ...patch }
      beginSync()
      set({
        sessions: [...before.filter((session) => session.id !== id), next].sort(byStart),
      })
      try {
        const updated = await updateCloudSession(userId, id, patch)
        if (!updated) {
          set({ sessions: before })
          toastError(new Error('记录已不存在'), '这条记录已经不在云端了')
          return false
        }
        return true
      } catch (error) {
        set({ sessions: before })
        toastError(error)
        return false
      } finally {
        endSync()
      }
    },

    deleteSession: async (id) => {
      const userId = get().userId
      const before = get().sessions
      if (!userId || !before.some((session) => session.id === id)) return false

      beginSync()
      set({ sessions: before.filter((session) => session.id !== id) })
      try {
        await deleteCloudSession(userId, id)
        return true
      } catch (error) {
        set({ sessions: before })
        toastError(error)
        return false
      } finally {
        endSync()
      }
    },

    importSessions: async (incoming, options = {}) => {
      const userId = get().userId
      if (!userId) return -1

      if (options.replace) {
        const before = { sessions: get().sessions, active: get().active }
        const next = [...incoming].sort(byStart)
        beginSync()
        set({ sessions: next, active: null })
        try {
          await deleteAllCloudSessions(userId)
          const added = await insertCloudSessions(userId, next)
          return added
        } catch (error) {
          set(before)
          toastError(error)
          await get().refresh({ force: true })
          return -1
        } finally {
          endSync()
        }
      }

      const known = new Set(get().sessions.map((session) => session.id))
      const fresh = incoming.filter((session) => !known.has(session.id))
      if (fresh.length === 0) return 0

      const before = get().sessions
      beginSync()
      set({ sessions: [...before, ...fresh].sort(byStart) })
      try {
        const added = await insertCloudSessions(userId, fresh)
        if (added !== fresh.length) await get().refresh({ force: true })
        return added
      } catch (error) {
        set({ sessions: before })
        toastError(error)
        return -1
      } finally {
        endSync()
      }
    },

    clearSessions: async () => {
      const { userId, sessions, active } = get()
      if (!userId || (sessions.length === 0 && !active)) return false

      const before = { sessions, active }
      beginSync()
      set({ sessions: [], active: null })
      try {
        await deleteAllCloudSessions(userId)
        return true
      } catch (error) {
        set(before)
        toastError(error)
        return false
      } finally {
        endSync()
      }
    },

    setGoal: async (minutes) => {
      const clamped = Math.min(MAX_GOAL_MINUTES, Math.max(MIN_GOAL_MINUTES, Math.round(minutes)))
      const previous = get().dailyGoalMinutes
      if (clamped === previous) return

      const userId = get().userId
      beginSync()
      set({ dailyGoalMinutes: clamped })
      if (!userId) {
        endSync()
        return
      }
      try {
        await updateProfile(userId, { daily_goal_minutes: clamped })
      } catch (error) {
        set({ dailyGoalMinutes: previous })
        toastError(error, '每日目标没能同步到云端')
      } finally {
        endSync()
      }
    },

    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
      const userId = get().userId
      if (userId) persistProfile(userId, { theme })
    },

    toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

    setView: (view) => set({ view }),

    setMonth: (month) => set({ month }),

    applyRemoteSession: (row, event) => {
      if (!row.id) return
      remoteRevision += 1

      if (event === 'DELETE') {
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== row.id),
          active: state.active?.id === row.id ? null : state.active,
        }))
        return
      }

      if (row.end_ms === null) {
        const next = activeFromRow(row)
        set((state) => {
          if (state.active && state.active.id !== next.id && state.active.start > next.start) {
            return {}
          }
          return { active: next }
        })
        return
      }

      if (row.end_ms !== null && row.end_ms !== undefined) {
        const session = sessionFromRow(row)
        set((state) => ({
          active: state.active?.id === session.id ? null : state.active,
          sessions: [...state.sessions.filter((item) => item.id !== session.id), session].sort(
            byStart,
          ),
        }))
      }
    },

    applyRemoteProfile: (row) => {
      remoteRevision += 1
      const goal = Number(row.daily_goal_minutes)
      if (Number.isFinite(goal)) {
        set({
          dailyGoalMinutes: Math.min(
            MAX_GOAL_MINUTES,
            Math.max(MIN_GOAL_MINUTES, Math.round(goal)),
          ),
        })
      }
      if (row.theme === 'light' || row.theme === 'dark') {
        applyTheme(row.theme)
        set({ theme: row.theme })
      }
    },
  }
})
