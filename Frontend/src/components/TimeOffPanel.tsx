import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './Button'
import { api } from '../lib/api'
import type { TimeOffRequest, TimeOffState } from '../types'

const BADGE: Record<TimeOffState, { label: string; cls: string }> = {
  upcoming: { label: 'upcoming', cls: 'border-sky bg-sky/10 text-sky-dark' },
  active: { label: 'away now', cls: 'border-green bg-green/10 text-green-dark' },
  past: { label: 'past', cls: 'border-ink/25 text-muted-ink' },
  cancelled: { label: 'withdrawn', cls: 'border-ink/25 text-muted-ink' },
}

const DAY_MS = 86_400_000
const ymd = (d: Date) => d.toISOString().slice(0, 10)
/** "Sep 15" from "YYYY-MM-DD" */
function pretty(s: string) {
  const d = new Date(`${s}T00:00:00.000Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
function spanDays(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) + 1
}

/** Employee: file and track vacation / leave requests (>= 1 week, >= 1 week ahead). */
export function TimeOffPanel() {
  const [rows, setRows] = useState<TimeOffRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | 'new' | null>(null)

  const [minStart] = useState(() => ymd(new Date(Date.now() + 7 * DAY_MS)))

  function refresh() {
    return api
      .getMyTimeOff()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load time off'))
  }
  useEffect(() => {
    void refresh()
  }, [])

  async function withdraw(id: number) {
    setBusy(id)
    setError(null)
    try {
      await api.cancelTimeOff(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw')
    } finally {
      setBusy(null)
    }
  }

  if (!rows) return <p className="font-body text-sm text-muted-ink">Loading…</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-xs text-muted-ink">
        Heads-up for a vacation or long break — a week or more, at least a week's notice. This
        takes you off the schedule for those days automatically and lets your manager know.
      </p>
      {error && <p className="font-body text-xs font-bold text-coral-dark">{error}</p>}

      <NewRequest
        minStart={minStart}
        busy={busy === 'new'}
        onSubmit={async (input) => {
          setBusy('new')
          setError(null)
          try {
            await api.requestTimeOff(input)
            await refresh()
            return true
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save')
            return false
          } finally {
            setBusy(null)
          }
        }}
      />

      {rows.length === 0 ? (
        <p className="font-body text-sm text-muted-ink">Nothing booked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const canCancel = r.state === 'upcoming'
            return (
              <div
                key={r.id}
                className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm font-bold text-ink">
                    {pretty(r.startDate)} – {pretty(r.endDate)}
                  </span>
                  <span className="font-body text-[11px] text-muted-ink">
                    {spanDays(r.startDate, r.endDate)} days
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-px font-body text-[10px] font-bold ${BADGE[r.state].cls}`}
                  >
                    {BADGE[r.state].label}
                  </span>
                  {canCancel && (
                    <button
                      disabled={busy === r.id}
                      onClick={() => void withdraw(r.id)}
                      className="ml-auto font-body text-[11px] font-bold text-muted-ink underline"
                    >
                      withdraw
                    </button>
                  )}
                </div>
                {r.note && <p className="mt-1 font-body text-xs italic text-ink">“{r.note}”</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewRequest({
  minStart,
  busy,
  onSubmit,
}: {
  minStart: string
  busy: boolean
  onSubmit: (input: { startDate: string; endDate: string; note?: string }) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const field =
    'w-full rounded-xl border-[2.5px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink outline-none'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLocalErr(null)
    if (!start || !end) return setLocalErr('Pick both dates')
    if (end < start) return setLocalErr('End date is before the start')
    if (spanDays(start, end) < 7) return setLocalErr('Has to be at least a week')
    if (start < minStart) return setLocalErr('Start at least a week from now')
    const ok = await onSubmit({ startDate: start, endDate: end, note: note.trim() || undefined })
    if (ok) {
      setStart('')
      setEnd('')
      setNote('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-full border-2 border-ink bg-cream px-3 py-1 font-heading text-xs font-bold text-ink"
      >
        + Add time off
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
    >
      <label className="block">
        <span className="mb-1 block font-body text-xs font-bold text-muted-ink">First day off</span>
        <input type="date" min={minStart} value={start} onChange={(e) => setStart(e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block font-body text-xs font-bold text-muted-ink">Last day off</span>
        <input type="date" min={start || minStart} value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
      </label>
      <input
        placeholder="Reason (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={field}
      />
      {localErr && <p className="font-body text-xs font-bold text-coral-dark">{localErr}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Post it'}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-body text-xs font-bold text-muted-ink underline"
        >
          cancel
        </button>
      </div>
    </form>
  )
}
