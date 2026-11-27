import { Icon, type IconName } from './Icon'
import { useAuth } from '../store/useAuth'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import type { View } from '../types'
import styles from './Sidebar.module.scss'

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'today', label: '今日', icon: 'clock' },
  { id: 'month', label: '月度', icon: 'calendar' },
  { id: 'records', label: '记录', icon: 'list' },
]

export function Sidebar() {
  const view = useWorklog((state) => state.view)
  const setView = useWorklog((state) => state.setView)
  const theme = useWorklog((state) => state.theme)
  const toggleTheme = useWorklog((state) => state.toggleTheme)
  const status = useWorklog((state) => state.status)
  const syncing = useWorklog((state) => state.syncing)
  const realtime = useWorklog((state) => state.realtime)

  const email = useAuth((state) => state.user?.email ?? '')
  const signOut = useAuth((state) => state.signOut)
  const askConfirm = useUi((state) => state.askConfirm)

  const busy = status === 'loading' || syncing > 0 || realtime === 'connecting'
  const syncState = busy ? 'busy' : realtime === 'live' ? 'ok' : 'warn'
  const syncLabel =
    status === 'loading'
      ? '加载中…'
      : syncing > 0
        ? '同步中…'
        : realtime === 'live'
          ? '已同步'
          : realtime === 'offline'
            ? '未实时'
            : '连接中…'

  const handleSignOut = () => {
    askConfirm({
      title: '退出登录？',
      description: '记录已经保存在云端，下次用同一个邮箱登录就能继续。',
      confirmLabel: '退出',
      onConfirm: () => {
        void signOut()
      },
    })
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="7.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeOpacity="0.5"
            />
            <path d="M12 12V7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 12l3.1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className={styles.brandText}>
          <strong>Worklog</strong>
          <span>工时记录</span>
        </span>
      </div>

      <nav className={styles.nav} aria-label="主导航">
        {NAV.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={active ? `${styles.navItem} ${styles.active}` : styles.navItem}
              onClick={() => setView(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.accountBar}>
          <span
            className={styles.sync}
            data-state={syncState}
            title={
              syncState === 'ok'
                ? '与云端保持同步'
                : syncState === 'warn'
                  ? '实时通道未连接，操作仍会写入云端'
                  : '正在与云端同步'
            }
          >
            <span className={styles.dot} />
            <span className={styles.syncLabel}>{syncLabel}</span>
          </span>
          <button
            type="button"
            className={styles.signOut}
            onClick={handleSignOut}
            aria-label="退出登录"
            title="退出登录"
          >
            <Icon name="logout" size={15} />
          </button>
        </div>

        <span className={styles.email} title={email}>
          {email || '已登录'}
        </span>

        <button
          type="button"
          className={styles.theme}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} />
          <span className={styles.themeLabel}>{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
        </button>
        <p className={styles.note}>数据只保存在云端 · 仅你可见</p>
      </div>
    </aside>
  )
}
