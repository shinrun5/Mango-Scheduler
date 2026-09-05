import { type MouseEvent, useEffect, useState } from 'react'
import { AssignPopover } from '../components/AssignPopover'
import { GapCard, ShiftCard, type CardPerson } from '../components/ScheduleCards'
import { Header } from '../components/Header'
import { api } from '../lib/api'
import { type Candidate, computeCandidates } from '../lib/candidates'
import { DAYS, DAY_LABEL, timeRange, toHHMM24, withTime } from '../lib/time'
import type {
  DayOfWeek,
  Employee,
  EmployeeStore,
  GenerateScheduleResult,
  RecurringAvailability,
  ScheduleGap,
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

  function openPickerFor(args: {
    e: MouseEvent<HTMLButtonElement>
    storeId: number
    day: DayOfWeek
    start: string
    end: string
    shiftId: number | null
    requirementId: number | null
    excludeIds: Set<number>
    title: string
    subtitle: string
  }) {
    if (!board) return
    const { e, storeId, day, start, end, excludeIds, ...rest } = args
    const candidates = computeCandidates({
      storeId,
      day,
      start,
      end,
      excludeEmployeeIds: excludeIds,
      employees: board.employees,
      employeeStores: board.employeeStores,
      availability: board.availability,
      shifts: board.shifts,
    })
    setPicker({
      anchorRect: e.currentTarget.getBoundingClientRect(),
      storeId,
      day,
      start,
      end,
      excludeIds,
      candidates,
      ...rest,
    })
  }

  function candidatesForWindow(storeId: number, day: DayOfWeek, start: string, end: string, excludeIds: Set<number>) {
    if (!board) return []
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
    })
  }

  /** Shorten the tapped shift to end at splitTime, then hand the rest of the window to someone else. */
  async function handleSplit(splitTime: string, employeeId: number) {
    if (!picker || !board || picker.shiftId === null) return
    const { shiftId, storeId, day, start, end } = picker
    setPicker(null)
    try {
      await api.updateShift(shiftId, { end: withTime(end, splitTime) })
      await api.createShift({ employeeId, storeId, day, start: withTime(start, splitTime), end })
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  async function handlePick(employeeId: number) {
    if (!picker || !board) return
    const { shiftId, storeId, day, start, end, requirementId } = picker
    const pickedLink = board.employeeStores.find((es) => es.employeeId === employeeId && es.storeId === storeId)
    setPicker(null)
    try {
      if (shiftId !== null) {
        await api.updateShift(shiftId, { employeeId })
      } else {
        await api.createShift({ employeeId, storeId, day, start, end })
      }
      setBoard(await loadBoard())
      if (requirementId !== null) {
        setLastResult((prev) => decrementGap(prev, requirementId, pickedLink))
      }
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

  const view = buildView(board, lastResult)

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header gapCount={lastResult?.unfilled ?? null} generating={generating} onGenerate={handleGenerate} />
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
                          onPersonClick={(person, e) =>
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day,
                              start: w.start,
                              end: w.end,
                              shiftId: person.shiftId,
                              requirementId: null,
                              excludeIds: new Set(w.people.map((p) => p.employeeId)),
                              title: `Instead of ${person.name}`,
                              subtitle: timeRange(w.start, w.end),
                            })
                          }
                        />
                      ))}
                      {gaps.map((g) => (
                        <GapCard
                          key={g.requirementId}
                          label={g.label}
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
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day,
                              start: g.start,
                              end: g.end,
                              shiftId: null,
                              requirementId: g.requirementId,
                              excludeIds: new Set(already.map((s) => s.employeeId as number)),
                              title: 'Who can cover this?',
                              subtitle: `${timeRange(g.start, g.end)} — ${g.detail}`,
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
          title={picker.title}
          subtitle={picker.subtitle}
          candidates={picker.candidates}
          anchorRect={picker.anchorRect}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          split={
            picker.shiftId !== null
              ? {
                  minTime: toHHMM24(picker.start),
                  maxTime: toHHMM24(picker.end),
                  getCandidates: (splitTime) =>
                    candidatesForWindow(
                      picker.storeId,
                      picker.day,
                      withTime(picker.start, splitTime),
                      picker.end,
                      picker.excludeIds,
                    ),
                  onSplit: handleSplit,
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function decrementGap(
  prev: GenerateScheduleResult | null,
  requirementId: number,
  pickedLink: EmployeeStore | undefined,
): GenerateScheduleResult | null {
  if (!prev) return prev
  const isSenior = pickedLink?.proficiency === 'SENIOR' || pickedLink?.proficiency === 'MANAGER'
  const isOpener = pickedLink?.canOpen ?? false
  const gaps = prev.gaps
    .map((g): ScheduleGap => {
      if (g.requirementId !== requirementId) return g
      if (g.kind === 'senior' && !isSenior) return g
      if (g.kind === 'open' && !isOpener) return g
      return { ...g, shortBy: g.shortBy - 1 }
    })
    .filter((g) => g.shortBy > 0)
  return { ...prev, gaps, unfilled: gaps.reduce((sum, g) => sum + g.shortBy, 0) }
}

interface ViewStore {
  id: number
  name: string
  accentClass: string
  days: {
    day: DayOfWeek
    windows: { start: string; end: string; people: CardPerson[] }[]
    gaps: { requirementId: number; start: string; end: string; label: string; detail: string }[]
  }[]
}

const ACCENT_CLASSES = ['bg-green', 'bg-sky', 'bg-grape', 'bg-orange'] as const
const GAP_KIND_LABEL: Record<ScheduleGap['kind'], string> = { head: 'person', senior: 'senior', open: 'opener' }

function buildView(
  { stores, employees, employeeStores, shifts, requirements }: BoardData,
  lastResult: GenerateScheduleResult | null,
): { stores: ViewStore[] } {
  const employeeName = new Map(employees.map((e) => [e.id, e.name]))
  const canOpenAt = new Map(employeeStores.map((es) => [`${es.employeeId}:${es.storeId}`, es.canOpen]))
  const requirementById = new Map(requirements.map((r) => [r.id, r]))

  // group gap entries by requirement (a requirement can be short on more than one kind at once)
  const gapsByRequirement = new Map<number, ScheduleGap[]>()
  for (const g of lastResult?.gaps ?? []) {
    const list = gapsByRequirement.get(g.requirementId) ?? []
    list.push(g)
    gapsByRequirement.set(g.requirementId, list)
  }
  const gapsByStoreDay = new Map<
    string,
    { requirementId: number; start: string; end: string; label: string; detail: string }[]
  >()
  for (const [requirementId, kinds] of gapsByRequirement) {
    const req = requirementById.get(requirementId)
    if (!req) continue
    const key = `${req.storeId}:${req.day}`
    const detail = kinds
      .map((k) => `${k.shortBy} more ${GAP_KIND_LABEL[k.kind]}${k.shortBy === 1 ? '' : 's'} needed`)
      .join('; ')
    const list = gapsByStoreDay.get(key) ?? []
    list.push({ requirementId, start: req.start, end: req.end, label: 'COVERAGE GAP', detail })
    gapsByStoreDay.set(key, list)
  }

  const viewStores: ViewStore[] = stores.map((store, i) => {
    const isOpenerStore = store.requiresOpenerSkill
    const byDay = new Map<DayOfWeek, Map<string, { start: string; end: string; people: CardPerson[] }>>()

    for (const shift of shifts) {
      if (shift.storeId !== store.id || shift.employeeId === null) continue
      const key = `${shift.start}|${shift.end}`
      const dayMap = byDay.get(shift.day) ?? new Map()
      byDay.set(shift.day, dayMap)
      const group = dayMap.get(key) ?? { start: shift.start, end: shift.end, people: [] as CardPerson[] }
      dayMap.set(key, group)
      group.people.push({
        shiftId: shift.id,
        employeeId: shift.employeeId,
        name: employeeName.get(shift.employeeId) ?? `#${shift.employeeId}`,
        isOpener: false, // resolved below, once we know the earliest window
      })
    }

    const days = DAYS.filter((d) => byDay.has(d) || gapsByStoreDay.has(`${store.id}:${d}`)).map((day) => {
      const dayMap = byDay.get(day)
      const windows = dayMap ? [...dayMap.values()].sort((a, b) => a.start.localeCompare(b.start)) : []
      const openerWindow = windows[0]
      if (isOpenerStore && openerWindow) {
        for (const p of openerWindow.people) {
          p.isOpener = canOpenAt.get(`${p.employeeId}:${store.id}`) ?? false
        }
      }
      return { day, windows, gaps: gapsByStoreDay.get(`${store.id}:${day}`) ?? [] }
    })

    return { id: store.id, name: store.name, accentClass: ACCENT_CLASSES[i % ACCENT_CLASSES.length], days }
  })

  return { stores: viewStores }
}
