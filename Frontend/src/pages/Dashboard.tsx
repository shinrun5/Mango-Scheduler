import { type MouseEvent, useEffect, useState } from 'react'
import { AssignPopover } from '../components/AssignPopover'
import { GapCard, ShiftCard, type CardPerson } from '../components/ScheduleCards'
import { Header } from '../components/Header'
import { api } from '../lib/api'
import { type Candidate, computeCandidates } from '../lib/candidates'
import { computeGapCards, type GapCardData } from '../lib/gaps'
import { effectiveCanOpen, windowGrace, windowNeedsOpener } from '../lib/openers'
import { DAYS, DAY_LABEL, timeRange, to12Hour, toHHMM24, toMinutes, withTime } from '../lib/time'
import type {
  DayOfWeek,
  Employee,
  EmployeeStore,
  GenerateScheduleResult,
  RecurringAvailability,
  Shift,
  ShiftRequirement,
  Store,
} from '../types'

interface BoardData {
  stores: Store[]
  employees: Employee[]
  employeeStores: EmployeeStore[]
  shifts: Shift[]
  requirements: ShiftRequirement[]
  availability: RecurringAvailability[]
}

async function loadBoard(): Promise<BoardData> {
  const [stores, employees, employeeStores, shifts, requirements, availability] = await Promise.all([
    api.getStores(),
    api.getEmployees(),
    api.getEmployeeStores(),
    api.getShifts(),
    api.getShiftRequirements(),
    api.getAvailability(),
  ])
  return { stores, employees, employeeStores, shifts, requirements, availability }
}

interface PickerState {
  anchorRect: DOMRect
  storeId: number
  day: DayOfWeek
  start: string
  end: string
  /** Reassigning an existing row (PUT) vs filling an empty slot (POST). */
  shiftId: number | null
  requirementId: number | null
  excludeIds: Set<number>
  requireOpener: boolean
  graceMinutes: number
  personName: string | null
  candidates: Candidate[]
  title: string
  subtitle: string
}

export function Dashboard() {
  const [board, setBoard] = useState<BoardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<GenerateScheduleResult | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)

  useEffect(() => {
    loadBoard().then(setBoard).catch((e) => setError(String(e)))
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const result = await api.generateSchedule()
      setLastResult(result)
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  function candidatesForWindow(
    storeId: number,
    day: DayOfWeek,
    start: string,
    end: string,
    excludeIds: Set<number>,
    requireOpener = false,
    graceMinutes = 0,
  ) {
    if (!board) return []
    const store = board.stores.find((s) => s.id === storeId)
    return computeCandidates({
      storeId,
      day,
      start,
      end,
      excludeEmployeeIds: excludeIds,
      employees: board.employees,
      employeeStores: board.employeeStores,
      availability: board.availability,
      shifts: board.shifts,
      requireOpener,
      storeRequiresOpenerSkill: store?.requiresOpenerSkill ?? true,
      graceMinutes,
    })
  }

  function openPickerFor(args: {
    e: MouseEvent<HTMLButtonElement>
    storeId: number
    day: DayOfWeek
    start: string
    end: string
    shiftId: number | null
    requirementId: number | null
    personName: string | null
    excludeIds: Set<number>
    requireOpener: boolean
    graceMinutes: number
    title: string
    subtitle: string
  }) {
    if (!board) return
    const { e, storeId, day, start, end, excludeIds, requireOpener, graceMinutes, ...rest } = args
    const candidates = candidatesForWindow(storeId, day, start, end, excludeIds, requireOpener, graceMinutes)
    setPicker({
      anchorRect: e.currentTarget.getBoundingClientRect(),
      storeId,
      day,
      start,
      end,
      excludeIds,
      requireOpener,
      graceMinutes,
      candidates,
      ...rest,
    })
  }

  /** Commit a last-resort split. tail: hand [T,end] to someone (and, for an existing
   * shift, shorten the original to end at T). head: hand [start,T] to someone (gaps only). */
  async function commitSplit({
    which,
    splitAt,
    employeeId,
  }: {
    which: 'head' | 'tail'
    splitAt: string
    employeeId: number
  }) {
    if (!picker || !board) return
    const { shiftId, storeId, day, start, end } = picker
    setPicker(null)
    try {
      if (which === 'tail') {
        if (shiftId !== null) await api.updateShift(shiftId, { end: withTime(end, splitAt) })
        await api.createShift({ employeeId, storeId, day, start: withTime(start, splitAt), end })
      } else {
        await api.createShift({ employeeId, storeId, day, start, end: withTime(end, splitAt) })
      }
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  async function handlePick(employeeId: number) {
    if (!picker || !board) return
    const { shiftId, storeId, day, start, end } = picker
    setPicker(null)
    try {
      if (shiftId !== null) {
        await api.updateShift(shiftId, { employeeId })
      } else {
        await api.createShift({ employeeId, storeId, day, start, end })
      }
      // gap cards are derived from real coverage on the next render, so just reload
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center font-body text-coral-dark">
        Couldn't load the schedule: {error}
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center font-body text-muted-ink">
        Loading…
      </div>
    )
  }

  const view = buildView(board)
  const solved = lastResult !== null || board.shifts.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header
        gapCount={solved ? view.totalShort : null}
        generating={generating}
        onGenerate={handleGenerate}
      />
      <div className="flex flex-1 flex-col gap-8 p-8">
        {view.stores.length === 0 && <p className="font-body text-muted-ink">No stores set up yet.</p>}
        {view.stores.map((store) => (
          <div key={store.id} className="flex flex-col gap-3">
            {store.days.length > 0 && (
              <>
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${store.accentClass}`} />
                  <span className="font-heading text-lg font-bold text-ink">{store.name}</span>
                </div>
                <div
                  className="grid gap-3.5"
                  style={{ gridTemplateColumns: `repeat(${store.days.length}, minmax(0, 1fr))` }}
                >
                  {store.days.map(({ day, windows, gaps }) => (
                    <div key={day} className="flex flex-col gap-2">
                      <span
                        className={`text-center font-heading text-xs font-bold ${
                          gaps.length ? 'text-coral-dark' : 'text-ink'
                        }`}
                      >
                        {DAY_LABEL[day]}
                      </span>
                      {windows.map((w, i) => (
                        <ShiftCard
                          key={i}
                          start={w.start}
                          end={w.end}
                          people={w.people}
                          onPersonClick={(person, e) => {
                            const needsOpener = windowNeedsOpener(board.requirements, store.id, day, w.start, w.end)
                            const staysBehindCanOpen = w.people
                              .filter((p) => p.employeeId !== person.employeeId)
                              .some((p) => effectiveCanOpen(board.employeeStores, board.stores, p.employeeId, store.id))
                            const requireOpener = needsOpener && !staysBehindCanOpen
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day,
                              start: w.start,
                              end: w.end,
                              shiftId: person.shiftId,
                              requirementId: null,
                              personName: person.name,
                              excludeIds: new Set(w.people.map((p) => p.employeeId)),
                              requireOpener,
                              graceMinutes: windowGrace(board.requirements, store.id, day, w.start, w.end),
                              title: `Instead of ${person.name}`,
                              subtitle: requireOpener
                                ? `${timeRange(w.start, w.end)} · must be able to open`
                                : timeRange(w.start, w.end),
                            })
                          }}
                        />
                      ))}
                      {gaps.map((g, gi) => (
                        <GapCard
                          key={`${g.requirementId}:${gi}`}
                          label={g.label}
                          window={timeRange(g.start, g.end)}
                          detail={g.detail}
                          onClick={(e) => {
                            const already = board.shifts.filter(
                              (s) =>
                                s.storeId === store.id &&
                                s.day === day &&
                                s.start === g.start &&
                                s.end === g.end &&
                                s.employeeId !== null,
                            )
                            const needsOpener = windowNeedsOpener(board.requirements, store.id, day, g.start, g.end)
                            const alreadyCanOpen = already.some((s) =>
                              effectiveCanOpen(board.employeeStores, board.stores, s.employeeId as number, store.id),
                            )
                            const requireOpener = needsOpener && !alreadyCanOpen
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day,
                              start: g.start,
                              end: g.end,
                              shiftId: null,
                              requirementId: g.requirementId,
                              personName: null,
                              excludeIds: new Set(already.map((s) => s.employeeId as number)),
                              requireOpener,
                              graceMinutes: windowGrace(board.requirements, store.id, day, g.start, g.end),
                              title: 'Who can cover this?',
                              subtitle: requireOpener
                                ? `${timeRange(g.start, g.end)} — ${g.detail} · must be able to open`
                                : `${timeRange(g.start, g.end)} — ${g.detail}`,
                            })
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {view.stores.every((s) => s.days.length === 0) && (
          <p className="font-body text-muted-ink">
            No shifts on the board yet — click Generate Schedule to run the solver.
          </p>
        )}
      </div>
      {picker && (
        <AssignPopover
          key={`${picker.storeId}-${picker.day}-${picker.start}-${picker.shiftId ?? 'gap'}`}
          title={picker.title}
          subtitle={picker.subtitle}
          candidates={picker.candidates}
          anchorRect={picker.anchorRect}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          split={{
            windowStart: toHHMM24(picker.start),
            windowEnd: toHHMM24(picker.end),
            headStaysWith: picker.personName,
            candidatesFor: (fromHHMM, toHHMM) => {
              // the head sub-window covers open time, so it inherits the opener
              // requirement and the late-arrival grace; the tail is a mid-window handoff
              const isHead = fromHHMM === toHHMM24(picker.start)
              return candidatesForWindow(
                picker.storeId,
                picker.day,
                withTime(picker.start, fromHHMM),
                withTime(picker.start, toHHMM),
                picker.excludeIds,
                isHead && picker.requireOpener,
                isHead ? picker.graceMinutes : 0,
              )
            },
            commit: commitSplit,
          }}
        />
      )}
    </div>
  )
}

interface ViewStore {
  id: number
  name: string
  accentClass: string
  days: {
    day: DayOfWeek
    windows: { start: string; end: string; people: CardPerson[] }[]
    gaps: GapCardData[]
  }[]
}

const ACCENT_CLASSES = ['bg-green', 'bg-sky', 'bg-grape', 'bg-orange'] as const

function buildView({
  stores,
  employees,
  employeeStores,
  shifts,
  requirements,
}: BoardData): { stores: ViewStore[]; totalShort: number } {
  const employeeName = new Map(employees.map((e) => [e.id, e.name]))

  // gap cards reflect ACTUAL current coverage (incl. manual fills/splits), not the
  // solver's original report -- so nothing needs to be decremented by hand.
  const gapsByStoreDay =
    shifts.length > 0 ? computeGapCards(requirements, shifts, employeeStores, stores) : new Map<string, GapCardData[]>()
  let totalShort = 0
  for (const list of gapsByStoreDay.values()) for (const g of list) totalShort += g.shortBy

  const viewStores: ViewStore[] = stores.map((store, i) => {
    const byDay = new Map<DayOfWeek, Map<string, { start: string; end: string; people: CardPerson[] }>>()

    for (const shift of shifts) {
      if (shift.storeId !== store.id || shift.employeeId === null) continue
      const key = `${shift.start}|${shift.end}`
      const dayMap = byDay.get(shift.day) ?? new Map()
      byDay.set(shift.day, dayMap)
      const group = dayMap.get(key) ?? { start: shift.start, end: shift.end, people: [] as CardPerson[] }
      dayMap.set(key, group)

      // if this shift sits inside a wider requirement window, flag the mismatched edges
      const s = toMinutes(shift.start)
      const e = toMinutes(shift.end)
      const ref = requirements.find(
        (r) =>
          r.storeId === store.id &&
          r.day === shift.day &&
          toMinutes(r.start) <= s &&
          e <= toMinutes(r.end) &&
          (toMinutes(r.start) < s || e < toMinutes(r.end)),
      )
      const note = ref
        ? {
            comesIn: toMinutes(ref.start) !== s ? to12Hour(toHHMM24(shift.start)) : undefined,
            leaves: toMinutes(ref.end) !== e ? to12Hour(toHHMM24(shift.end)) : undefined,
          }
        : undefined

      group.people.push({
        shiftId: shift.id,
        employeeId: shift.employeeId,
        name: employeeName.get(shift.employeeId) ?? `#${shift.employeeId}`,
        isOpener: false, // resolved below, from ShiftRequirement.needOpen
        note,
      })
    }

    const days = DAYS.filter((d) => byDay.has(d) || gapsByStoreDay.has(`${store.id}:${d}`)).map((day) => {
      const dayMap = byDay.get(day)
      const windows = dayMap ? [...dayMap.values()].sort((a, b) => a.start.localeCompare(b.start)) : []
      for (const w of windows) {
        if (!windowNeedsOpener(requirements, store.id, day, w.start, w.end)) continue
        for (const p of w.people) {
          p.isOpener = effectiveCanOpen(employeeStores, stores, p.employeeId, store.id)
        }
      }
      return { day, windows, gaps: gapsByStoreDay.get(`${store.id}:${day}`) ?? [] }
    })

    return { id: store.id, name: store.name, accentClass: ACCENT_CLASSES[i % ACCENT_CLASSES.length], days }
  })

  return { stores: viewStores, totalShort }
}
