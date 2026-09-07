import { type MouseEvent, useEffect, useState } from 'react'
import { AssignPopover } from '../components/AssignPopover'
import { DayCard, type DayPerson } from '../components/ScheduleCards'
import { SlotEditor } from '../components/SlotEditor'
import { Header } from '../components/Header'
import { api } from '../lib/api'
import { type Candidate, computeCandidates } from '../lib/candidates'
import { computeGapCards, type GapCardData } from '../lib/gaps'
import { effectiveCanOpen } from '../lib/openers'
import {
  DAYS,
  DAY_LABEL,
  dayDate,
  shiftWeekYMD,
  timeRange,
  to12Hour,
  toHHMM24,
  toMinutes,
  windowsOverlap,
  withTime,
} from '../lib/time'
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
  /** the person's merged shift rows (empty = filling an open slot -> POST) */
  shiftIds: number[]
  requirementId: number | null
  excludeIds: Set<number>
  requireOpener: boolean
  graceMinutes: number
  personName: string | null
  candidates: Candidate[]
  candidatesAll: Candidate[]
  title: string
  subtitle: string
}

export function Dashboard() {
  const [board, setBoard] = useState<BoardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<GenerateScheduleResult | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [slotEditor, setSlotEditor] = useState<{ anchorRect: DOMRect; requirements: ShiftRequirement[] } | null>(null)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [publishBusy, setPublishBusy] = useState(false)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBoard().then(setBoard).catch((e) => setError(String(e)))
    api
      .getScheduleStatus()
      .then((s) => {
        setPublishedAt(s.publishedAt)
        setWeekStart(s.weekStart)
      })
      .catch(() => {})
  }, [])

  async function togglePublish(next: boolean) {
    setPublishBusy(true)
    try {
      const s = next ? await api.publishSchedule() : await api.unpublishSchedule()
      setPublishedAt(s.publishedAt)
    } catch (e) {
      setError(String(e))
    } finally {
      setPublishBusy(false)
    }
  }

  async function changeWeek(deltaWeeks: number) {
    if (!weekStart) return
    try {
      const { weekStart: next } = await api.setScheduleWeek(shiftWeekYMD(weekStart, deltaWeeks))
      setWeekStart(next)
    } catch (e) {
      setError(String(e))
    }
  }

  async function saveToHistory() {
    setSaving(true)
    setError(null)
    try {
      const label = window.prompt('Label this saved schedule (optional):') ?? undefined
      await api.saveSnapshot(label || undefined)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // never lose the current schedule to a regenerate — auto-save it first
      const result = await api.generateSchedule({ saveFirst: (board?.shifts.length ?? 0) > 0 })
      setLastResult(result)
      setBoard(await loadBoard())
      const s = await api.getScheduleStatus()
      setPublishedAt(s.publishedAt)
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
    ignoreAvailability = false,
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
      ignoreAvailability,
    })
  }

  function openPickerFor(args: {
    e: MouseEvent<HTMLButtonElement>
    storeId: number
    day: DayOfWeek
    start: string
    end: string
    shiftIds: number[]
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
    const candidatesAll = candidatesForWindow(storeId, day, start, end, excludeIds, requireOpener, graceMinutes, true)
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
      candidatesAll,
      ...rest,
    })
  }

  /** Commit a last-resort split. tail: hand [T,end] to someone (and, for an existing
   * shift, shorten the original to end at T). head: hand [start,T] to someone (gaps only). */
  /** Collapse a person's (possibly merged) shift rows into a single row [from, to]. */
  async function collapseTo(shiftIds: number[], from: string, to: string) {
    const [first, ...rest] = shiftIds
    if (first === undefined) return
    await api.updateShift(first, { start: from, end: to })
    await Promise.all(rest.map((id) => api.deleteShift(id)))
  }

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
    const { shiftIds, storeId, day, start, end } = picker
    setPicker(null)
    try {
      if (which === 'tail') {
        if (shiftIds.length > 0) await collapseTo(shiftIds, start, withTime(end, splitAt))
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
    const { shiftIds, storeId, day, start, end } = picker
    setPicker(null)
    try {
      if (shiftIds.length > 0) {
        await Promise.all(shiftIds.map((id) => api.updateShift(id, { employeeId })))
      } else {
        await api.createShift({ employeeId, storeId, day, start, end })
      }
      // gap cards are derived from real coverage on the next render, so just reload
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  async function handleRemove() {
    if (!picker || picker.shiftIds.length === 0) return
    const { shiftIds } = picker
    setPicker(null)
    try {
      await Promise.all(shiftIds.map((id) => api.deleteShift(id)))
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  async function handleEditHours(startHHMM: string, endHHMM: string) {
    if (!picker || picker.shiftIds.length === 0) return
    const { shiftIds, start, end } = picker
    setPicker(null)
    try {
      await collapseTo(shiftIds, withTime(start, startHHMM), withTime(end, endHHMM))
      setBoard(await loadBoard())
    } catch (e) {
      setError(String(e))
    }
  }

  function openSlotEditor(e: MouseEvent<HTMLButtonElement>, requirements: ShiftRequirement[]) {
    if (requirements.length === 0) return
    setSlotEditor({ anchorRect: e.currentTarget.getBoundingClientRect(), requirements })
  }

  async function handleSaveRequirement(
    requirementId: number,
    patch: { regularRequired: number; needOpen: boolean },
  ) {
    setSlotEditor(null)
    try {
      await api.updateRequirement(requirementId, patch)
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

  const weekLoad = board.employees
    .map((e) => ({
      id: e.id,
      name: e.name,
      count: new Set(board.shifts.filter((s) => s.employeeId === e.id).map((s) => s.day)).size,
      max: e.maxShifts,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return (
    <>
      <Header
        weekStart={weekStart ?? undefined}
        onWeekChange={(d) => void changeWeek(d)}
        gapCount={solved ? view.totalShort : null}
        generating={generating}
        onGenerate={handleGenerate}
        onSave={solved ? () => void saveToHistory() : undefined}
        saving={saving}
        publishedAt={publishedAt}
        onPublish={() => void togglePublish(true)}
        onUnpublish={() => void togglePublish(false)}
        publishBusy={publishBusy}
      />

      {solved && weekLoad.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-ink/10 bg-paper px-8 py-2.5">
          <span className="mr-1 font-heading text-[11px] font-bold uppercase tracking-wide text-muted-ink">
            Shifts this week
          </span>
          {weekLoad.map((l) => (
            <span
              key={l.id}
              title={l.count > l.max ? `over their ${l.max}-day limit` : undefined}
              className={`rounded-full border-2 px-2 py-0.5 font-body text-[11px] font-bold ${
                l.count > l.max
                  ? 'border-coral bg-coral-bg text-coral-dark'
                  : l.count === 0
                    ? 'border-ink/20 text-muted-ink'
                    : 'border-ink bg-paper text-ink'
              }`}
            >
              {l.name} · {l.count}
              {l.count > l.max ? `/${l.max}` : ''}
            </span>
          ))}
        </div>
      )}

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
                  {store.days.map((d) => {
                    const opStart = d.requirements.length
                      ? Math.min(...d.requirements.map((r) => toMinutes(r.start)))
                      : 0
                    const needsOpen = d.requirements.some((r) => r.needOpen)
                    const graceAt = (isoStart: string) =>
                      d.requirements.find(
                        (r) => toMinutes(r.start) <= toMinutes(isoStart) && toMinutes(isoStart) < toMinutes(r.end),
                      )?.graceMinutes ?? 0

                    return (
                      <div key={d.day} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={(e) => openSlotEditor(e, d.requirements)}
                          className={`flex flex-col items-center leading-tight transition-opacity hover:opacity-60 ${
                            d.gaps.length ? 'text-coral-dark' : 'text-ink'
                          }`}
                        >
                          <span className="font-heading text-xs font-bold">{DAY_LABEL[d.day]}</span>
                          {weekStart && (
                            <span className="font-body text-[10px] font-semibold text-muted-ink">
                              {dayDate(weekStart, DAYS.indexOf(d.day))}
                            </span>
                          )}
                        </button>
                        <DayCard
                          people={d.people}
                          gaps={d.gaps}
                          onPersonClick={(person, e) => {
                            const requireOpener =
                              person.isOpener &&
                              !d.people.some((p) => p.employeeId !== person.employeeId && p.isOpener)
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day: d.day,
                              start: person.start,
                              end: person.end,
                              shiftIds: person.shiftIds,
                              requirementId: null,
                              personName: person.name,
                              excludeIds: new Set(
                                d.people
                                  .filter((p) =>
                                    windowsOverlap(
                                      toMinutes(p.start),
                                      toMinutes(p.end),
                                      toMinutes(person.start),
                                      toMinutes(person.end),
                                    ),
                                  )
                                  .map((p) => p.employeeId),
                              ),
                              requireOpener,
                              graceMinutes: graceAt(person.start),
                              title: `Instead of ${person.name}`,
                              subtitle: requireOpener
                                ? `${timeRange(person.start, person.end)} · must be able to open`
                                : timeRange(person.start, person.end),
                            })
                          }}
                          onGapClick={(g, e) => {
                            const already = board.shifts.filter(
                              (s) =>
                                s.storeId === store.id &&
                                s.day === d.day &&
                                s.employeeId !== null &&
                                windowsOverlap(
                                  toMinutes(s.start),
                                  toMinutes(s.end),
                                  toMinutes(g.start),
                                  toMinutes(g.end),
                                ),
                            )
                            const alreadyCanOpen = already.some((s) =>
                              effectiveCanOpen(board.employeeStores, board.stores, s.employeeId as number, store.id),
                            )
                            const requireOpener =
                              needsOpen && toMinutes(g.start) <= opStart && !alreadyCanOpen
                            openPickerFor({
                              e,
                              storeId: store.id,
                              day: d.day,
                              start: g.start,
                              end: g.end,
                              shiftIds: [],
                              requirementId: g.requirementId,
                              personName: null,
                              excludeIds: new Set(already.map((s) => s.employeeId as number)),
                              requireOpener,
                              graceMinutes: graceAt(g.start),
                              title: 'Who can cover this?',
                              subtitle: requireOpener
                                ? `${timeRange(g.start, g.end)} — ${g.detail} · must be able to open`
                                : `${timeRange(g.start, g.end)} — ${g.detail}`,
                            })
                          }}
                        />
                      </div>
                    )
                  })}
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
          key={`${picker.storeId}-${picker.day}-${picker.start}-${picker.shiftIds.join(',') || 'gap'}`}
          title={picker.title}
          subtitle={picker.subtitle}
          candidates={picker.candidates}
          candidatesAll={picker.candidatesAll}
          anchorRect={picker.anchorRect}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          onRemove={picker.shiftIds.length > 0 ? handleRemove : undefined}
          editHours={
            picker.shiftIds.length > 0
              ? { start: toHHMM24(picker.start), end: toHHMM24(picker.end), onSave: handleEditHours }
              : undefined
          }
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
      {slotEditor && (
        <SlotEditor
          anchorRect={slotEditor.anchorRect}
          requirements={slotEditor.requirements}
          storeName={board.stores.find((s) => s.id === slotEditor.requirements[0]?.storeId)?.name ?? ''}
          onSave={handleSaveRequirement}
          onClose={() => setSlotEditor(null)}
        />
      )}
    </>
  )
}

interface ViewStore {
  id: number
  name: string
  accentClass: string
  days: {
    day: DayOfWeek
    people: DayPerson[]
    gaps: GapCardData[]
    requirements: ShiftRequirement[]
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

  // gaps reflect ACTUAL current coverage, not the solver's original report
  const gapsByStoreDay =
    shifts.length > 0 ? computeGapCards(requirements, shifts, employeeStores, stores) : new Map<string, GapCardData[]>()
  let totalShort = 0
  for (const list of gapsByStoreDay.values()) for (const g of list) totalShort += g.shortBy

  const viewStores: ViewStore[] = stores.map((store, i) => {
    // per day: employeeId -> their shift rows, later merged into contiguous spans
    const byDay = new Map<DayOfWeek, Map<number, Shift[]>>()
    for (const shift of shifts) {
      if (shift.storeId !== store.id || shift.employeeId === null) continue
      const dayMap = byDay.get(shift.day) ?? new Map<number, Shift[]>()
      byDay.set(shift.day, dayMap)
      const list = dayMap.get(shift.employeeId) ?? []
      list.push(shift)
      dayMap.set(shift.employeeId, list)
    }

    const days = DAYS.filter((d) => byDay.has(d) || gapsByStoreDay.has(`${store.id}:${d}`)).map((day) => {
      const dayReqs = requirements
        .filter((r) => r.storeId === store.id && r.day === day)
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
      // the store's operating window that day, and its opening time
      const opStart = dayReqs.length ? Math.min(...dayReqs.map((r) => toMinutes(r.start))) : 0
      const opEnd = dayReqs.length ? Math.max(...dayReqs.map((r) => toMinutes(r.end))) : 0
      const needsOpen = dayReqs.some((r) => r.needOpen)

      const people: DayPerson[] = []
      for (const [employeeId, rows] of byDay.get(day) ?? []) {
        rows.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
        // merge back-to-back / overlapping rows into spans
        const spans: { start: string; end: string; shiftIds: number[] }[] = []
        for (const s of rows) {
          const last = spans[spans.length - 1]
          if (last && toMinutes(s.start) <= toMinutes(last.end)) {
            if (toMinutes(s.end) > toMinutes(last.end)) last.end = s.end
            last.shiftIds.push(s.id)
          } else {
            spans.push({ start: s.start, end: s.end, shiftIds: [s.id] })
          }
        }
        for (const span of spans) {
          const ss = toMinutes(span.start)
          const se = toMinutes(span.end)
          const fullDay = ss <= opStart && se >= opEnd
          const isOpener =
            needsOpen && ss <= opStart && effectiveCanOpen(employeeStores, stores, employeeId, store.id)
          const comesIn = ss > opStart ? to12Hour(toHHMM24(span.start)) : undefined
          const leaves = se < opEnd ? to12Hour(toHHMM24(span.end)) : undefined
          people.push({
            employeeId,
            name: employeeName.get(employeeId) ?? `#${employeeId}`,
            shiftIds: span.shiftIds,
            start: span.start,
            end: span.end,
            fullDay,
            isOpener,
            note: comesIn || leaves ? { comesIn, leaves } : undefined,
          })
        }
      }
      people.sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || a.name.localeCompare(b.name))

      return { day, people, gaps: gapsByStoreDay.get(`${store.id}:${day}`) ?? [], requirements: dayReqs }
    })

    return { id: store.id, name: store.name, accentClass: ACCENT_CLASSES[i % ACCENT_CLASSES.length], days }
  })

  return { stores: viewStores, totalShort }
}
