import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ActiveSession, Session, Theme, View } from '../types'
import { uid } from '../lib/id'
import { monthKey } from '../lib/time'

export const STORAGE_KEY = 'worklog.store.v1'
export const DEFAULT_GOAL_MINUTES = 8 * 60
export const MIN_GOAL_MINUTES = 60
export const MAX_GOAL_MINUTES = 16 * 60

const initialTheme = (): Theme => {
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'dark' || fromDom === 'light') return fromDom
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

interface WorklogState {
  sessions: Session[]
  active: ActiveSession | null
  dailyGoalMinutes: number
  theme: Theme
  view: View
  /** Month shown by the monthly view, `YYYY-MM`. */
  month: string

  /** Start a session, or close the running one. */
  punch: (now?: number) => void
  stopActive: (end: number) => void
  discardActive: () => void

  addSession: (session: Session) => void
  updateSession: (id: string, patch: Pick<Session, 'start' | 'end'>) => void
  deleteSession: (id: string) => void
  importSessions: (sessions: Session[], options?: { replace?: boolean }) => number
  clearSessions: () => void

  setGoal: (minutes: number) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setView: (view: View) => void
  setMonth: (month: string) => void
}

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}

const byStart = (a: Session, b: Session) => a.start - b.start

export const useWorklog = create<WorklogState>()(
  persist(
    (set, get) => ({
      sessions: [],
      active: null,
      dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
      theme: initialTheme(),
      view: 'today',
      month: monthKey(Date.now()),

      punch: (now = Date.now()) => {
        const { active, sessions } = get()
        if (active) {
          const end = Math.max(now, active.start + 1000)
          set({
            sessions: [...sessions, { id: active.id, start: active.start, end }].sort(byStart),
            active: null,
          })
          return
        }
        set({ active: { id: uid(), start: now } })
      },

      stopActive: (end) => {
        const { active, sessions } = get()
        if (!active) return
        set({
          sessions: [
            ...sessions,
            { id: active.id, start: active.start, end: Math.max(end, active.start + 1000) },
          ].sort(byStart),
          active: null,
        })
      },

      discardActive: () => set({ active: null }),

      addSession: (session) => {
        set({ sessions: [...get().sessions, session].sort(byStart) })
      },

      updateSession: (id, patch) => {
        set({
          sessions: get()
            .sessions.map((session) => (session.id === id ? { ...session, ...patch } : session))
            .sort(byStart),
        })
      },

      deleteSession: (id) => {
        set({ sessions: get().sessions.filter((session) => session.id !== id) })
      },

      importSessions: (incoming, options = {}) => {
        if (options.replace) {
          set({ sessions: [...incoming].sort(byStart), active: null })
          return incoming.length
        }

        const existing = new Map(get().sessions.map((session) => [session.id, session]))
        let added = 0
        for (const session of incoming) {
          if (existing.has(session.id)) continue
          existing.set(session.id, session)
          added += 1
        }
        set({ sessions: [...existing.values()].sort(byStart) })
        return added
      },

      clearSessions: () => set({ sessions: [], active: null }),

      setGoal: (minutes) => {
        const clamped = Math.min(MAX_GOAL_MINUTES, Math.max(MIN_GOAL_MINUTES, Math.round(minutes)))
        set({ dailyGoalMinutes: clamped })
      },

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

      setView: (view) => set({ view }),

      setMonth: (month) => set({ month }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        active: state.active,
        dailyGoalMinutes: state.dailyGoalMinutes,
        theme: state.theme,
        view: state.view,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
