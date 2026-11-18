import { useState } from 'react'
import { Icon } from '../components/Icon'
import { MonthCalendar } from '../components/MonthCalendar'
import { SessionRow } from '../components/SessionRow'
import { StatCard } from '../components/StatCard'
import { useNow } from '../hooks/useNow'
import { monthStats, splitSession } from '../lib/stats'
import {
  dateKey,
  formatDayLabel,
  formatDuration,
  formatMonthDay,
  formatMonthLabel,
  formatTimeRange,
  monthKey,
  shiftMonth,
} from '../lib/time'
import { useToast } from '../store/useToast'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import type { Session } from '../types'
import styles from './MonthView.module.scss'

export function MonthView() {
  const sessions = useWorklog((state) => state.sessions)
  const active = useWorklog((state) => state.active)
  const month = useWorklog((state) => state.month)
  const setMonth = useWorklog((state) => state.setMonth)
  const deleteSession = useWorklog((state) => state.deleteSession)
  const openEditor = useUi((state) => state.openEditor)
  const askConfirm = useUi((state) => state.askConfirm)
  const pushToast = useToast((state) => state.push)

  const tick = useNow(30_000)
  const now = tick
  const [picked, setPicked] = useState<string | null>(null)

  const running: Session | null = active ? { id: active.id, start: active.start, end: now } : null
  const allSessions = running ? [...sessions, running] : sessions

  const stats = monthStats(allSessions, month)
  const today = dateKey(now)
  const currentMonth = monthKey(now)
  const selected =
    picked && picked.startsWith(month) ? picked : today.startsWith(month) ? today : null

  const selectedSessions = selected
    ? allSessions
        .filter((session) => splitSession(session).some((slice) => slice.date === selected))
        .sort((a, b) => a.start - b.start)
    : []
  const selectedMs = selected ? (stats.byDate.get(selected) ?? 0) : 0
  const hasCrossDay = selectedSessions.some(
    (session) => dateKey(session.start) !== dateKey(session.end),
  )

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

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>月度视图</p>
          <h1 className={styles.title}>{formatMonthLabel(month)}</h1>
        </div>

        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="上个月"
          >
            <Icon name="chevronLeft" size={17} />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="下个月"
          >
            <Icon name="chevronRight" size={17} />
          </button>
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => {
              setMonth(currentMonth)
              setPicked(null)
            }}
            disabled={month === currentMonth}
          >
            本月
          </button>
        </div>
      </header>

      <div className={styles.stats}>
        <StatCard
          label="总工时"
          value={formatDuration(stats.totalMs)}
          hint={`${stats.days} 天有记录`}
          accent
        />
        <StatCard label="有记录天数" value={`${stats.days} 天`} hint={formatMonthLabel(month)} />
        <StatCard label="日均" value={formatDuration(stats.averageMs)} hint="按有记录的天数算" />
        <StatCard
          label="最长一天"
          value={stats.longestMs > 0 ? formatDuration(stats.longestMs) : '—'}
          hint={stats.longestDate ? formatMonthDay(stats.longestDate) : '还没有记录'}
        />
      </div>

      <section className={styles.calendarCard} aria-label="月度日历">
        <MonthCalendar
          month={month}
          totals={stats.byDate}
          selected={selected}
          today={today}
          onSelect={setPicked}
        />
      </section>

      <section className={styles.panel} aria-labelledby="day-detail">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="day-detail" className={styles.panelTitle}>
              {selected ? formatDayLabel(selected) : '选择一天查看详情'}
            </h2>
            <p className={styles.panelMeta}>
              {selected
                ? `${selectedSessions.length} 段 · ${formatDuration(selectedMs)}`
                : '点击日历里的任意一天'}
            </p>
          </div>
          {selected ? (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => openEditor({ defaultDate: selected })}
            >
              <Icon name="plus" size={14} />
              补录
            </button>
          ) : null}
        </header>

        {selected && selectedSessions.length > 0 ? (
          <ul className={styles.list}>
            {selectedSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                now={now}
                running={session.id === active?.id}
                onEdit={session.id === active?.id ? undefined : () => openEditor({ session })}
                onDelete={session.id === active?.id ? undefined : () => handleDelete(session)}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            {selected ? '这一天没有记录。' : '上个月或下个月随时切换。'}
          </p>
        )}

        {hasCrossDay ? <p className={styles.note}>跨零点的记录会按实际时间拆分到两天。</p> : null}
      </section>
    </div>
  )
}
