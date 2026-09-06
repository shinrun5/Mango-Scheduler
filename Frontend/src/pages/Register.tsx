import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout, Field } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { homePathForRole, useAuth } from '../lib/auth'

export function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()

  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to={homePathForRole(user.role)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const u = await register(email.trim(), password, inviteCode.trim())
      navigate(homePathForRole(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Set up your account"
      subtitle="Use the invite code your manager gave you"
      footer={
        <>
          Already set up?{' '}
          <Link to="/login" className="font-bold text-ink underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <Field
          label="Invite code"
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="mb-3 font-body text-xs font-bold text-coral-dark">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full justify-center">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
