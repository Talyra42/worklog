import { BrandMark } from './BrandMark'
import { Icon } from './Icon'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { NAV_ITEMS } from '../lib/nav'
import { useAuth } from '../store/useAuth'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import styles from './Sidebar.module.scss'

export function Sidebar() {
  const view = useWorklog((state) => state.view)
  const setView = useWorklog((state) => state.setView)
  const email = useAuth((state) => state.user?.email ?? '')
  const signOut = useAuth((state) => state.signOut)
  const askConfirm = useUi((state) => state.askConfirm)
  const sync = useSyncStatus()

  const handleSignOut = () => {
    askConfirm({
      title: '退出登录？',
      description: '下次用同一个邮箱登录就能继续。',
      confirmLabel: '退出',
      onConfirm: () => {
        void signOut()
      },
    })
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <BrandMark size={34} className={styles.brandMark} />
        <span className={styles.brandText}>
          <strong>Worklog</strong>
          <span>工时记录</span>
        </span>
      </div>

      <nav className={styles.nav} aria-label="主导航">
        {NAV_ITEMS.map((item) => {
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
            data-state={sync.state}
            title={sync.state === 'ok' ? '与云端保持同步' : sync.label}
          >
            <span className={styles.dot} />
            <span className={styles.syncLabel}>{sync.label}</span>
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

        <div className={styles.appearance}>
          <span className={styles.appearanceLabel}>外观</span>
          <ThemeSwitcher compact />
        </div>
      </div>
    </aside>
  )
}
