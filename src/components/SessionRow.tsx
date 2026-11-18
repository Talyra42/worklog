import { dateKey, formatDuration, formatTime } from '../lib/time'
import type { Session } from '../types'
import { Icon } from './Icon'
import styles from './SessionRow.module.scss'

interface SessionRowProps {
  session: Session
  now?: number
  running?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function SessionRow({ session, now, running = false, onEdit, onDelete }: SessionRowProps) {
  const end = running ? Math.max(now ?? session.end, session.start) : session.end
  const crossesMidnight = dateKey(session.start) !== dateKey(end)
  const duration = Math.max(0, end - session.start)

  return (
    <li className={running ? `${styles.row} ${styles.running}` : styles.row}>
      <span className={styles.time}>
        {formatTime(session.start)}
        <span className={styles.dash}>–</span>
        {formatTime(end)}
        {crossesMidnight ? (
          <sup className={styles.nextDay} title="次日结束">
            +1
          </sup>
        ) : null}
      </span>

      {running ? (
        <span className={styles.live}>
          <span className={styles.pulse} />
          进行中
        </span>
      ) : (
        <span className={styles.duration}>{formatDuration(duration)}</span>
      )}

      {onEdit || onDelete ? (
        <span className={styles.actions}>
          {onEdit ? (
            <button type="button" className={styles.action} onClick={onEdit} aria-label="编辑记录">
              <Icon name="pencil" size={15} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              onClick={onDelete}
              aria-label="删除记录"
            >
              <Icon name="trash" size={15} />
            </button>
          ) : null}
        </span>
      ) : null}
    </li>
  )
}
