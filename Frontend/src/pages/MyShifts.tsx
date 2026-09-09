import { useCallback, useEffect, useState } from 'react'
import { CalendarIcon } from '../components/icons'
import { FruitAvatar } from '../components/FruitAvatar'
import { api } from '../lib/api'
import { fruitForPerson } from '../lib/fruit'
import {
  DAY_LABEL,
  DAYS,
  dayDate,
  relativeTime,
  timeRange,
  to12Hour,
  toHHMM24,
  weekRangeLabel,
} from '../lib/time'
import type { ChangeRequest, MyShiftsResponse, Shift, ShiftCoworker, TeamShift, Store } from '../types'

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
  const [view, setView] = useState<'mine' | 'team'>('mine')

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

      <div className="mt-3 flex gap-2">
        {(['mine', 'team'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
              view === v ? 'bg-ink text-white' : 'bg-paper text-ink'
            }`}
          >
            {v === 'mine' ? 'My shifts' : 'Whole team'}
          </button>
        ))}
      </div>

      {view === 'team' ? (
        <TeamWeek
          team={data.team}
          weekStart={data.weekStart}
          myEmployeeId={data.shifts.find((s) => s.employeeId != null)?.employeeId ?? null}
          multiStore={data.stores.length > 1}
          storeName={storeName}
        />
      ) : byDay.length === 0 ? (
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
                          shift={{ id: s.id, start: s.start, end: s.end }}
                          onSubmit={(input) =>
                            act(() => api.createChangeRequest({ shiftId: s.id, ...input }))
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
                  {DAY_LABEL[r.shift.day]}{' '}
                  {r.handoffStart && r.handoffEnd
                    ? `${timeRange(r.handoffStart, r.handoffEnd)} (part)`
                    : timeRange(r.shift.start, r.shift.end)}{' '}
                  at {storeName(r.shift.storeId)}
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

function TeamWeek({
  team,
  weekStart,
  myEmployeeId,
  multiStore,
  storeName,
}: {
  team: TeamShift[]
  weekStart: string | null
  myEmployeeId: number | null
  multiStore: boolean
  storeName: (id: number) => string
}) {
  const byDay = DAYS.map((day) => ({
    day,
    shifts: team
      .filter((s) => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name)),
  })).filter((d) => d.shifts.length > 0)

  if (byDay.length === 0) {
    return <EmptyState title="Nothing on the schedule" body="No shifts posted for this week yet." />
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {byDay.map(({ day, shifts }) => (
        <div
          key={day}
          className="overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]"
        >
          <div className="flex items-baseline gap-1.5 border-b-2 border-ink/10 bg-cream px-3 py-1.5">
            <span className="font-heading text-sm font-bold text-ink">{DAY_LABEL[day]}</span>
            {weekStart && (
              <span className="font-body text-[11px] font-semibold text-muted-ink">
                {dayDate(weekStart, DAYS.indexOf(day))}
              </span>
            )}
          </div>
          <div className="flex flex-col divide-y divide-ink/10">
            {shifts.map((s, i) => {
              const mine = s.employeeId != null && s.employeeId === myEmployeeId
              const open = s.employeeId == null
              return (
                <div
                  key={`${s.storeId}-${s.start}-${s.employeeId ?? 'open'}-${i}`}
                  className={`flex items-center gap-2 px-3 py-2 ${mine ? 'bg-sky/10' : ''}`}
                >
                  {open ? (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-[10px] text-muted-ink">
                      ?
                    </span>
                  ) : (
                    <FruitAvatar
                      kind={fruitForPerson({ employeeId: s.avatarKey, avatarFruit: s.avatarFruit })}
                      size={18}
                    />
                  )}
                  <span
                    className={`min-w-0 flex-1 truncate font-body text-xs ${
                      open ? 'italic text-muted-ink' : mine ? 'font-bold text-ink' : 'text-ink'
                    }`}
                  >
                    {mine ? 'You' : s.name}
                    {multiStore && <span className="text-muted-ink"> · {storeName(s.storeId)}</span>}
                  </span>
                  <span className="shrink-0 font-body text-[11px] font-semibold text-muted-ink">
                    {timeRange(s.start, s.end)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
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

type ReqInput = {
  type: 'DROP' | 'SWAP'
  targetEmployeeId?: number
  note?: string
  handoffStart?: string
  handoffEnd?: string
}

function RequestPanel({
  shift,
  onSubmit,
}: {
  shift: { id: number; start: string; end: string }
  onSubmit: (input: ReqInput) => void
}) {
  const shiftStart = toHHMM24(shift.start)
  const shiftEnd = toHHMM24(shift.end)
  const [targets, setTargets] = useState<{ id: number; name: string }[]>([])
  const [target, setTarget] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [part, setPart] = useState(false)
  const [pStart, setPStart] = useState(shiftStart)
  const [pEnd, setPEnd] = useState(shiftEnd)

  useEffect(() => {
    api.getSwapTargets(shift.id).then(setTargets).catch(() => setTargets([]))
  }, [shift.id])

  const inRange = pStart >= shiftStart && pEnd <= shiftEnd && pStart < pEnd
  const isWhole = pStart === shiftStart && pEnd === shiftEnd
  const partValid = !part || (inRange && !isWhole)
  const handoff = part && inRange && !isWhole
  const base = (type: 'DROP' | 'SWAP', targetEmployeeId?: number): ReqInput => ({
    type,
    ...(targetEmployeeId ? { targetEmployeeId } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
    ...(handoff ? { handoffStart: pStart, handoffEnd: pEnd } : {}),
  })

  const pill = 'rounded-full border-2 px-3 py-1.5 font-heading text-[11px] font-bold'
  const timeInp =
    'w-[6.5rem] rounded-lg border-2 border-ink/40 bg-paper px-2 py-1 font-body text-xs text-ink outline-none'

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border-2 border-ink/15 bg-cream p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {(['whole', 'part'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPart(m === 'part')}
            className={`rounded-full border-2 border-ink px-2.5 py-0.5 font-heading text-[11px] font-bold ${
              (m === 'part') === part ? 'bg-ink text-white' : 'bg-paper text-ink'
            }`}
          >
            {m === 'whole' ? 'Whole shift' : 'Part of it'}
          </button>
        ))}
        {part && (
          <span className="flex items-center gap-1">
            <input type="time" step={1800} value={pStart} min={shiftStart} max={shiftEnd} onChange={(e) => setPStart(e.target.value)} className={timeInp} />
            <span className="text-muted-ink">–</span>
            <input type="time" step={1800} value={pEnd} min={shiftStart} max={shiftEnd} onChange={(e) => setPEnd(e.target.value)} className={timeInp} />
          </span>
        )}
      </div>
      {part && !partValid && (
        <p className="font-body text-[11px] font-bold text-coral-dark">
          {isWhole
            ? "That's your whole shift — trim it, or switch to “Whole shift”."
            : `Pick a window inside ${to12Hour(shiftStart)}–${to12Hour(shiftEnd)}.`}
        </p>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for your manager"
        className="rounded-lg border-2 border-ink/30 bg-paper px-2.5 py-1.5 font-body text-xs text-ink outline-none"
      />
      <div className="flex gap-2">
        <button
          disabled={!partValid}
          onClick={() => onSubmit(base('SWAP'))}
          className={`${pill} flex-1 border-ink bg-green text-white disabled:opacity-40`}
        >
          Post to the crew
        </button>
        <button
          disabled={!partValid}
          onClick={() => onSubmit(base('DROP'))}
          className={`${pill} flex-1 border-coral text-coral-dark disabled:opacity-40`}
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
          disabled={target === '' || !partValid}
          onClick={() => target !== '' && onSubmit(base('SWAP', target))}
          className={`${pill} shrink-0 border-ink bg-paper text-ink disabled:opacity-40`}
        >
          Send
        </button>
      </div>
    </div>
  )
}
