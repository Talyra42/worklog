import { useEffect } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { CloudStatusScreen } from './components/CloudStatusScreen'
import { ConfirmDialog } from './components/ConfirmDialog'
import { MobileChrome } from './components/MobileChrome'
import { SessionDialog } from './components/SessionDialog'
import { Sidebar } from './components/Sidebar'
import { ToastHost } from './components/ToastHost'
import { useCloudSync } from './hooks/useCloudSync'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuth } from './store/useAuth'
import { useUi } from './store/useUi'
import { useWorklog } from './store/useWorklog'
import { MonthView } from './views/MonthView'
import { RecordsView } from './views/RecordsView'
import { TodayView } from './views/TodayView'
import styles from './App.module.scss'

export default function App() {
  const view = useWorklog((state) => state.view)
  const theme = useWorklog((state) => state.theme)
  const themeMode = useWorklog((state) => state.themeMode)
  const refreshSystemTheme = useWorklog((state) => state.refreshSystemTheme)
  const status = useWorklog((state) => state.status)
  const loadError = useWorklog((state) => state.loadError)
  const load = useWorklog((state) => state.load)

  const authStatus = useAuth((state) => state.status)
  const user = useAuth((state) => state.user)
  const initAuth = useAuth((state) => state.init)
  const signOut = useAuth((state) => state.signOut)

  const editorOpen = useUi((state) => state.editor.open)

  useEffect(() => initAuth(), [initAuth])
  useCloudSync(user?.id ?? null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (themeMode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => refreshSystemTheme()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [themeMode, refreshSystemTheme])

  if (!isSupabaseConfigured) {
    return (
      <CloudStatusScreen
        tone="config"
        title="还差一步：连接你的 Supabase"
        message="这个版本把数据存在云端。填好项目地址和 anon key 之后，就能注册、登录并同步了。"
      />
    )
  }

  if (authStatus === 'loading') {
    return <CloudStatusScreen tone="loading" title="正在检查登录状态…" />
  }

  if (!user) {
    return <AuthScreen />
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <CloudStatusScreen
        tone="loading"
        title="正在从云端加载记录…"
        message="登录成功，正在同步你的工时数据。"
      />
    )
  }

  if (status === 'error') {
    return (
      <CloudStatusScreen
        tone="error"
        title="无法连接云端"
        message={loadError ?? '请检查网络和 Supabase 配置后重试。'}
        onRetry={() => void load(user.id)}
        onSignOut={() => void signOut()}
      />
    )
  }

  return (
    <div className={styles.app}>
      <Sidebar />
      <MobileChrome />

      <main className={styles.main}>
        <div key={view} className={styles.view}>
          {view === 'today' ? <TodayView /> : null}
          {view === 'month' ? <MonthView /> : null}
          {view === 'records' ? <RecordsView /> : null}
        </div>
      </main>

      {editorOpen ? <SessionDialog /> : null}
      <ConfirmDialog />
      <ToastHost />
    </div>
  )
}
