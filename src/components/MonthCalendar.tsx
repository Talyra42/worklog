import { dayLevel } from '../lib/stats'
import { daysInMonth, formatHoursShort, isoWeekday } from '../lib/time'
import styles from './MonthCalendar.module.scss'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const LEGEND_LEVELS = [1, 2, 3, 4, 5] as const

interface MonthCalendarProps {
  month: string
  totals: Map<string, number>
  selected: string | null
  today: string
  onSelect: (date: string) => void
}

export function MonthCalendar({ month, totals, selected, today, onSelect }: MonthCalendarProps) {
  const lead = isoWeekday(`${month}-01`) - 1
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth(month) }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className={styles.wrapper}>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className={styles.days}>
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`blank-${index}`} className={styles.blank} aria-hidden="true" />
          }

          const date = `${month}-${String(day).padStart(2, '0')}`
          const ms = totals.get(date) ?? 0
          const level = dayLevel(ms)
          const classes = [styles.cell]
          if (date === today) classes.push(styles.today)
          if (date === selected) classes.push(styles.selected)

          return (
            <button
              key={date}
              type="button"
              className={classes.join(' ')}
              data-level={level}
              onClick={() => onSelect(date)}
              aria-label={`${date}${ms > 0 ? `，${formatHoursShort(ms)}` : '，没有记录'}`}
              aria-pressed={date === selected}
            >
              <span className={styles.dayNumber}>{day}</span>
              {ms > 0 ? <span className={styles.dayHours}>{formatHoursShort(ms)}</span> : null}
            </button>
          )
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendText}>工时</span>
        <span className={styles.legendText}>少</span>
        {LEGEND_LEVELS.map((level) => (
          <i key={level} className={styles.swatch} data-level={level} />
        ))}
        <span className={styles.legendText}>多</span>
      </div>
    </div>
  )
}
