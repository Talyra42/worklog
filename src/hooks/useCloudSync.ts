import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ProfileRow, SessionRow } from '../lib/cloud'
import { useWorklog } from '../store/useWorklog'

/**
 * Loads the signed-in account and keeps it live:
 *   * Supabase Realtime pushes inserts/updates/deletes from other devices.
 *   * Refetch on tab focus / network reconnect as a safety net.
 */
export function useCloudSync(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      useWorklog.getState().reset()
      return
    }

    let disposed = false
    /** Counts realtime events so a slow initial fetch cannot overwrite newer rows. */
    let version = 0

    useWorklog.getState().setRealtime('connecting')

    const channel: RealtimeChannel = supabase
      .channel(`worklog:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'worklog_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          version += 1
          if (payload.eventType === 'DELETE') {
            useWorklog.getState().applyRemoteSession(payload.old as SessionRow, 'DELETE')
          } else {
            useWorklog.getState().applyRemoteSession(payload.new as SessionRow, payload.eventType)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'worklog_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          version += 1
          useWorklog.getState().applyRemoteProfile(payload.new as ProfileRow)
        },
      )
      .subscribe((status) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          useWorklog.getState().setRealtime('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          useWorklog.getState().setRealtime('offline')
        } else {
          useWorklog.getState().setRealtime('connecting')
        }
      })

    const loadVersion = version
    void useWorklog
      .getState()
      .load(userId)
      .then(() => {
        if (!disposed && version !== loadVersion) void useWorklog.getState().refresh()
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void useWorklog.getState().refresh()
    }
    const onOnline = () => {
      void useWorklog.getState().refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      void supabase.removeChannel(channel)
      useWorklog.getState().setRealtime('offline')
    }
  }, [userId])
}
