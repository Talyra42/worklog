import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { NAV_ITEMS } from '../lib/nav'
import { useAuth } from '../store/useAuth'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import styles from './MobileChrome.module.scss'

export function MobileChrome() {
  const view = useWorklog((state) => state.view)
  const setView = useWorklog((state) => state.setView)
  const email = useAuth((state) => state.user?.email ?? '')
  const signOut = useAuth((state) => state.signOut)
  const askConfirm = useUi((state) => state.askConfirm)
  const sync = useSyncStatus()
  const [sheetOpen, setSheetOpen] = useState(false)

  const initial = email ? email[0]?.toUpperCase() : 'W'

  const handleSignOut = () => {
    setSheetOpen(false)
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
    <>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <BrandMark size={28} className={styles.brandMark} />
          <span>Worklog</span>
        </div>
        <button
          type="button"
          className={styles.avatar}
          onClick={() => setSheetOpen(true)}
          aria-label="账户与外观"
          aria-expanded={sheetOpen}
        >
          {initial}
        </button>
      </header>

      <nav className={styles.bottomNav} aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setView(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="账户与外观" size="sm">
        <div className={styles.sheet}>
          <div className={styles.identity}>
            <span className={styles.sheetAvatar}>{initial}</span>
            <span className={styles.sheetEmail} title={email}>
              {email || '已登录'}
            </span>
          </div>

          <div className={styles.sync} data-state={sync.state}>
            <span className={styles.dot} />
            {sync.label}
          </div>

          <div className={styles.appearance}>
            <span className={styles.appearanceLabel}>外观</span>
            <ThemeSwitcher />
          </div>

          <button type="button" className={styles.logout} onClick={handleSignOut}>
            <Icon name="logout" size={15} />
            退出登录
          </button>
        </div>
      </Modal>
    </>
  )
}
