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

/** Raw 24h "HH:MM" -> compact "h:mma" / "h:mmp" (half the width of to12Hour). */
export function to12HourCompact(hhmm24: string): string {
  const [h24 = 0, m = 0] = hhmm24.split(':').map(Number)
  const period = h24 < 12 ? 'a' : 'p'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')}${period}`
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

/** Compact form for tight columns, e.g. "11:30a–10:30p". */
export function timeRangeCompact(startIso: string, endIso: string): string {
  return `${to12HourCompact(toHHMM24(startIso))}–${to12HourCompact(toHHMM24(endIso))}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The date of day `dayIndex` (0 = Mon) within the week starting at `weekStartIso`, as "Sep 8". */
export function dayDate(weekStartIso: string, dayIndex: number): string {
  const d = new Date(weekStartIso)
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "Sep 8 – Sep 14" for a week starting at `weekStartIso`. */
export function weekRangeLabel(weekStartIso: string): string {
  return `${dayDate(weekStartIso, 0)} – ${dayDate(weekStartIso, 6)}`
}

/** `weekStartIso` shifted by whole weeks, as "YYYY-MM-DD" (for PUT /schedule/week). */
export function shiftWeekYMD(weekStartIso: string, deltaWeeks: number): string {
  const d = new Date(weekStartIso)
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7)
  return d.toISOString().slice(0, 10)
}

/** For real timestamps (not the 1970 wall-clock values): "just now", "5m ago",
 * "3h ago", then a short date. */
export function relativeTime(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
