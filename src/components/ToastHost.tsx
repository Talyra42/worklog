import { Icon } from './Icon'
import { useToast, type ToastTone } from '../store/useToast'
import styles from './ToastHost.module.scss'

const ICONS: Record<ToastTone, 'check' | 'alert' | 'clock'> = {
  success: 'check',
  danger: 'alert',
  default: 'clock',
}

export function ToastHost() {
  const toasts = useToast((state) => state.toasts)
  const dismiss = useToast((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className={styles.host} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`${styles.toast} ${styles[toast.tone]}`}
          onClick={() => dismiss(toast.id)}
        >
          <Icon name={ICONS[toast.tone]} size={16} />
          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  )
}
