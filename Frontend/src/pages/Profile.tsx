import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { FruitPicker } from '../components/FruitPicker'
import { StarBadgeIcon } from '../components/icons'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { DayOfWeek, Profile as ProfileData } from '../types'

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
  { key: 'SUNDAY', label: 'Sun' },
]
const dayLabel = (d: DayOfWeek) => DAYS.find((x) => x.key === d)?.label ?? d

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

      <AlertPrefs
        isManager={profile.role !== 'EMPLOYEE'}
        alerts={profile.alerts}
        onSaved={load}
        onError={setError}
      />

      {e && (
        <>
          <MyLimits
            hourLimit={e.hourLimit}
            maxShifts={e.maxShifts}
            onSaved={load}
            onError={setError}
          />
          <DayPrefs
            groups={e.eitherOrDays}
            noConsecutive={e.noConsecutiveDays}
            onSaved={load}
            onError={setError}
          />
          <div className={card}>
            <FruitPicker />
          </div>
        </>
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

function MyLimits({
  hourLimit,
  maxShifts,
  onSaved,
  onError,
}: {
  hourLimit: number
  maxShifts: number
  onSaved: () => void | Promise<void>
  onError: (m: string | null) => void
}) {
  const [h, setH] = useState(String(hourLimit))
  const [d, setD] = useState(String(maxShifts))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const dirty = h !== String(hourLimit) || d !== String(maxShifts)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    onError(null)
    setDone(false)
    const hn = Math.round(Number(h))
    const dn = Math.round(Number(d))
    if (!Number.isFinite(hn) || hn < 1 || hn > 80) return onError('Max hours must be between 1 and 80')
    if (!Number.isFinite(dn) || dn < 1 || dn > 7) return onError('Max days must be between 1 and 7')
    setBusy(true)
    try {
      await api.updateMyLimits({ hourLimit: hn, maxShifts: dn })
      setDone(true)
      await onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save your limits')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={card}>
      <h2 className="font-heading text-sm font-bold text-ink">Your weekly limits</h2>
      <p className="mt-0.5 font-body text-xs text-muted-ink">
        The scheduler never books you past these.
      </p>
      <div className="mt-2 flex gap-2">
        <label className="block flex-1">
          <span className="mb-1 block font-body text-xs font-bold text-muted-ink">Max days / week</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            value={d}
            onChange={(ev) => setD(ev.target.value)}
            className={field}
          />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block font-body text-xs font-bold text-muted-ink">Max hours / week</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={h}
            onChange={(ev) => setH(ev.target.value)}
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

function DayPrefs({
  groups,
  noConsecutive,
  onSaved,
  onError,
}: {
  groups: DayOfWeek[][]
  noConsecutive: boolean
  onSaved: () => void | Promise<void>
  onError: (m: string | null) => void
}) {
  const [draft, setDraft] = useState<DayOfWeek[]>([])
  const [busy, setBusy] = useState(false)
  const [ncBusy, setNcBusy] = useState(false)

  const toggle = (day: DayOfWeek) =>
    setDraft((cur) => (cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day]))

  async function save(next: DayOfWeek[][]) {
    onError(null)
    setBusy(true)
    try {
      await api.setMyEitherOr(next)
      setDraft([])
      await onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save your day preference')
    } finally {
      setBusy(false)
    }
  }

  async function toggleNoConsecutive() {
    onError(null)
    setNcBusy(true)
    try {
      await api.setMyNoConsecutive(!noConsecutive)
      await onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save your day preference')
    } finally {
      setNcBusy(false)
    }
  }

  const addGroup = () => {
    if (draft.length < 2) return onError('Pick at least two days for a group')
    if (groups.length >= 5) return onError('That is the most groups you can have')
    void save([...groups, draft])
  }
  const removeGroup = (i: number) => void save(groups.filter((_, idx) => idx !== i))

  return (
    <div className={card}>
      <h2 className="font-heading text-sm font-bold text-ink">Day preferences</h2>

      <button
        type="button"
        onClick={() => void toggleNoConsecutive()}
        disabled={ncBusy}
        className="mt-2 flex w-full items-center gap-2.5 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-left disabled:opacity-60"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-ink font-heading text-xs font-bold ${
            noConsecutive ? 'bg-ink text-paper' : 'bg-paper text-transparent'
          }`}
        >
          ✓
        </span>
        <span className="font-body text-xs text-ink">
          <b>No back-to-back days</b> — never schedule me two days in a row
        </span>
      </button>

      <p className="mt-3 font-body text-[11px] font-bold uppercase tracking-wide text-muted-ink">
        One of these days only
      </p>
      <p className="mt-0.5 font-body text-xs text-muted-ink">
        Group days you can only do one of — e.g. Sat <b>or</b> Sun, not both.
      </p>

      {groups.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {groups.map((g, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl border-2 border-ink bg-cream px-2.5 py-1.5"
            >
              <span className="font-body text-xs font-bold text-ink">
                {g.map(dayLabel).join(' or ')}
              </span>
              <button
                type="button"
                onClick={() => removeGroup(i)}
                disabled={busy}
                className="font-body text-xs font-bold text-coral-dark underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DAYS.map((day) => {
          const on = draft.includes(day.key)
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggle(day.key)}
              className={`rounded-full border-2 border-ink px-2.5 py-1 font-body text-xs font-bold ${
                on ? 'bg-ink text-paper' : 'bg-cream text-ink'
              }`}
            >
              {day.label}
            </button>
          )
        })}
      </div>
      <div className="mt-3">
        <Button type="button" onClick={addGroup} disabled={busy || draft.length < 2}>
          {busy ? 'Saving…' : 'Add group'}
        </Button>
      </div>
    </div>
  )
}

function AlertToggle({
  on,
  label,
  busy,
  onClick,
}: {
  on: boolean
  label: ReactNode
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mt-2 flex w-full items-center gap-2.5 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-left disabled:opacity-60"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-ink font-heading text-xs font-bold ${
          on ? 'bg-ink text-paper' : 'bg-paper text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="font-body text-xs text-ink">{label}</span>
    </button>
  )
}

function AlertPrefs({
  isManager,
  alerts,
  onSaved,
  onError,
}: {
  isManager: boolean
  alerts: { availabilityUpdates: boolean; chatMessages: boolean }
  onSaved: () => void | Promise<void>
  onError: (m: string | null) => void
}) {
  const [busy, setBusy] = useState(false)

  async function save(patch: { availabilityUpdates?: boolean; chatMessages?: boolean }) {
    onError(null)
    setBusy(true)
    try {
      await api.setAlerts(patch)
      await onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save your alert settings')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={card}>
      <h2 className="font-heading text-sm font-bold text-ink">Alerts</h2>
      {isManager && (
        <AlertToggle
          on={alerts.availabilityUpdates}
          busy={busy}
          onClick={() => void save({ availabilityUpdates: !alerts.availabilityUpdates })}
          label={
            <>
              <b>Availability updates</b> — email + notify me when a worker changes a future week's
              hours
            </>
          }
        />
      )}
      <AlertToggle
        on={alerts.chatMessages}
        busy={busy}
        onClick={() => void save({ chatMessages: !alerts.chatMessages })}
        label={
          <>
            <b>Chat messages</b> — email me when there are new chat messages I haven't seen (at most
            once every 15 min)
          </>
        }
      />
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
