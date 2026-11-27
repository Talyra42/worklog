import { Icon } from './Icon'
import styles from './CloudStatusScreen.module.scss'

interface CloudStatusScreenProps {
  tone: 'loading' | 'error' | 'config'
  title: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  onSignOut?: () => void
}

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="7.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeOpacity="0.5"
          />
          <path d="M12 12V7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 12l3.1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className={styles.brandText}>
        <strong>Worklog</strong>
        <span>工时记录</span>
      </span>
    </div>
  )
}

export function CloudStatusScreen({
  tone,
  title,
  message,
  onRetry,
  retryLabel = '重试',
  onSignOut,
}: CloudStatusScreenProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <Brand />

        {tone === 'loading' ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          <span className={styles.iconWrap} aria-hidden="true">
            <Icon name={tone === 'error' ? 'alert' : 'cloud'} size={22} />
          </span>
        )}

        <h1 className={styles.title}>{title}</h1>
        {message ? <p className={styles.message}>{message}</p> : null}

        {tone === 'config' ? (
          <div className={styles.steps}>
            <ol>
              <li>
                在 Supabase 的 <strong>SQL Editor</strong> 里执行
                <code>supabase/migrations/0001_worklog_cloud.sql</code>。
              </li>
              <li>
                把 <code>.env.example</code> 复制为 <code>.env.local</code>，填入
                <code>VITE_SUPABASE_URL</code> 和 <code>VITE_SUPABASE_ANON_KEY</code>
                （或 <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>）。
              </li>
              <li>
                重启 <code>pnpm dev</code>，然后刷新这个页面。
              </li>
            </ol>
            <p className={styles.hint}>
              详细步骤见 <code>docs/supabase-setup.md</code>。只需要 anon key，不要把 service_role
              key 放进前端。
            </p>
          </div>
        ) : null}

        {onRetry || onSignOut ? (
          <div className={styles.actions}>
            {onRetry ? (
              <button type="button" className={styles.primary} onClick={onRetry}>
                {retryLabel}
              </button>
            ) : null}
            {onSignOut ? (
              <button type="button" className={styles.ghost} onClick={onSignOut}>
                退出登录
              </button>
            ) : null}
          </div>
        ) : null}

        <p className={styles.footer}>
          {tone === 'error'
            ? '记录仍在云端，不会因为这次失败丢失。'
            : '数据只存放在你的 Supabase 项目里。'}
        </p>
      </section>
    </main>
  )
}
