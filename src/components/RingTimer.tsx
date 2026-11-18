import { Icon } from './Icon'
import { formatClock, formatDuration, formatTime } from '../lib/time'
import styles from './RingTimer.module.scss'

const RADIUS = 106
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GOAL_HOURS = Array.from({ length: 16 }, (_, index) => index + 1)

interface RingTimerProps {
  now: number
  activeStart: number | null
  todayMs: number
  goalMs: number
  onPunch: () => void
  onCreate: () => void
  onGoalChange: (minutes: number) => void
}

export function RingTimer({
  now,
  activeStart,
  todayMs,
  goalMs,
  onPunch,
  onCreate,
  onGoalChange,
}: RingTimerProps) {
  const isActive = activeStart !== null
  const activeMs = isActive ? Math.max(0, now - activeStart) : 0
  const displayMs = isActive ? activeMs : todayMs
  const progress = goalMs > 0 ? Math.min(1, todayMs / goalMs) : 0
  const percent = Math.round(progress * 100)
  const goalHours = Math.max(1, Math.round(goalMs / 3_600_000))
  const reached = progress >= 1

  return (
    <section className={styles.card} aria-label="工作计时器">
      <div className={styles.ringWrap}>
        <svg viewBox="0 0 248 248" className={styles.ring} aria-hidden="true">
          <circle className={styles.track} cx="124" cy="124" r={RADIUS} />
          <circle
            className={styles.progress}
            cx="124"
            cy="124"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.caption}>{isActive ? '本次已进行' : '今日合计'}</span>
          <strong className={styles.clock}>{formatClock(displayMs, isActive)}</strong>
          <span className={styles.percent}>
            {reached ? '已达成今日目标' : `${percent}% · 目标 ${goalHours} 小时`}
          </span>
        </div>
      </div>

      <div className={styles.copy}>
        <div className={styles.statusRow}>
          <span className={isActive ? `${styles.badge} ${styles.live}` : styles.badge}>
            <span className={styles.dot} />
            {isActive ? '正在工作' : '未开始'}
          </span>
          <span className={styles.now}>{formatTime(now)}</span>
        </div>

        <h2 className={styles.headline}>{isActive ? '正在专注' : '开始今天的工作'}</h2>
        <p className={styles.subline}>
          {isActive && activeStart !== null
            ? `从 ${formatTime(activeStart)} 开始，已持续 ${formatDuration(activeMs)}`
            : todayMs > 0
              ? `今天累计 ${formatDuration(todayMs)}`
              : '按下按钮，记录这一段工作的时间'}
        </p>

        <div className={styles.actions}>
          <button type="button" className={isActive ? styles.stop : styles.start} onClick={onPunch}>
            <Icon name={isActive ? 'stop' : 'play'} size={17} />
            {isActive ? '结束工作' : '开始工作'}
          </button>
          <button type="button" className={styles.ghost} onClick={onCreate}>
            <Icon name="plus" size={15} />
            补录
          </button>
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>
            <kbd>空格</kbd> 快速切换
          </span>
          <label className={styles.goal}>
            每日目标
            <select
              value={goalHours}
              onChange={(event) => onGoalChange(Number(event.target.value) * 60)}
              aria-label="每日目标小时数"
            >
              {GOAL_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} 小时
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
