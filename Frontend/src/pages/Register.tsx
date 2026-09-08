import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout, Field } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { useAuth } from '../lib/auth'
import { homePathForRole } from '../lib/roles'

export function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()

  const [inviteCode, setInviteCode] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
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
    if (pin && !/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const u = await register({
        email: email.trim(),
        password,
        inviteCode: inviteCode.trim(),
        name: name.trim(),
        phone: phone.trim(),
        pin: pin.trim(),
      })
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
        <Field label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Phone number"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label="Clock-in PIN (4 digits)"
          inputMode="numeric"
          maxLength={4}
          placeholder="optional — your manager set one already"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
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
