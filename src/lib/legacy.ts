import type { Session } from '../types'
import { parseBackup } from './backup'

/** The key used by the pre-cloud version of Worklog. */
export const LEGACY_STORAGE_KEY = 'worklog.store.v1'
const LEGACY_MIGRATED_KEY = 'worklog.legacy.migrated'

/**
 * Read (but never rely on) the old local snapshot.
 * The data is only used for a one-time import into Supabase.
 */
export function readLegacySessions(): Session[] {
  try {
    if (localStorage.getItem(LEGACY_MIGRATED_KEY) === '1') return []
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as { state?: { sessions?: unknown } }
    if (!Array.isArray(parsed.state?.sessions)) return []

    // Reuse the backup parser for validation and id de-duplication.
    return parseBackup(JSON.stringify({ sessions: parsed.state.sessions })).sessions
  } catch {
    return []
  }
}

export function markLegacyImported(): void {
  try {
    localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
  } catch {
    /* ignore */
  }
}
