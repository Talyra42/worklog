import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { errorCode, errorMessage } from '../lib/cloud'

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'unconfigured'
export type SignUpResult = 'signedIn' | 'confirmEmail' | 'error'

interface AuthState {
  status: AuthStatus
  user: User | null
  busy: boolean
  error: string | null
  notice: string | null

  /** Subscribe to Supabase auth. Returns the cleanup function. */
  init: () => () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  clearFeedback: () => void
}

function authMessage(error: unknown): string {
  const code = errorCode(error)
  const message = errorMessage(error).toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return '邮箱或密码不正确'
  }
  if (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed') ||
    message.includes('email not verified')
  ) {
    return '邮箱还没完成验证，请先点开验证邮件里的链接'
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return '这个邮箱已经注册过了，请直接登录'
  }
  if (code === 'weak_password' || message.includes('password should be at least')) {
    return '密码至少需要 6 位'
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return '操作太频繁了，请稍后再试'
  }
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return '当前项目已关闭邮箱注册，请在 Supabase 里开启'
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return '网络连接失败，请检查网络后重试'
  }
  return '操作失败，请稍后再试'
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  user: null,
  busy: false,
  error: null,
  notice: null,

  init: () => {
    if (!isSupabaseConfigured) {
      set({ status: 'unconfigured' })
      return () => {}
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        status: session ? 'signedIn' : 'signedOut',
      })
    })

    void supabase.auth
      .getSession()
      .then(({ data: result, error }) => {
        if (error) {
          set({ status: 'signedOut', error: authMessage(error) })
          return
        }
        set({
          user: result.session?.user ?? null,
          status: result.session ? 'signedIn' : 'signedOut',
        })
      })
      .catch((error: unknown) => {
        set({ status: 'signedOut', error: authMessage(error) })
      })

    return () => data.subscription.unsubscribe()
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) return false
    set({ busy: true, error: null, notice: null })
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        set({ busy: false, error: authMessage(error) })
        return false
      }
      set({ busy: false })
      return true
    } catch (error) {
      set({ busy: false, error: authMessage(error) })
      return false
    }
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured) return 'error'
    set({ busy: true, error: null, notice: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) {
        set({ busy: false, error: authMessage(error) })
        return 'error'
      }
      if (data.session) {
        set({ busy: false })
        return 'signedIn'
      }
      set({
        busy: false,
        notice:
          '验证邮件已发送。点开邮件里的链接后就会自动登录；如果没有收到，请确认邮箱是否已注册过。',
      })
      return 'confirmEmail'
    } catch (error) {
      set({ busy: false, error: authMessage(error) })
      return 'error'
    }
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return
    set({ busy: true })
    try {
      const { error } = await supabase.auth.signOut()
      // Offline / unreachable server: still clear the local session so the
      // next reload does not silently sign the user back in.
      if (error) await supabase.auth.signOut({ scope: 'local' })
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    } finally {
      set({ status: 'signedOut', user: null, busy: false, error: null, notice: null })
    }
  },

  clearFeedback: () => {
    if (get().error || get().notice) set({ error: null, notice: null })
  },
}))
