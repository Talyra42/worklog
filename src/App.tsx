import { useEffect } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SessionDialog } from './components/SessionDialog'
import { Sidebar } from './components/Sidebar'
import { ToastHost } from './components/ToastHost'
import { useWorklog } from './store/useWorklog'
import { useUi } from './store/useUi'
import { MonthView } from './views/MonthView'
import { RecordsView } from './views/RecordsView'
import { TodayView } from './views/TodayView'
import styles from './App.module.scss'

export default function App() {
  const view = useWorklog((state) => state.view)
  const theme = useWorklog((state) => state.theme)
  const editorOpen = useUi((state) => state.editor.open)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className={styles.app}>
      <Sidebar />

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
