import { useWorklog } from '../store/useWorklog'

export type SyncVisualState = 'ok' | 'busy' | 'warn'

/** Shared sync badge state for the desktop sidebar and the mobile account sheet. */
export function useSyncStatus(): { state: SyncVisualState; label: string } {
  const status = useWorklog((state) => state.status)
  const syncing = useWorklog((state) => state.syncing)
  const realtime = useWorklog((state) => state.realtime)

  const busy = status === 'loading' || syncing > 0 || realtime === 'connecting'
  const state: SyncVisualState = busy ? 'busy' : realtime === 'live' ? 'ok' : 'warn'
  const label =
    status === 'loading'
      ? '加载中…'
      : syncing > 0
        ? '同步中…'
        : realtime === 'live'
          ? '已同步'
          : realtime === 'offline'
            ? '未实时'
            : '连接中…'

  return { state, label }
}
