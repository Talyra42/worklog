import { useEffect } from 'react'
import { Icon } from '../components/Icon'
import { RingTimer } from '../components/RingTimer'
import { SessionRow } from '../components/SessionRow'
import { StatCard } from '../components/StatCard'
import { useNow } from '../hooks/useNow'
import { monthStats, msInWindow, splitSession } from '../lib/stats'
import {
  dateKey,
  formatDayLabel,
  formatDuration,
  formatTime,
  formatTimeRange,
  greeting,
  HOUR_MS,
  monthKey,
  startOfDay,
  startOfWeek,
} from '../lib/time'
import { useToast } from '../store/useToast'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import type { Session } from '../types'
import styles from './TodayView.module.scss'

const SUSPICIOUS_MS = 16 * HOUR_MS

export function TodayView() {
  const sessions = useWorklog((state) => state.sessions)
  const active = useWorklog((state) => state.active)
  const goalMinutes = useWorklog((state) => state.dailyGoalMinutes)
  const punch = useWorklog((state) => state.punch)
  const stopActive = useWorklog((state) => state.stopActive)
  const discardActive = useWorklog((state) => state.discardActive)
  const deleteSession = useWorklog((state) => state.deleteSession)
  const setGoal = useWorklog((state) => state.setGoal)
  const openEditor = useUi((state) => state.openEditor)
  const askConfirm = useUi((state) => state.askConfirm)
  const pushToast = useToast((state) => state.push)

  const tick = useNow(active ? 1000 : 30_000)
  const now = tick

  const running: Session | null = active ? { id: active.id, start: active.start, end: now } : null
  const allSessions = running ? [...sessions, running] : sessions

  const todayStart = startOfDay(now)
  const todayMs = msInWindow(allSessions, todayStart, now)
  const weekMs = msInWindow(allSessions, startOfWeek(now), now)
  const month = monthStats(allSessions, monthKey(now))

  const todayKey = dateKey(now)
  const todayRows = sessions
    .flatMap((session) => {
      const slice = splitSession(session).find((item) => item.date === todayKey)
      return slice ? [{ session, slice }] : []
    })
    .sort((a, b) => b.slice.start - a.slice.start)
  const rowCount = todayRows.length + (running ? 1 : 0)

  const activeMs = active ? Math.max(0, now - active.start) : 0
  const suspicious = active !== null && activeMs > SUSPICIOUS_MS

  const handlePunch = () => {
    punch()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      punch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [punch])

  const handleDelete = (session: Session) => {
    askConfirm({
      title: '删除这段记录？',
      description: `${formatDayLabel(session.start)} ${formatTimeRange(session)}，删除后无法恢复。`,
      confirmLabel: '删除',
      tone: 'danger',
      onConfirm: () => {
        deleteSession(session.id)
        pushToast('记录已删除')
      },
    })
  }

  const handleDiscard = () => {
    askConfirm({
      title: '作废这段计时？',
      description: '这段从开始到现在的时间不会被保存。',
      confirmLabel: '作废',
      tone: 'danger',
      onConfirm: () => {
        discardActive()
        pushToast('已作废这段计时')
      },
    })
  }

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{formatDayLabel(now)}</p>
          <h1 className={styles.title}>
            {greeting(now)}，
            {todayMs > 0 ? `今天已经记录 ${formatDuration(todayMs)}` : '今天还没有开始记录'}
          </h1>
        </div>
        <div className={styles.clock}>
          <span className={styles.clockTime}>{formatTime(now)}</span>
          <span className={styles.clockLabel}>本地时间</span>
        </div>
      </header>

      {suspicious && active ? (
        <section className={styles.recovery} role="alert">
          <Icon name="alert" size={19} />
          <div className={styles.recoveryText}>
            <strong>这段计时已经持续了 {formatDuration(activeMs)}</strong>
            <p>
              从 {formatDayLabel(active.start)} {formatTime(active.start)} 开始，可能忘记结束了。
            </p>
          </div>
          <div className={styles.recoveryActions}>
            <button type="button" onClick={() => stopActive(now)}>
              结束于现在
            </button>
            <button type="button" onClick={handleDiscard}>
              作废
            </button>
          </div>
        </section>
      ) : null}

      <RingTimer
        now={now}
        activeStart={active?.start ?? null}
        todayMs={todayMs}
        goalMs={goalMinutes * 60_000}
        onPunch={handlePunch}
        onCreate={() => openEditor({ defaultDate: dateKey(now) })}
        onGoalChange={setGoal}
      />

      <div className={styles.stats}>
        <StatCard
          label="今日"
          value={formatDuration(todayMs)}
          hint={rowCount > 0 ? `${rowCount} 段记录` : '还没有记录'}
          accent
        />
        <StatCard label="本周" value={formatDuration(weekMs)} hint="周一至今" />
        <StatCard
          label="本月"
          value={formatDuration(month.totalMs)}
          hint={`${month.days} 天有记录`}
        />
        <StatCard label="日均" value={formatDuration(month.averageMs)} hint="按有记录的天数算" />
      </div>

      <section className={styles.panel} aria-labelledby="today-sessions">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="today-sessions" className={styles.panelTitle}>
              今日记录
            </h2>
            <p className={styles.panelMeta}>
              {rowCount} 段 · {formatDuration(todayMs)}
            </p>
          </div>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => openEditor({ defaultDate: dateKey(now) })}
          >
            <Icon name="plus" size={14} />
            补录一段
          </button>
        </header>

        {rowCount === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Icon name="clock" size={20} />
            </span>
            <p>今天还没有记录</p>
            <span>点击「开始工作」自动计时，或者手动补录一段。</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {running ? <SessionRow session={running} now={now} running /> : null}
            {todayRows.map(({ session, slice }) => (
              <SessionRow
                key={session.id}
                session={session}
                rangeStart={slice.start}
                rangeEnd={slice.end}
                crossDay={dateKey(session.start) !== dateKey(session.end)}
                onEdit={() => openEditor({ session })}
                onDelete={() => handleDelete(session)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
