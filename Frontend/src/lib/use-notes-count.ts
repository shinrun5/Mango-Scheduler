import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './api'

const POLL_MS = 25000

/** Total open shift notes across the caller's stores. Polls slowly and re-checks
 * on tab focus / route change (so it drops after you clear notes). */
export function useNotesCount(): number {
  const [total, setTotal] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    let live = true
    const check = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await api.getNoteCounts()
        if (live) setTotal(r.total)
      } catch {
        /* keep last known */
      }
    }
    void check()
    const h = setInterval(check, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      live = false
      clearInterval(h)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [pathname])

  return total
}
