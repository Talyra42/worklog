import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '../components/Icon'
import { SessionRow } from '../components/SessionRow'
import { useNow } from '../hooks/useNow'
import { buildBackup, downloadFile, parseBackup, toCsv } from '../lib/backup'
import { markLegacyImported, readLegacySessions } from '../lib/legacy'
import { sortByStart, totalMs } from '../lib/stats'
import {
  dateKey,
  formatDayLabel,
  formatDuration,
  formatTimeRange,
  monthKey,
  formatMonthLabel,
} from '../lib/time'
import { useToast } from '../store/useToast'
import { useUi } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import type { Session } from '../types'
import styles from './RecordsView.module.scss'

export function RecordsView() {
  const sessions = useWorklog((state) => state.sessions)
  const active = useWorklog((state) => state.active)
  const goalMinutes = useWorklog((state) => state.dailyGoalMinutes)
  const importSessions = useWorklog((state) => state.importSessions)
  const clearSessions = useWorklog((state) => state.clearSessions)
  const setGoal = useWorklog((state) => state.setGoal)
  const deleteSession = useWorklog((state) => state.deleteSession)
  const openEditor = useUi((state) => state.openEditor)
  const askConfirm = useUi((state) => state.askConfirm)
  const pushToast = useToast((state) => state.push)

  const tick = useNow(60_000)
  const now = tick
  const fileRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<string>('all')
  const [legacy, setLegacy] = useState<Session[]>(() => readLegacySessions())

  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    for (const session of sessions) months.add(monthKey(session.start))
    return [...months].sort((a, b) => (a < b ? 1 : -1))
  }, [sessions])

  const filtered = useMemo(
    () =>
      filter === 'all' || !monthOptions.includes(filter)
        ? sessions
        : sessions.filter((session) => monthKey(session.start) === filter),
    [sessions, filter, monthOptions],
  )

  const groups = useMemo(() => {
    const buckets = new Map<string, Session[]>()
    for (const session of filtered) {
      const key = dateKey(session.start)
      const bucket = buckets.get(key)
      if (bucket) bucket.push(session)
      else buckets.set(key, [session])
    }
    return [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => {
        const sorted = sortByStart(list)
        return { date, sessions: sorted, ms: totalMs(sorted) }
      })
  }, [filtered])

  const filteredMs = useMemo(() => totalMs(filtered), [filtered])

  const activeFilter = filter === 'all' || !monthOptions.includes(filter) ? 'all' : filter

  const handleExportJson = () => {
    downloadFile(
      `worklog-${dateKey(now)}.json`,
      JSON.stringify(buildBackup(sessions, goalMinutes), null, 2),
      'application/json',
    )
    pushToast('已导出 JSON 备份', 'success')
  }

  const handleExportCsv = () => {
    downloadFile(`worklog-${monthKey(now)}.csv`, toCsv(sessions), 'text/csv;charset=utf-8')
    pushToast('已导出 CSV 表格', 'success')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const parsed = parseBackup(await file.text())
      askConfirm({
        title: '导入这些记录？',
        description: `文件里找到 ${parsed.sessions.length} 段记录，已经存在的会自动跳过。`,
        confirmLabel: '导入',
        onConfirm: () => {
          void (async () => {
            const added = await importSessions(parsed.sessions)
            if (added < 0) return
            if (parsed.dailyGoalMinutes) await setGoal(parsed.dailyGoalMinutes)
            pushToast(added > 0 ? `已导入 ${added} 段记录` : '没有新的记录可导入')
          })()
        },
      })
    } catch (error) {
      pushToast(error instanceof Error ? error.message : '导入失败', 'danger')
    }
  }

  const handleLegacyImport = () => {
    if (legacy.length === 0) return
    askConfirm({
      title: '导入本机旧数据？',
      description: `在浏览器里找到 ${legacy.length} 段旧版本记录，导入后会按 id 去重，本机原数据不会被删除。`,
      confirmLabel: '导入',
      onConfirm: () => {
        void (async () => {
          const added = await importSessions(legacy)
          if (added < 0) return
          markLegacyImported()
          setLegacy([])
          pushToast(added > 0 ? `已导入 ${added} 段旧记录` : '旧记录已经全部在云端了')
        })()
      },
    })
  }

  const handleClear = () => {
    askConfirm({
      title: '清空全部记录？',
      description: active
        ? `将删除 ${sessions.length} 段记录和正在进行的计时，且无法恢复。建议先导出备份。`
        : `将删除 ${sessions.length} 段记录，且无法恢复。建议先导出备份。`,
      confirmLabel: '清空',
      tone: 'danger',
      onConfirm: () => {
        void clearSessions().then((ok) => {
          if (ok) pushToast('已清空全部记录')
        })
      },
    })
  }

  const handleDelete = (session: Session) => {
    askConfirm({
      title: '删除这段记录？',
      description: `${formatDayLabel(session.start)} ${formatTimeRange(session)}，删除后无法恢复。`,
      confirmLabel: '删除',
      tone: 'danger',
      onConfirm: () => {
        void deleteSession(session.id).then((ok) => {
          if (ok) pushToast('记录已删除')
        })
      },
    })
  }

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>全部记录</p>
          <h1 className={styles.title}>
            {sessions.length > 0 ? `${sessions.length} 段工作记录` : '还没有任何记录'}
          </h1>
          <p className={styles.sub}>
            累计 {formatDuration(totalMs(sessions))}
            {activeFilter !== 'all' ? ` · 当前筛选 ${formatDuration(filteredMs)}` : ''}
          </p>
        </div>

        <label className={styles.filter}>
          <span className={styles.filterLabel}>筛选</span>
          <select
            value={activeFilter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="按月份筛选记录"
          >
            <option value="all">全部时间</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {sessions.length === 0 ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}>
            <Icon name="list" size={22} />
          </span>
          <p>这里会列出你的每一段工作时间</p>
          <span>从「今日」按下开始工作，或者先手动补录一段。</span>
          <button type="button" className={styles.emptyButton} onClick={() => openEditor({})}>
            补录一段
          </button>
        </div>
      ) : groups.length === 0 ? (
        <p className={styles.noMatch}>这个时间段还没有记录。</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section
              key={group.date}
              className={styles.group}
              aria-labelledby={`day-${group.date}`}
            >
              <header className={styles.groupHeader}>
                <h2 id={`day-${group.date}`} className={styles.groupTitle}>
                  {formatDayLabel(group.date)}
                </h2>
                <span className={styles.groupTotal}>{formatDuration(group.ms)}</span>
              </header>
              <ul className={styles.list}>
                {group.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onEdit={() => openEditor({ session })}
                    onDelete={() => handleDelete(session)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className={styles.dataCard}>
        <div className={styles.dataIntro}>
          <h2>数据与备份</h2>
          <p>
            记录保存在你的 Supabase
            项目里，登录同一个账号就能在别的设备继续。浏览器不再保存工时副本；需要离线留存时，可以随时导出备份。
          </p>
        </div>
        <div className={styles.dataActions}>
          <button type="button" className={styles.dataButton} onClick={handleExportJson}>
            <Icon name="download" size={15} />
            导出 JSON
          </button>
          <button type="button" className={styles.dataButton} onClick={handleExportCsv}>
            <Icon name="download" size={15} />
            导出 CSV
          </button>
          <button
            type="button"
            className={styles.dataButton}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={15} />
            导入 JSON
          </button>
          {legacy.length > 0 ? (
            <button type="button" className={styles.dataButton} onClick={handleLegacyImport}>
              <Icon name="upload" size={15} />
              导入本机旧数据（{legacy.length}）
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.dataButton} ${styles.danger}`}
            onClick={handleClear}
            disabled={sessions.length === 0 && !active}
          >
            <Icon name="trash" size={15} />
            清空全部
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className={styles.fileInput}
          onChange={handleImport}
          tabIndex={-1}
        />
      </section>
    </div>
  )
}
