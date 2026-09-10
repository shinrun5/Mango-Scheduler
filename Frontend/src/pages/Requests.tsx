import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, relativeTime, timeRange } from '../lib/time'
import type { ChangeRequest, Store, TimeOffRequest } from '../types'

const STATUS_STYLE: Record<ChangeRequest['status'], string> = {
  PENDING: 'border-orange bg-orange/10 text-ink',
  APPROVED: 'border-green bg-green/10 text-green',
  DENIED: 'border-coral bg-coral-bg text-coral-dark',
  CANCELLED: 'border-ink/25 text-muted-ink',
}

const prettyDate = (s: string) =>
  new Date(`${s}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

export function Requests() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [toBusy, setToBusy] = useState<number | null>(null)

  function refresh() {
    return Promise.all([api.getChangeRequests(), api.getStores(), api.getTimeOff()])
      .then(([r, s, t]) => {
        setRequests(r)
        setStores(s)
        setTimeOff(t)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load requests'))
  }

  async function ackTimeOff(id: number) {
    setToBusy(id)
    setError(null)
    try {
      await api.ackTimeOff(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update')
    } finally {
      setToBusy(null)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`

  async function resolve(id: number, approve: boolean) {
    setBusy(id)
    setError(null)
    try {
      await (approve ? api.approveChangeRequest(id) : api.denyChangeRequest(id))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve the request')
    } finally {
      setBusy(null)
    }
  }

  // marketplace posts nobody has claimed yet — shown in their own section
  const marketplace = requests.filter(
    (r) => r.openOffer && r.status === 'PENDING' && !r.targetEmployee,
  )

  const sorted = [...requests]
    .filter((r) => !(r.openOffer && r.status === 'PENDING' && !r.targetEmployee))
    .sort((a, b) => (a.status === 'PENDING' ? 0 : 1) - (b.status === 'PENDING' ? 0 : 1) || b.id - a.id)

  const shiftWhen = (r: ChangeRequest) => {
    const hrs =
      r.handoffStart && r.handoffEnd
        ? `${timeRange(r.handoffStart, r.handoffEnd)} (part of a shift)`
        : timeRange(r.shift.start, r.shift.end)
    return `${DAY_LABEL[r.shift.day]} · ${hrs} · ${storeName(r.shift.storeId)}`
  }

  const timeOffSorted = [...timeOff].sort(
    (a, b) =>
      Number(a.acknowledged) - Number(b.acknowledged) || a.startDate.localeCompare(b.startDate),
  )

  function sentence(r: ChangeRequest) {
    const who = r.requestedBy.name
    if (r.type === 'DROP') return `${who} wants to drop`
    if (r.type === 'PICKUP') return `${who} wants to pick up`
    if (r.openOffer) return `${r.targetEmployee?.name ?? '—'} claimed ${who}'s shift`
    return `${who} wants to give this to ${r.targetEmployee?.name ?? '—'}`
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
      <h1 className="font-heading text-lg font-bold text-ink">Requests</h1>
      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {!loading && marketplace.length > 0 && (
        <>
          <h2 className="mt-4 font-heading text-sm font-bold text-ink">
            On the marketplace{' '}
            <span className="font-body text-xs font-semibold text-muted-ink">
              — waiting for a coworker to claim
            </span>
          </h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {marketplace.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-sm font-bold text-ink">
                    {r.requestedBy.name} put a shift up for grabs
                  </span>
                  <span className="ml-auto font-body text-[10px] text-muted-ink">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 font-body text-xs text-muted-ink">{shiftWhen(r)}</p>
                {r.note && <p className="mt-1 font-body text-xs italic text-ink">“{r.note}”</p>}
                <div className="mt-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, false)}
                    className="rounded-full border-2 border-coral px-3 py-0.5 font-heading text-[11px] font-bold text-coral-dark disabled:opacity-50"
                  >
                    Take it down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && timeOffSorted.length > 0 && (
        <>
          <h2 className="mt-4 font-heading text-sm font-bold text-ink">
            Time off <span className="font-body text-xs font-semibold text-muted-ink">— heads-up only</span>
          </h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {timeOffSorted.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl border-[2.5px] bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)] ${
                  t.acknowledged ? 'border-ink/30' : 'border-ink'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-sm font-bold text-ink">
                    {t.employeeName ?? `#${t.employeeId}`} — {prettyDate(t.startDate)} to {prettyDate(t.endDate)}
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-px font-body text-[10px] font-bold ${
                      t.state === 'active'
                        ? 'border-green bg-green/10 text-green-dark'
                        : 'border-sky bg-sky/10 text-sky-dark'
                    }`}
                  >
                    {t.state === 'active' ? 'away now' : 'upcoming'}
                  </span>
                  <span className="ml-auto font-body text-[10px] text-muted-ink">
                    {relativeTime(t.createdAt)}
                  </span>
                </div>
                {t.note && <p className="mt-1 font-body text-xs italic text-ink">“{t.note}”</p>}
                <div className="mt-2">
                  {t.acknowledged ? (
                    <span className="font-body text-[11px] font-bold text-muted-ink">seen ✓</span>
                  ) : (
                    <button
                      disabled={toBusy === t.id}
                      onClick={() => void ackTimeOff(t.id)}
                      className="rounded-full border-2 border-ink bg-cream px-3 py-0.5 font-heading text-[11px] font-bold text-ink disabled:opacity-50"
                    >
                      Got it
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <h2 className="mt-6 font-heading text-sm font-bold text-ink">Shift changes</h2>
        </>
      )}

      {loading ? (
        <p className="mt-3 font-body text-sm text-muted-ink">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="mt-3 font-body text-sm text-muted-ink">No shift-change requests.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          {sorted.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-sm font-bold text-ink">{sentence(r)}</span>
                <span
                  className={`rounded-full border px-1.5 py-px font-body text-[10px] font-bold ${STATUS_STYLE[r.status]}`}
                >
                  {r.status.toLowerCase()}
                </span>
                <span className="ml-auto font-body text-[10px] text-muted-ink">
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 font-body text-xs text-muted-ink">
                {DAY_LABEL[r.shift.day]} ·{' '}
                {r.handoffStart && r.handoffEnd ? (
                  <>
                    {timeRange(r.handoffStart, r.handoffEnd)}{' '}
                    <span className="text-sky-dark">(part of {timeRange(r.shift.start, r.shift.end)})</span>
                  </>
                ) : (
                  timeRange(r.shift.start, r.shift.end)
                )}{' '}
                · {storeName(r.shift.storeId)}
              </p>
              {r.note && <p className="mt-1 font-body text-xs italic text-ink">“{r.note}”</p>}

              {r.status === 'PENDING' && (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, true)}
                    className="rounded-full border-2 border-ink bg-green px-3 py-0.5 font-heading text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, false)}
                    className="rounded-full border-2 border-coral px-3 py-0.5 font-heading text-[11px] font-bold text-coral-dark disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
