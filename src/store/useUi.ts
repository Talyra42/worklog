import { create } from 'zustand'
import type { Session } from '../types'
import { dateKey, fromTimestamp, HOUR_MS, MINUTE_MS, startOfDay } from '../lib/time'
import { useWorklog } from './useWorklog'

const ROUND_TO = 5 * MINUTE_MS
const MIN_GAP_MS = 10 * MINUTE_MS

export interface SessionDraft {
  date: string
  start: string
  end: string
}

interface EditorState {
  open: boolean
  /** Existing session being edited, `null` while creating a new one. */
  session: Session | null
  draft: SessionDraft
  /** Today's `YYYY-MM-DD`, captured when the dialog opens. */
  today: string
}

interface ConfirmState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone: 'default' | 'danger'
  onConfirm: (() => void) | null
}

interface UiState {
  editor: EditorState
  openEditor: (options?: { session?: Session; defaultDate?: string }) => void
  closeEditor: () => void

  confirm: ConfirmState
  askConfirm: (options: {
    title: string
    description: string
    confirmLabel?: string
    tone?: 'default' | 'danger'
    onConfirm: () => void
  }) => void
  closeConfirm: () => void
}

const emptyDraft: SessionDraft = { date: '', start: '09:00', end: '10:00' }

const closedEditor: EditorState = {
  open: false,
  session: null,
  draft: emptyDraft,
  today: '',
}

const closedConfirm: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: '确认',
  tone: 'default',
  onConfirm: null,
}

/** The most recent gap of at least 10 minutes before `cutoff`, capped at one hour. */
function findLastFreeBlock(
  cutoff: number,
  sessions: Session[],
): { start: number; end: number } | null {
  const endLimit = Math.floor(cutoff / ROUND_TO) * ROUND_TO
  const sorted = sessions
    .filter((session) => session.start < endLimit)
    .sort((a, b) => a.start - b.start)

  let cursor = endLimit
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const session = sorted[index]
    if (session.end <= cursor) {
      if (cursor - session.end >= MIN_GAP_MS) {
        return { start: Math.max(session.end, cursor - HOUR_MS), end: cursor }
      }
      cursor = session.start
    } else if (session.start < cursor) {
      cursor = session.start
    }
  }

  const dayStart = startOfDay(cutoff)
  if (cursor - dayStart >= MIN_GAP_MS) {
    return { start: Math.max(dayStart, cursor - HOUR_MS), end: cursor }
  }
  return null
}

/** A sensible default block: a free hour before now, or a free hour before the running session. */
function buildDraft(date: string, now: number): SessionDraft {
  if (date !== dateKey(now)) {
    return { date, start: '09:00', end: '10:00' }
  }

  const { sessions, active } = useWorklog.getState()
  const cutoff = active && active.start < now ? active.start : now
  const block = findLastFreeBlock(cutoff, sessions)
  if (!block) {
    return { date, start: '09:00', end: '10:00' }
  }

  return {
    date,
    start: fromTimestamp(block.start).time,
    end: fromTimestamp(block.end).time,
  }
}

export const useUi = create<UiState>()((set, get) => ({
  editor: closedEditor,

  openEditor: (options = {}) => {
    const now = Date.now()
    const today = dateKey(now)

    let draft: SessionDraft
    if (options.session) {
      const start = fromTimestamp(options.session.start)
      const end = fromTimestamp(options.session.end)
      draft = { date: start.date, start: start.time, end: end.time }
    } else {
      draft = buildDraft(options.defaultDate ?? today, now)
    }

    set({ editor: { open: true, session: options.session ?? null, draft, today } })
  },

  closeEditor: () => set({ editor: closedEditor }),

  confirm: closedConfirm,

  askConfirm: (options) =>
    set({
      confirm: {
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? '确认',
        tone: options.tone ?? 'default',
        onConfirm: options.onConfirm,
      },
    }),

  closeConfirm: () => {
    const { confirm } = get()
    set({ confirm: { ...confirm, open: false, onConfirm: null } })
  },
}))
