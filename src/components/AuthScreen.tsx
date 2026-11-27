import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import { useAuth } from '../store/useAuth'
import { useWorklog } from '../store/useWorklog'
import styles from './AuthScreen.module.scss'

type Mode = 'signIn' | 'signUp'

const BENEFITS = [
  { title: '云端是唯一数据源', text: '记录不再散落在某台电脑的浏览器里' },
  { title: '多设备接着用', text: '换电脑或手机，登录同一个账号即可' },
  { title: '只有你能看到', text: 'Supabase 行级权限，每个账号互相隔离' },
]

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const busy = useAuth((state) => state.busy)
  const error = useAuth((state) => state.error)
  const notice = useAuth((state) => state.notice)
  const signIn = useAuth((state) => state.signIn)
  const signUp = useAuth((state) => state.signUp)
  const clearFeedback = useAuth((state) => state.clearFeedback)

  const theme = useWorklog((state) => state.theme)
  const toggleTheme = useWorklog((state) => state.toggleTheme)

  const switchMode = (next: Mode) => {
    setMode(next)
    setLocalError(null)
    clearFeedback()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    clearFeedback()

    const address = email.trim()
    if (!address || !address.includes('@')) {
      setLocalError('请输入有效的邮箱地址')
      return
    }
    if (password.length < 6) {
      setLocalError('密码至少需要 6 位')
      return
    }

    if (mode === 'signIn') {
      await signIn(address, password)
      return
    }

    const result = await signUp(address, password)
    if (result === 'confirmEmail') setMode('signIn')
  }

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <header className={styles.brand}>
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
              <path
                d="M12 12l3.1 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.brandText}>
            <strong>Worklog</strong>
            <span>工时记录</span>
          </span>
        </header>

        <div className={styles.storyBody}>
          <p className={styles.eyebrow}>CLOUD WORKLOG</p>
          <h1>
            你的工时，
            <br />
            跟着你走。
          </h1>
          <p className={styles.lede}>
            登录一次，记录就存在云端。换电脑、换手机，打开就能接着计时。
          </p>

          <ul className={styles.benefits}>
            {BENEFITS.map((item) => (
              <li key={item.title}>
                <span className={styles.benefitIcon} aria-hidden="true">
                  <Icon name="check" size={13} />
                </span>
                <span className={styles.benefitText}>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.storyFoot}>Supabase · Postgres · Row Level Security</p>
      </section>

      <section className={styles.formSide}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15} />
        </button>

        <div className={styles.card}>
          <div className={styles.heading}>
            <h2>{mode === 'signIn' ? '登录' : '创建账号'}</h2>
            <p>
              {mode === 'signIn' ? '继续记录今天的工时。' : '只需要邮箱和密码，没有多余的步骤。'}
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>邮箱</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>密码</span>
              <input
                type="password"
                name="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                placeholder="至少 6 位"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {localError || error ? (
              <p className={styles.error} role="alert">
                {localError ?? error}
              </p>
            ) : null}

            {notice ? (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            ) : null}

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? '请稍候…' : mode === 'signIn' ? '登录' : '创建账号'}
            </button>
          </form>

          <p className={styles.switch}>
            {mode === 'signIn' ? '还没有账号？' : '已经有账号？'}
            <button
              type="button"
              onClick={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            >
              {mode === 'signIn' ? '创建一个' : '去登录'}
            </button>
          </p>

          <p className={styles.privacy}>
            <Icon name="cloud" size={13} />
            数据存放在你自己的 Supabase 项目
          </p>
        </div>
      </section>
    </main>
  )
}
