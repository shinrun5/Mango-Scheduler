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

// Dev requests hit the Vite proxy (see vite.config.ts) and land on the Express
// backend at localhost:3000; no base URL needed since paths match 1:1.

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function sendJSON<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? `${method} ${path} -> ${res.status}`)
  return data as T
}

export const api = {
  getStores: () => getJSON<Store[]>('/stores'),
  getEmployees: () => getJSON<Employee[]>('/employees'),
  getEmployeeStores: () => getJSON<EmployeeStore[]>('/employeeStores'),
  getShifts: () => getJSON<Shift[]>('/shifts'),
  getShiftRequirements: () => getJSON<ShiftRequirement[]>('/shiftrequirements'),
  getAvailability: () => getJSON<RecurringAvailability[]>('/availability'),

  generateSchedule: (solveSeconds = 5) =>
    sendJSON<GenerateScheduleResult>('/schedule/generate', 'POST', { solveSeconds }),

  /** Reassign and/or shorten/extend an existing shift row (undefined fields are left alone). */
  updateShift: (shiftId: number, patch: { employeeId?: number; start?: string; end?: string }) =>
    sendJSON<Shift>(`/shifts/${shiftId}`, 'PUT', patch),

  /** Manually fill an open slot, or hand off the tail of a split shift, with a new row. */
  createShift: (input: { employeeId: number; storeId: number; day: DayOfWeek; start: string; end: string }) =>
    sendJSON<Shift>('/shifts', 'POST', input),

  /** Take someone off a shift entirely (may leave the slot short). */
  async deleteShift(shiftId: number): Promise<void> {
    const res = await fetch(`/shifts/${shiftId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE /shifts/${shiftId} -> ${res.status}`)
  },

  /** Change how many people a slot needs (holidays, etc.). */
  updateRequirement: (
    id: number,
    patch: Partial<{
      managerRequired: number
      seniorRequired: number
      regularRequired: number
      newRequired: number
      needOpen: boolean
    }>,
  ) => sendJSON<ShiftRequirement>(`/shiftrequirements/${id}`, 'PUT', patch),
}
