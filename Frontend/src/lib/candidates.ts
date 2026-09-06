import type { DayOfWeek, Employee, EmployeeStore, RecurringAvailability, Shift, Tier } from '../types'
import { toMinutes, windowsOverlap } from './time'

// Same idea as scheduler_real.py's escalation_candidates(): who could plausibly
// cover this window, ranked drop-ins (full coverage) before partial ones.
const TIER_RANK: Record<Tier, number> = { NEW: 0, REGULAR: 1, SENIOR: 2, MANAGER: 3 }

export interface Candidate {
  employeeId: number
  name: string
  tier: Tier
  canOpen: boolean
  coversFull: boolean
  standby: boolean
  /** false = no stated availability overlapping this window (only surfaced in override mode) */
  available: boolean
}

export function computeCandidates(args: {
  storeId: number
  day: DayOfWeek
  start: string
  end: string
  /** Already in this slot (or the person being replaced) — never offered as an alternate. */
  excludeEmployeeIds: Set<number>
  employees: Employee[]
  employeeStores: EmployeeStore[]
  availability: RecurringAvailability[]
  shifts: Shift[]
  /** This window's only opener is being removed and nobody else staying behind can
   * open -- restrict candidates to people who (effectively) can. */
  requireOpener?: boolean
  /** Needed to interpret requireOpener correctly: if the store doesn't gate opening
   * at all, everyone qualifies regardless of their personal canOpen flag. */
  storeRequiresOpenerSkill?: boolean
  /** Availability may begin this many minutes after `start` and still fully cover
   * (matches the requirement's grace; night shifts allow a late arrival). */
  graceMinutes?: number
  /** Last-minute override: include people whose stated availability doesn't cover this
   * window (still excludes double-booked). Their `available` flag is false. */
  ignoreAvailability?: boolean
}): Candidate[] {
  const { storeId, day, start, end, excludeEmployeeIds, employees, employeeStores, availability, shifts } = args
  const grace = args.graceMinutes ?? 0
  const lo = toMinutes(start)
  const hi = toMinutes(end)

  const linkByEmployee = new Map(
    employeeStores.filter((es) => es.storeId === storeId).map((es) => [es.employeeId, es]),
  )

  const out: Candidate[] = []
  for (const emp of employees) {
    if (excludeEmployeeIds.has(emp.id)) continue
    const link = linkByEmployee.get(emp.id)
    if (!link) continue // not eligible at this store at all
    if (args.requireOpener && !(link.canOpen || !args.storeRequiresOpenerSkill)) continue

    const windows = availability.filter((a) => a.employeeId === emp.id && a.day === day)
    let coversFull = false
    let coversAny = false
    for (const w of windows) {
      const a = toMinutes(w.start)
      const b = toMinutes(w.end)
      if (a <= lo + grace && b >= hi) coversFull = true
      if (windowsOverlap(a, b, lo, hi)) coversAny = true
    }
    // the normal list only offers people who can cover the WHOLE window; someone who
    // merely overlaps it (e.g. a night-only person vs a morning shift) shows up only
    // under "add someone not free", tagged partial
    if (!coversFull && !args.ignoreAvailability) continue

    // already committed to an overlapping shift elsewhere (or here) that day?
    const busy = shifts.some(
      (s) => s.employeeId === emp.id && s.day === day && windowsOverlap(toMinutes(s.start), toMinutes(s.end), lo, hi),
    )
    if (busy) continue

    out.push({
      employeeId: emp.id,
      name: emp.name,
      tier: link.proficiency,
      canOpen: link.canOpen,
      coversFull,
      standby: emp.standby,
      available: coversAny,
    })
  }

  // available first, then on-call last; full coverage before partial; senior first
  out.sort(
    (a, b) =>
      Number(b.available) - Number(a.available) ||
      Number(a.standby) - Number(b.standby) ||
      Number(b.coversFull) - Number(a.coversFull) ||
      TIER_RANK[b.tier] - TIER_RANK[a.tier],
  )
  return out
}
