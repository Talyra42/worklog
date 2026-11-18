import { Icon, type IconName } from './Icon'
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
        <button
          type="button"
          className={styles.theme}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} />
          <span className={styles.themeLabel}>{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
        </button>
        <p className={styles.note}>数据只保存在本机浏览器</p>
      </div>
    </aside>
  )
}
