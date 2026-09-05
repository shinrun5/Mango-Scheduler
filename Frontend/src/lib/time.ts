export const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export const DAY_LABEL: Record<(typeof DAYS)[number], string> = {
  MONDAY: 'MON',
  TUESDAY: 'TUE',
  WEDNESDAY: 'WED',
  THURSDAY: 'THU',
  FRIDAY: 'FRI',
  SATURDAY: 'SAT',
  SUNDAY: 'SUN',
}

// DateTime columns hold a wall-clock time; read the clock face in UTC
// (matches Backend/src/routes/schedule.ts's toHHMM). Raw 24h "HH:MM" -- this is the
// format <input type="time"> and the split-time comparisons need; for display use hhmm().
export function toHHMM24(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** Raw 24h "HH:MM" -> "h:mm AM/PM" for display. */
export function to12Hour(hhmm24: string): string {
  const [h24 = 0, m = 0] = hhmm24.split(':').map(Number)
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** "HH:MM" 24h <-> minutes-since-midnight. */
export function clockToMin(hhmm24: string): number {
  const [h = 0, m = 0] = hhmm24.split(':').map(Number)
  return h * 60 + m
}

export function minToClock(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Display form of a shift's wall-clock time, e.g. "5:00 PM". */
export function hhmm(iso: string): string {
  return to12Hour(toHHMM24(iso))
}

export function toMinutes(iso: string): number {
  const d = new Date(iso)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** Same date, new wall-clock time (for splitting a shift at an arbitrary point). */
export function withTime(iso: string, hhmmValue: string): string {
  const d = new Date(iso)
  const [h, m] = hhmmValue.split(':').map(Number)
  d.setUTCHours(h, m, 0, 0)
  return d.toISOString()
}

export function windowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd)
}

export function timeRange(startIso: string, endIso: string): string {
  return `${hhmm(startIso)}–${hhmm(endIso)}`
}
