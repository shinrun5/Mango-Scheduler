import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { FruitPicker } from '../components/FruitPicker'
import { StarBadgeIcon } from '../components/icons'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Profile as ProfileData } from '../types'

const card = 'mt-4 rounded-2xl border-[2.5px] border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]'
const field =
  'w-full rounded-xl border-[2.5px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink outline-none focus:bg-paper'

export function Profile() {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    () =>
      api
        .getProfile()
        .then(setProfile)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your profile')),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])

  if (error && !profile) return <div className="p-6 font-body text-sm text-coral-dark">{error}</div>
  if (!profile) return <div className="p-6 font-body text-sm text-muted-ink">Loading…</div>

  const e = profile.employee
  const displayName = profile.name ?? e?.name ?? profile.email

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
      <h1 className="font-heading text-lg font-bold text-ink">Profile</h1>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-extrabold text-ink">{displayName}</span>
          <span className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-body text-[10px] font-bold text-ink">
            {profile.role.toLowerCase()}
          </span>
          {e?.standby && (
            <span className="rounded-full border border-ink/25 px-1.5 py-px font-body text-[9px] font-bold text-muted-ink">
              on-call
            </span>
          )}
        </div>
        <p className="mt-0.5 font-body text-xs text-muted-ink">{profile.email}</p>
        {profile.phone && <p className="font-body text-xs text-muted-ink">{profile.phone}</p>}

        {e ? (
          <>
            <p className="mt-3 font-body text-[11px] font-bold uppercase tracking-wide text-muted-ink">
              Works at
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {e.stores.length === 0 && (
                <span className="font-body text-xs text-coral-dark">no store assigned yet</span>
              )}
              {e.stores.map((s) => (
                <span
                  key={s.storeId}
                  className="flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-body text-[11px] font-bold text-ink"
                >
                  {s.storeName} · {s.proficiency}
                  {s.canOpen && <StarBadgeIcon size={11} />}
                  <span className="font-body font-semibold text-muted-ink">· PIN {s.pin}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 font-body text-xs text-muted-ink">
              Up to <b className="text-ink">{e.maxShifts}</b> days/week ·{' '}
              <b className="text-ink">{e.hourLimit}h</b> weekly cap
            </p>
          </>
        ) : (
          <p className="mt-3 font-body text-xs text-muted-ink">
            {profile.role === 'EMPLOYEE'
              ? "Your account isn't linked to an employee record yet — ask your manager."
              : 'Add yourself to the schedule from "My hours" to pick up shifts.'}
          </p>
        )}
      </div>

      <EditDetails
        name={profile.name ?? e?.name ?? ''}
        phone={profile.phone ?? ''}
        onSaved={async () => {
          await load()
          await refreshUser()
        }}
        onError={setError}
      />

      {e && (
        <div className={card}>
          <FruitPicker />
        </div>
      )}

      <ChangePassword onError={setError} />
    </div>
  )
}

function EditDetails({
  name,
  phone,
  onSaved,
  onError,
}: {
  name: string
  phone: string
  onSaved: () => void | Promise<void>
  onError: (m: string | null) => void
}) {
  const [n, setN] = useState(name)
  const [p, setP] = useState(phone)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const dirty = n.trim() !== name || p.trim() !== phone

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    onError(null)
    setDone(false)
    if (!n.trim()) return onError('Name cannot be empty')
    setBusy(true)
    try {
      await api.updateProfile({ name: n.trim(), phone: p.trim() })
      setDone(true)
      await onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save your details')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={card}>
      <h2 className="font-heading text-sm font-bold text-ink">Your details</h2>
      <div className="mt-2 flex flex-col gap-2">
        <label className="block">
          <span className="mb-1 block font-body text-xs font-bold text-muted-ink">Name</span>
          <input value={n} onChange={(ev) => setN(ev.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block font-body text-xs font-bold text-muted-ink">Phone number</span>
          <input
            type="tel"
            autoComplete="tel"
            value={p}
            onChange={(ev) => setP(ev.target.value)}
            className={field}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {done && !dirty && <span className="font-body text-xs font-bold text-green">Saved ✓</span>}
      </div>
    </form>
  )
}

function ChangePassword({ onError }: { onError: (m: string | null) => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    onError(null)
    setDone(false)
    if (next.length < 8) return onError('New password must be at least 8 characters')
    if (next !== confirm) return onError("New passwords don't match")
    setBusy(true)
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not change your password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={card}>
      <h2 className="font-heading text-sm font-bold text-ink">Change password</h2>
      <div className="mt-2 flex flex-col gap-2">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={field}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={field}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </Button>
        {done && <span className="font-body text-xs font-bold text-green">Password updated ✓</span>}
      </div>
    </form>
  )
}
