import type { Session } from '../types'

// Where the token pair lives between page loads. localStorage is the pragmatic
// choice for now (a résumé-scope tradeoff); httpOnly cookies set by our own
// /auth endpoints are the planned hardening pass.

const KEY = 'fruitcrew.session'

let current: Session | null = read()

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function getSession(): Session | null {
  return current
}

export function setSession(session: Session | null) {
  current = session
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    // private mode / storage disabled -- in-memory `current` still works for the tab
  }
}
