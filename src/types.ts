export interface Session {
  /** Stable id, also used for de-duplicating imports. */
  id: string
  /** Epoch milliseconds. */
  start: number
  /** Epoch milliseconds, always greater than `start`. */
  end: number
}

export interface ActiveSession {
  id: string
  start: number
}

export type View = 'today' | 'month' | 'records'

export type Theme = 'light' | 'dark'
