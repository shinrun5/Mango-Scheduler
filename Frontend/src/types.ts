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

export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE'

/** The current account, as returned by /auth/login, /auth/register and /auth/me. */
export interface AuthUser {
  id: number
  email: string
  name: string | null
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
  avatarFruit: string | null
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

/** Friendly shape used by the requirements editor (POST/PUT /shiftrequirements). */
export interface RequirementInput {
  storeId?: number
  day: DayOfWeek
  start: string // "HH:MM"
  end: string
  peopleNeeded: number
  seniorsNeeded: number
  allowNew: boolean
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
  avatarFruit: string | null
  inviteCode: string | null
  account: { email: string } | null
  stores: RosterStoreLink[]
}

export interface Profile {
  id: number
  email: string
  name: string | null
  phone: string | null
  role: Role
  employee: {
    id: number
    name: string
    hourLimit: number
    maxShifts: number
    standby: boolean
    stores: { storeId: number; storeName: string; proficiency: Tier; canOpen: boolean; pin: string }[]
  } | null
}

export type ChangeType = 'DROP' | 'SWAP' | 'PICKUP'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED'

export type TimeOffState = 'upcoming' | 'active' | 'past' | 'cancelled'

export interface TimeOffRequest {
  id: number
  employeeId: number
  employeeName: string | null
  startDate: string // "YYYY-MM-DD"
  endDate: string
  note: string | null
  createdAt: string
  /** derived: cancelled, or where it sits relative to today */
  state: TimeOffState
  /** a manager marked this notice seen */
  acknowledged: boolean
}

export interface ChangeRequest {
  id: number
  type: ChangeType
  status: RequestStatus
  /** true = a SWAP posted to the marketplace (no target until someone claims it) */
  openOffer: boolean
  note: string | null
  createdAt: string
  resolvedAt: string | null
  shift: {
    id: number
    storeId: number
    day: DayOfWeek
    start: string
    end: string
    employeeId: number | null
  }
  requestedBy: { id: number; name: string }
  targetEmployee: { id: number; name: string } | null
}

export interface MyShiftsResponse {
  published: boolean
  publishedAt: string | null
  weekStart: string | null
  shifts: Shift[]
}

export interface SnapshotMeta {
  id: number
  weekStart: string
  label: string | null
  savedAt: string
}

export interface SnapshotShift {
  employeeId: number | null
  employeeName: string | null
  storeId: number
  storeName: string
  day: DayOfWeek
  start: string // "HH:MM"
  end: string
}

export interface SnapshotDetail extends SnapshotMeta {
  savedById: number | null
  shifts: SnapshotShift[]
}

export interface NotificationItem {
  id: number
  kind: 'AVAILABILITY_REMINDER' | 'SCHEDULE_DRAFTED' | 'GENERIC'
  title: string
  body: string | null
  link: string | null
  createdAt: string
  readAt: string | null
}

export interface ManagerRow {
  id: number
  email: string
  role: Role
  storeIds: number[]
  isEmployee: boolean
  isSelf: boolean
}

export interface OverviewStore {
  storeId: number
  name: string
  publishedAt: string | null
  weekStart: string | null
  shiftCount: number
  openShifts: number
  staffHours: number
  requirementCount: number
  gapCount: number
  pendingRequests: number
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
