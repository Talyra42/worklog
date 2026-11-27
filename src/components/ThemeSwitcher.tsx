import { Icon, type IconName } from './Icon'
import { useWorklog } from '../store/useWorklog'
import type { ThemeMode } from '../types'
import styles from './ThemeSwitcher.module.scss'

const OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'system', label: '跟随系统', icon: 'monitor' },
  { mode: 'light', label: '浅色', icon: 'sun' },
  { mode: 'dark', label: '深色', icon: 'moon' },
]

interface ThemeSwitcherProps {
  compact?: boolean
}

export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const themeMode = useWorklog((state) => state.themeMode)
  const setThemeMode = useWorklog((state) => state.setThemeMode)

  return (
    <div
      className={compact ? `${styles.switcher} ${styles.compact}` : styles.switcher}
      role="group"
      aria-label="外观模式"
    >
      {OPTIONS.map((option) => {
        const active = themeMode === option.mode
        return (
          <button
            key={option.mode}
            type="button"
            className={styles.option}
            aria-pressed={active}
            aria-label={compact ? option.label : undefined}
            title={option.label}
            onClick={() => setThemeMode(option.mode)}
          >
            <Icon name={option.icon} size={15} />
            {compact ? null : <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
