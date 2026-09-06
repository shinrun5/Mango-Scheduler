import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { getSession } from './session'
import type { AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  /** true until the initial /auth/me hydration settles */
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (email: string, password: string, inviteCode: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // hydrate from a stored token on first load
  useEffect(() => {
    if (!getSession()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // api.ts fires this when a request 401s and the refresh also failed
  useEffect(() => {
    const drop = () => setUser(null)
    window.addEventListener('auth:expired', drop)
    return () => window.removeEventListener('auth:expired', drop)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const u = await api.login(email, password)
        setUser(u)
        return u
      },
      register: async (email, password, inviteCode) => {
        const u = await api.register(email, password, inviteCode)
        setUser(u)
        return u
      },
      logout: async () => {
        await api.logout()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** Where a logged-in user of this role belongs by default. */
export function homePathForRole(role: AuthUser['role']): string {
  return role === 'MANAGER' ? '/schedule' : '/my-shifts'
}
