import { useCallback, useEffect, useState } from 'react'
import { CalendarIcon } from '../components/icons'
import { FruitAvatar } from '../components/FruitAvatar'
import { api } from '../lib/api'
import { fruitForPerson } from '../lib/fruit'
import { DAY_LABEL, DAYS, dayDate, relativeTime, timeRange, weekRangeLabel } from '../lib/time'
import type { ChangeRequest, MyShiftsResponse, Shift, ShiftCoworker, Store } from '../types'

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

  if (error && !data) return <div className="p-6 font-body text-sm text-coral-dark">{error}</div>
  if (!data) return <div className="p-6 font-body text-sm text-muted-ink">Loading…</div>

  if (!data.published) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
        <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
        <EmptyState
          title="Nothing posted yet"
          body="Your manager hasn't put up this week's schedule. Check back soon."
        />
      </div>
    )
  }

  const byDay = DAYS.map((day) => ({
    day,
    shifts: data.shifts
      .filter((s) => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((d) => d.shifts.length > 0)

  const totalHours = Math.round(
    data.shifts.reduce(
      (sum, s) => sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000,
      0,
    ),
  )
  const meta = [
    byDay.length > 0 &&
      `${data.shifts.length} shift${data.shifts.length === 1 ? '' : 's'} · ~${totalHours}h`,
    data.publishedAt && `posted ${relativeTime(data.publishedAt)}`,
  ].filter(Boolean)

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
      <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
      <div className="mt-0.5 font-body text-xs text-muted-ink">
        {data.weekStart && (
          <span className="font-bold text-ink">Week of {weekRangeLabel(data.weekStart)}</span>
        )}
        {data.weekStart && meta.length > 0 && ' · '}
        {meta.join(' · ')}
      </div>

      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {data.published && !data.live && (
        <div className="mt-3 rounded-xl border-2 border-orange bg-orange/10 px-3 py-2 font-body text-xs text-ink">
          Your manager is putting together the next schedule. This is the last one they posted —
          shift changes are paused until the new one goes up.
        </div>
      )}

      {byDay.length === 0 ? (
        <EmptyState
          title="You're off this week"
          body="No shifts on the posted schedule. Check Market for shifts up for grabs."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {byDay.map(({ day, shifts }) => (
            <div
              key={day}
              className="overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex items-baseline gap-1.5 border-b-2 border-ink/10 bg-cream px-3 py-1.5">
                <span className="font-heading text-sm font-bold text-ink">{DAY_LABEL[day]}</span>
                {data.weekStart && (
                  <span className="font-body text-[11px] font-semibold text-muted-ink">
                    {dayDate(data.weekStart, DAYS.indexOf(day))}
                  </span>
                )}
              </div>
              <div className="flex flex-col divide-y divide-ink/10">
                {shifts.map((s) => {
                  const pending = pendingFor(s.id)
                  return (
                    <div key={s.id} className="flex flex-col gap-1.5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-heading text-sm font-bold text-ink">
                            {timeRange(s.start, s.end)}
                          </div>
                          <div className="font-body text-[11px] font-semibold text-muted-ink">
                            {storeName(s.storeId)}
                          </div>
                        </div>
                        {!data.live ? null : pending ? (
                          <span className="flex shrink-0 flex-col items-end gap-0.5 text-right font-body text-[11px] font-bold text-orange">
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
                            className="shrink-0 rounded-full px-2.5 py-1 font-heading text-[11px] font-bold text-sky-dark active:bg-sky/10"
                          >
                            {expanded === s.id ? 'Close' : 'Request change'}
                          </button>
                        )}
                      </div>
                      {s.coworkers.length > 0 && <CoworkerRow people={s.coworkers} />}
                      {data.live && expanded === s.id && !pending && (
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

      {data.live && openShifts.length > 0 && (
        <>
          <h2 className="mt-6 font-heading text-sm font-bold text-ink">Open shifts you can pick up</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {openShifts.map((s) => {
              const pending = pendingFor(s.id)
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-paper px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-xs font-bold text-ink">
                      {DAY_LABEL[s.day]} · {timeRange(s.start, s.end)}
                    </div>
                    <div className="font-body text-[11px] text-muted-ink">{storeName(s.storeId)}</div>
                  </div>
                  {pending ? (
                    <span className="flex shrink-0 items-center gap-1.5 font-body text-[11px] font-bold text-orange">
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
                      className="shrink-0 rounded-full border-2 border-ink bg-green px-3 py-1 font-heading text-[11px] font-bold text-white"
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

function CoworkerRow({ people }: { people: ShiftCoworker[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-body text-[11px] font-bold text-muted-ink">Working with</span>
      {people.map((p, i) => (
        <span key={`${p.avatarKey}-${i}`} className="flex items-center gap-1">
          <FruitAvatar
            kind={fruitForPerson({ employeeId: p.avatarKey, avatarFruit: p.avatarFruit })}
            size={16}
          />
          <span className="font-body text-[11px] font-semibold text-ink">{p.name}</span>
        </span>
      ))}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border-[2.5px] border-dashed border-ink/25 bg-paper/60 px-6 py-10 text-center">
      <span className="text-muted-ink">
        <CalendarIcon size={30} />
      </span>
      <span className="font-heading text-sm font-bold text-ink">{title}</span>
      <span className="max-w-xs font-body text-xs text-muted-ink">{body}</span>
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

  const pill = 'rounded-full border-2 px-3 py-1.5 font-heading text-[11px] font-bold'

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border-2 border-ink/15 bg-cream p-2.5">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for your manager"
        className="rounded-lg border-2 border-ink/30 bg-paper px-2.5 py-1.5 font-body text-xs text-ink outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onOffer(note || undefined)}
          className={`${pill} flex-1 border-ink bg-green text-white`}
        >
          Post to the crew
        </button>
        <button
          onClick={() => onDrop(note || undefined)}
          className={`${pill} flex-1 border-coral text-coral-dark`}
        >
          Drop it
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 font-body text-[11px] text-muted-ink">or give to</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border-2 border-ink bg-paper px-2 py-1.5 font-body text-xs text-ink outline-none"
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
          className={`${pill} shrink-0 border-ink bg-paper text-ink disabled:opacity-40`}
        >
          Send
        </button>
      </div>
    </div>
  )
}
