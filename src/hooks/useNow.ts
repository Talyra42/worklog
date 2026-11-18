import { useEffect, useState } from 'react'

/**
 * Re-renders on an interval and returns `Date.now()`. Pass a slower interval
 * when nothing is ticking to keep the page calm.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
