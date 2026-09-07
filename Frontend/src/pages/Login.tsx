import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Field } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { useAuth } from '../lib/auth'
import { homePathForRole } from '../lib/roles'

export function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to={homePathForRole(user.role)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await login(email.trim(), password)
      navigate(location.state?.from?.pathname ?? homePathForRole(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Fruit Crew"
      subtitle="Sign in to your schedule"
      footer={
        <div className="flex flex-col gap-1">
          <span>
            Got an invite code?{' '}
            <Link to="/register" className="font-bold text-ink underline">
              Set up your account
            </Link>
          </span>
          <span>
            New company?{' '}
            <Link to="/setup" className="font-bold text-ink underline">
              Create the owner account
            </Link>
          </span>
        </div>
      }
    >
      <form onSubmit={onSubmit}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="mb-3 font-body text-xs font-bold text-coral-dark">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full justify-center">
          {busy ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
