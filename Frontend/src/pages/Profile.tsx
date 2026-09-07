import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { StarBadgeIcon } from '../components/icons'
import { api } from '../lib/api'
import type { Profile as ProfileData } from '../types'

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your profile'))
  }, [])

  if (error) return <div className="p-6 font-body text-sm text-coral-dark">{error}</div>
  if (!profile) return <div className="p-6 font-body text-sm text-muted-ink">Loading…</div>

  const e = profile.employee

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
      <h1 className="font-heading text-lg font-bold text-ink">Profile</h1>

      <div className="mt-4 rounded-2xl border-[2.5px] border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]">
        <div className="flex items-center gap-2">
          <span className="font-heading text-base font-extrabold text-ink">{e?.name ?? profile.email}</span>
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
                </span>
              ))}
            </div>
            <p className="mt-3 font-body text-xs text-muted-ink">
              Up to <b className="text-ink">{e.maxShifts}</b> days/week ·{' '}
              <b className="text-ink">{e.hourLimit}h</b> weekly cap
            </p>
          </>
        ) : (
          <p className="mt-3 font-body text-xs text-coral-dark">
            Your account isn't linked to an employee record yet — ask your manager.
          </p>
        )}
      </div>

      <ChangePassword onError={setError} />
    </div>
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

  const field =
    'w-full rounded-xl border-[2.5px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink outline-none focus:bg-paper'

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-2xl border-[2.5px] border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]"
    >
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
