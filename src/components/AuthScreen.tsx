import { useState, type FormEvent } from 'react'
import { BrandMark } from './BrandMark'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useAuth } from '../store/useAuth'
import styles from './AuthScreen.module.scss'

type Mode = 'signIn' | 'signUp'

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
          <BrandMark size={36} className={styles.brandMark} />
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
          <p className={styles.lede}>登录一次，换电脑、换手机，打开就能接着计时。</p>
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.heading}>
              <h2>{mode === 'signIn' ? '登录' : '创建账号'}</h2>
              <p>
                {mode === 'signIn' ? '继续记录今天的工时。' : '只需要邮箱和密码，没有多余的步骤。'}
              </p>
            </div>
            <ThemeSwitcher compact />
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
        </div>
      </section>
    </main>
  )
}
