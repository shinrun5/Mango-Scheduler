// Mirrors Backend/prisma/schema.prisma. Kept hand-written (no generated client on
// this side) since the frontend only ever talks to the REST API, never Prisma directly.

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type Tier = 'NEW' | 'REGULAR' | 'SENIOR' | 'MANAGER'

export type Role = 'MANAGER' | 'EMPLOYEE'

/** The current account, as returned by /auth/login, /auth/register and /auth/me. */
export interface AuthUser {
  id: number
  email: string
  role: Role
  employeeId: number | null
}

/** Supabase token pair from /auth/login and /auth/register. */
export interface Session {
  access_token: string
  refresh_token: string
  expires_at?: number
}

export interface Store {
  id: number
  name: string
  requiresOpenerSkill: boolean
}

export interface Employee {
  id: number
  name: string
  hourLimit: number
  maxShifts: number
  standby: boolean
}

export interface EmployeeStore {
  employeeId: number
  storeId: number
  pin: string
  proficiency: Tier
  canOpen: boolean
  primary: boolean
}

export interface Shift {
  id: number
  employeeId: number | null
  storeId: number
  day: DayOfWeek
  start: string // ISO datetime string; only the wall-clock time (UTC) matters
  end: string
}

export interface RecurringAvailability {
  id: number
  employeeId: number
  day: DayOfWeek
  start: string
  end: string
}

export interface ShiftRequirement {
  id: number
  storeId: number
  day: DayOfWeek
  start: string
  end: string
  managerRequired: number
  seniorRequired: number
  regularRequired: number
  newRequired: number
  needOpen: boolean
  graceMinutes: number
}

export interface ScheduleGap {
  requirementId: number
  kind: 'head' | 'senior' | 'open'
  shortBy: number
}

export interface RosterStoreLink {
  storeId: number
  proficiency: Tier
  canOpen: boolean
  primary: boolean
  pin: string
}

/** A worker as shown on the manager's Workers screen (GET /employees/roster). */
export interface RosterWorker {
  id: number
  name: string
  hourLimit: number
  maxShifts: number
  standby: boolean
  inviteCode: string | null
  account: { email: string } | null
  stores: RosterStoreLink[]
}

export interface MyShiftsResponse {
  published: boolean
  publishedAt: string | null
  shifts: Shift[]
}

export interface GenerateScheduleResult {
  created: number
  optimal: boolean
  objective: number | null
  unfilled: number
  spread: number | null
  shiftsPerEmployee: Record<string, number>
  gaps: ScheduleGap[]
}
