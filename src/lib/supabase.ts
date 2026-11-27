import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase's new dashboard calls this the "publishable key"; the legacy name
// is "anon key". Accept either environment variable name.
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)

/**
 * `false` when `.env.local` has not been filled in yet. The app shows a setup
 * screen instead of trying to talk to a placeholder project.
 */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon'),
)

// Keep a valid-looking client even when unconfigured so imports stay simple;
// no request is ever made while `isSupabaseConfigured` is false.
export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? (anonKey as string) : 'placeholder-anon-key',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  },
)
