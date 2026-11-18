import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { findOverlap } from '../lib/stats'
import {
  addDays,
  formatDuration,
  formatTimeRange,
  HOUR_MS,
  MINUTE_MS,
  toTimestamp,
} from '../lib/time'
import { uid } from '../lib/id'
import { useToast } from '../store/useToast'
import { useUi, type SessionDraft } from '../store/useUi'
import { useWorklog } from '../store/useWorklog'
import styles from './SessionDialog.module.scss'

export function SessionDialog() {
  const editor = useUi((state) => state.editor)
  const closeEditor = useUi((state) => state.closeEditor)
  const sessions = useWorklog((state) => state.sessions)
  const active = useWorklog((state) => state.active)
  const addSession = useWorklog((state) => state.addSession)
  const updateSession = useWorklog((state) => state.updateSession)
  const deleteSession = useWorklog((state) => state.deleteSession)
  const pushToast = useToast((state) => state.push)

  const [form, setForm] = useState<SessionDraft>(editor.draft)
  const [error, setError] = useState<string | null>(null)
  const { session } = editor

  const startTs = form.date && form.start ? toTimestamp(form.date, form.start) : Number.NaN
  const baseEnd = form.date && form.end ? toTimestamp(form.date, form.end) : Number.NaN
  const crossDay = Number.isFinite(baseEnd) && Number.isFinite(startTs) && baseEnd < startTs
  const endTs = crossDay ? addDays(baseEnd, 1) : baseEnd
  const duration = endTs - startTs
  const valid = Number.isFinite(startTs) && Number.isFinite(endTs) && duration > 0

  const update = (patch: Partial<SessionDraft>) => {
    setForm((current) => ({ ...current, ...patch }))
    setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.date || !form.start || !form.end) {
      setError('请填写完整的日期和时间')
      return
    }
    if (!valid) {
      setError('结束时间必须晚于开始时间')
      return
    }
    if (duration >= 23 * HOUR_MS) {
      setError('单段记录不能超过 23 小时')
      return
    }
    if (endTs > Date.now() + MINUTE_MS) {
      setError('结束时间不能晚于现在')
      return
    }
    if (active && endTs > active.start) {
      setError('与正在进行中的一段重叠，请先结束当前计时')
      return
    }

    const overlap = findOverlap(sessions, startTs, endTs, session?.id)
    if (overlap) {
      setError(`与已有的 ${formatTimeRange(overlap)} 记录重叠`)
      return
    }

    if (session) {
      updateSession(session.id, { start: startTs, end: endTs })
      pushToast('记录已更新', 'success')
    } else {
      addSession({ id: uid(), start: startTs, end: endTs })
      pushToast('已补录一段记录', 'success')
    }
    closeEditor()
  }

  const handleDelete = () => {
    if (!session) return
    deleteSession(session.id)
    pushToast('记录已删除', 'success')
    closeEditor()
  }

  return (
    <Modal
      open
      onClose={closeEditor}
      title={session ? '编辑记录' : '补录一段工作'}
      description={session ? undefined : '忘记打卡时，可以在这里手动补上一段时间。'}
      footer={
        <>
          {session ? (
            <button
              type="button"
              className={`${styles.button} ${styles.delete}`}
              onClick={handleDelete}
            >
              删除
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.button} ${styles.ghost}`}
            onClick={closeEditor}
          >
            取消
          </button>
          <button
            type="submit"
            form="session-form"
            className={`${styles.button} ${styles.primary}`}
          >
            保存
          </button>
        </>
      }
    >
      <form id="session-form" className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>日期</span>
          <input
            type="date"
            value={form.date}
            max={editor.today}
            onChange={(event) => update({ date: event.target.value })}
            required
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>开始时间</span>
            <input
              type="time"
              step={60}
              value={form.start}
              onChange={(event) => update({ start: event.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>结束时间</span>
            <input
              type="time"
              step={60}
              value={form.end}
              onChange={(event) => update({ end: event.target.value })}
              required
            />
          </label>
        </div>

        <p className={styles.note}>结束时间早于开始时间时，会自动算到次日。</p>

        <div className={styles.preview}>
          <span>时长</span>
          <strong>{valid ? formatDuration(duration) : '—'}</strong>
          {crossDay ? <span className={styles.tag}>跨天</span> : null}
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
