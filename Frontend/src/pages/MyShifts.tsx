import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, DAYS, dayDate, relativeTime, timeRange } from '../lib/time'
import type { ChangeRequest, MyShiftsResponse, Shift, Store } from '../types'

const STATUS_STYLE: Record<ChangeRequest['status'], string> = {
  PENDING: 'border-orange bg-orange/10 text-ink',
  APPROVED: 'border-green bg-green/10 text-green',
  DENIED: 'border-coral bg-coral-bg text-coral-dark',
  CANCELLED: 'border-ink/25 text-muted-ink',
}

export function MyShifts() {
  const [data, setData] = useState<MyShiftsResponse | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [openShifts, setOpenShifts] = useState<Shift[]>([])
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const refresh = useCallback(
    () =>
      Promise.all([
        api.getMyShifts(),
        api.getStores(),
        api.getOpenShifts().catch(() => [] as Shift[]),
        api.getMyChangeRequests().catch(() => [] as ChangeRequest[]),
      ]).then(([d, s, o, r]) => {
        setData(d)
        setStores(s)
        setOpenShifts(o)
        setRequests(r)
      }),
    [],
  )

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Could not load your shifts'))
  }, [refresh])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`
  const pendingFor = (shiftId: number) =>
    requests.find((r) => r.shift.id === shiftId && r.status === 'PENDING')

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      setExpanded(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  if (error && !data) return <div className="p-8 font-body text-sm text-coral-dark">{error}</div>
  if (!data) return <div className="p-8 font-body text-sm text-muted-ink">Loading…</div>

  if (!data.published) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 p-6 pb-24 sm:pb-6">
        <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
        <p className="mt-2 font-body text-sm text-muted-ink">
          This week's schedule isn't posted yet — check back soon.
        </p>
      </div>
    )
  }

  const byDay = DAYS.map((day) => ({
    day,
    shifts: data.shifts
      .filter((s) => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((d) => d.shifts.length > 0)

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6 pb-24 sm:pb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
        {data.publishedAt && (
          <span className="font-body text-xs text-muted-ink">posted {relativeTime(data.publishedAt)}</span>
        )}
      </div>

      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {byDay.length === 0 ? (
        <p className="mt-2 font-body text-sm text-muted-ink">You're not on the schedule this week.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {byDay.map(({ day, shifts }) => (
            <div
              key={day}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <span className="font-heading text-sm font-bold text-ink">
                {DAY_LABEL[day]}
                {data.weekStart && (
                  <span className="ml-1.5 font-body text-[11px] font-semibold text-muted-ink">
                    {dayDate(data.weekStart, DAYS.indexOf(day))}
                  </span>
                )}
              </span>
              <div className="mt-1.5 flex flex-col gap-2">
                {shifts.map((s) => {
                  const pending = pendingFor(s.id)
                  return (
                    <div key={s.id} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-body text-xs font-bold text-ink">{storeName(s.storeId)}</span>
                        <span className="font-body text-xs text-muted-ink">{timeRange(s.start, s.end)}</span>
                        {pending ? (
                          <span className="ml-auto flex items-center gap-1.5 font-body text-[11px] font-bold text-orange">
                            {pending.openOffer ? 'on the marketplace' : 'change requested'}
                            <button
                              onClick={() => void act(() => api.cancelChangeRequest(pending.id))}
                              className="font-bold text-muted-ink underline"
                            >
                              {pending.openOffer ? 'withdraw' : 'cancel'}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setExpanded((e) => (e === s.id ? null : s.id))}
                            className="ml-auto rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
                          >
                            {expanded === s.id ? 'Close' : 'Request change'}
                          </button>
                        )}
                      </div>
                      {expanded === s.id && !pending && (
                        <RequestPanel
                          shiftId={s.id}
                          onDrop={(note) => act(() => api.createChangeRequest({ type: 'DROP', shiftId: s.id, note }))}
                          onOffer={(note) =>
                            act(() => api.createChangeRequest({ type: 'SWAP', shiftId: s.id, note }))
                          }
                          onSwap={(targetEmployeeId, note) =>
                            act(() =>
                              api.createChangeRequest({ type: 'SWAP', shiftId: s.id, targetEmployeeId, note }),
                            )
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {openShifts.length > 0 && (
        <>
          <h2 className="mt-6 font-heading text-sm font-bold text-ink">Open shifts you can pick up</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {openShifts.map((s) => {
              const pending = pendingFor(s.id)
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-paper px-3 py-2"
                >
                  <span className="font-body text-xs font-bold text-ink">{DAY_LABEL[s.day]}</span>
                  <span className="font-body text-xs text-muted-ink">
                    {storeName(s.storeId)} · {timeRange(s.start, s.end)}
                  </span>
                  {pending ? (
                    <span className="ml-auto flex items-center gap-1.5 font-body text-[11px] font-bold text-orange">
                      requested
                      <button
                        onClick={() => void act(() => api.cancelChangeRequest(pending.id))}
                        className="font-bold text-muted-ink underline"
                      >
                        cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => void act(() => api.createChangeRequest({ type: 'PICKUP', shiftId: s.id }))}
                      className="ml-auto rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-heading text-[11px] font-bold text-white"
                    >
                      Pick up
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {requests.length > 0 && (
        <>
          <h2 className="mt-6 font-heading text-sm font-bold text-ink">My requests</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 font-body text-xs">
                <span className="font-bold text-ink">
                  {r.type === 'DROP'
                    ? 'Drop'
                    : r.type === 'PICKUP'
                      ? 'Pick up'
                      : `Give to ${r.targetEmployee?.name ?? '—'}`}
                </span>
                <span className="text-muted-ink">
                  {DAY_LABEL[r.shift.day]} {timeRange(r.shift.start, r.shift.end)} at {storeName(r.shift.storeId)}
                </span>
                <span
                  className={`rounded-full border px-1.5 py-px text-[10px] font-bold ${STATUS_STYLE[r.status]}`}
                >
                  {r.status.toLowerCase()}
                </span>
                {r.status === 'PENDING' && (
                  <button
                    onClick={() => void act(() => api.cancelChangeRequest(r.id))}
                    className="font-bold text-muted-ink underline"
                  >
                    cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RequestPanel({
  shiftId,
  onDrop,
  onOffer,
  onSwap,
}: {
  shiftId: number
  onDrop: (note?: string) => void
  onOffer: (note?: string) => void
  onSwap: (targetEmployeeId: number, note?: string) => void
}) {
  const [targets, setTargets] = useState<{ id: number; name: string }[]>([])
  const [target, setTarget] = useState<number | ''>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    api.getSwapTargets(shiftId).then(setTargets).catch(() => setTargets([]))
  }, [shiftId])

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-ink/15 bg-cream p-2.5">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for your manager"
        className="rounded-lg border-2 border-ink/30 bg-paper px-2 py-1 font-body text-xs text-ink outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onOffer(note || undefined)}
          className="rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-heading text-[11px] font-bold text-white"
        >
          Post to the crew
        </button>
        <button
          onClick={() => onDrop(note || undefined)}
          className="rounded-full border-2 border-coral px-2.5 py-0.5 font-heading text-[11px] font-bold text-coral-dark"
        >
          Drop
        </button>
        <span className="font-body text-[11px] text-muted-ink">or give to</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-lg border-2 border-ink bg-paper px-2 py-1 font-body text-xs text-ink outline-none"
        >
          <option value="">choose…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          disabled={target === ''}
          onClick={() => target !== '' && onSwap(target, note || undefined)}
          className="rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink disabled:opacity-40"
        >
          Request
        </button>
      </div>
    </div>
  )
}
