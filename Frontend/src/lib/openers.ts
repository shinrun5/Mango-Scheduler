import type { DayOfWeek, EmployeeStore, ShiftRequirement, Store } from '../types'

/** Can this person open this store -- either personally flagged, or the store
 * doesn't gate opening at all (Store.requiresOpenerSkill = false). */
export function effectiveCanOpen(
  employeeStores: EmployeeStore[],
  stores: Store[],
  employeeId: number,
  storeId: number,
): boolean {
  const link = employeeStores.find((es) => es.employeeId === employeeId && es.storeId === storeId)
  if (link?.canOpen) return true
  const store = stores.find((s) => s.id === storeId)
  return store ? !store.requiresOpenerSkill : false
}

/** Does this exact window correspond to a requirement that needs an opener present? */
export function windowNeedsOpener(
  requirements: ShiftRequirement[],
  storeId: number,
  day: DayOfWeek,
  start: string,
  end: string,
): boolean {
  return requirements.some((r) => r.needOpen && r.storeId === storeId && r.day === day && r.start === start && r.end === end)
}

/** The late-arrival grace (minutes) for the requirement matching this exact window, else 0. */
export function windowGrace(
  requirements: ShiftRequirement[],
  storeId: number,
  day: DayOfWeek,
  start: string,
  end: string,
): number {
  return (
    requirements.find((r) => r.storeId === storeId && r.day === day && r.start === start && r.end === end)?.graceMinutes ??
    0
  )
}
