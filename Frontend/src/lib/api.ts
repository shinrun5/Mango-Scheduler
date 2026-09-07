import type {
  AuthUser,
  ChangeRequest,
  ChangeType,
  DayOfWeek,
  Employee,
  EmployeeStore,
  GenerateScheduleResult,
  MyShiftsResponse,
  Profile,
  RecurringAvailability,
  RosterWorker,
  Session,
  Shift,
  Tier,
  ShiftRequirement,
  Store,
} from '../types'
import { getSession, setSession } from './session'

// Every backend route is under /api (see Backend/src/index.ts). In dev the Vite
// proxy forwards /api to localhost:3000; in prod it's the same origin.
const BASE = '/api'

/** Thrown when a request needs a valid session and refreshing it failed. The
 * router listens for this to bounce the user to /login. */
export class AuthError extends Error {
  constructor(message = 'Your session has expired') {
    super(message)
    this.name = 'AuthError'
  }
}

// one in-flight refresh at a time; concurrent 401s all await the same promise
let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const session = getSession()
  if (!session?.refresh_token) return false
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json()
        if (!data?.session) return false
        setSession(data.session as Session)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

async function request<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const session = getSession()
  const hadToken = Boolean(session?.access_token)
  const headers = new Headers(init.headers)
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401 && hadToken) {
    if (allowRetry && (await tryRefresh())) return request<T>(path, init, false)
    setSession(null)
    // let the app (AuthProvider) drop the user so the router bounces to /login
    window.dispatchEvent(new Event('auth:expired'))
    throw new AuthError()
  }

  const isJSON = res.headers.get('content-type')?.includes('application/json')
  const data = isJSON ? await res.json() : null
  if (!res.ok) throw new Error(data?.error ?? `${init.method ?? 'GET'} ${path} -> ${res.status}`)
  return data as T
}

function getJSON<T>(path: string): Promise<T> {
  return request<T>(path)
}

function sendJSON<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export const api = {
  // --- auth ---
  login: async (email: string, password: string): Promise<AuthUser> => {
    setSession(null)
    const data = await sendJSON<{ user: AuthUser; session: Session }>('/auth/login', 'POST', { email, password })
    setSession(data.session)
    return data.user
  },
  register: async (email: string, password: string, inviteCode: string): Promise<AuthUser> => {
    setSession(null)
    const data = await sendJSON<{ user: AuthUser; session: Session }>('/auth/register', 'POST', {
      email,
      password,
      inviteCode,
    })
    setSession(data.session)
    return data.user
  },
  me: () => getJSON<{ user: AuthUser }>('/auth/me').then((d) => d.user),
  getProfile: () => getJSON<Profile>('/auth/profile'),
  changePassword: (currentPassword: string, newPassword: string) =>
    sendJSON<{ ok: true }>('/auth/change-password', 'POST', { currentPassword, newPassword }),

  // --- shift-change requests ---
  getOpenShifts: () => getJSON<Shift[]>('/shifts/open'),
  getSwapTargets: (shiftId: number) =>
    getJSON<{ id: number; name: string }[]>(`/change-requests/swap-targets?shiftId=${shiftId}`),
  getMyChangeRequests: () => getJSON<ChangeRequest[]>('/change-requests/mine'),
  createChangeRequest: (input: {
    type: ChangeType
    shiftId: number
    targetEmployeeId?: number
    note?: string
  }) => sendJSON<ChangeRequest>('/change-requests', 'POST', input),
  cancelChangeRequest: (id: number) => sendJSON<ChangeRequest>(`/change-requests/${id}/cancel`, 'POST', {}),
  getChangeRequests: (status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED') =>
    getJSON<ChangeRequest[]>(`/change-requests${status ? `?status=${status}` : ''}`),
  approveChangeRequest: (id: number) => sendJSON<ChangeRequest>(`/change-requests/${id}/approve`, 'POST', {}),
  denyChangeRequest: (id: number) => sendJSON<ChangeRequest>(`/change-requests/${id}/deny`, 'POST', {}),
  logout: async () => {
    try {
      await sendJSON('/auth/logout', 'POST', {})
    } catch {
      // best-effort; we clear locally regardless
    }
    setSession(null)
  },

  // --- schedule board ---
  getStores: () => getJSON<Store[]>('/stores'),
  createStore: (input: { name: string; requiresOpenerSkill?: boolean }) =>
    sendJSON<Store>('/stores', 'POST', input),
  updateStore: (id: number, patch: { name: string; requiresOpenerSkill?: boolean }) =>
    sendJSON<Store>(`/stores/${id}`, 'PUT', patch),
  deleteStore: (id: number) => request<{ message: string }>(`/stores/${id}`, { method: 'DELETE' }),
  getEmployees: () => getJSON<Employee[]>('/employees'),
  getEmployeeStores: () => getJSON<EmployeeStore[]>('/employeeStores'),
  getShifts: () => getJSON<Shift[]>('/shifts'),
  getShiftRequirements: () => getJSON<ShiftRequirement[]>('/shiftrequirements'),
  getAvailability: () => getJSON<RecurringAvailability[]>('/availability'),

  // --- manager: workers ---
  getRoster: () => getJSON<RosterWorker[]>('/employees/roster'),
  createWorker: (input: {
    name: string
    hourLimit: number
    maxShifts: number
    standby?: boolean
    store?: { storeId: number; proficiency: Tier; canOpen?: boolean; primary?: boolean }
  }) => sendJSON<RosterWorker>('/employees', 'POST', input),
  updateWorker: (id: number, patch: { name: string; hourLimit: number; maxShifts: number; standby?: boolean }) =>
    sendJSON<RosterWorker>(`/employees/${id}`, 'PUT', patch),
  deleteWorker: (id: number) =>
    request<{ message: string; accountLeftUnlinked: string | null }>(`/employees/${id}`, { method: 'DELETE' }),
  inviteWorker: (id: number) =>
    sendJSON<{ employeeId: number; inviteCode: string }>(`/employees/${id}/invite`, 'POST', {}),

  // --- employee self-service ---
  getMyAvailability: () => getJSON<RecurringAvailability[]>('/availability/mine'),
  /** Replace the signed-in employee's whole week. start/end are "HH:MM". */
  saveMyAvailability: (windows: { day: DayOfWeek; start: string; end: string }[]) =>
    sendJSON<RecurringAvailability[]>('/availability/mine', 'PUT', { windows }),

  generateSchedule: (solveSeconds = 5) =>
    sendJSON<GenerateScheduleResult>('/schedule/generate', 'POST', { solveSeconds }),

  // --- publish state ---
  getScheduleStatus: () => getJSON<{ publishedAt: string | null }>('/schedule/status'),
  publishSchedule: () => sendJSON<{ publishedAt: string | null }>('/schedule/publish', 'POST', {}),
  unpublishSchedule: () => sendJSON<{ publishedAt: string | null }>('/schedule/unpublish', 'POST', {}),
  getMyShifts: () => getJSON<MyShiftsResponse>('/shifts/mine'),

  /** Reassign and/or shorten/extend an existing shift row (undefined fields are left alone). */
  updateShift: (shiftId: number, patch: { employeeId?: number; start?: string; end?: string }) =>
    sendJSON<Shift>(`/shifts/${shiftId}`, 'PUT', patch),

  /** Manually fill an open slot, or hand off the tail of a split shift, with a new row. */
  createShift: (input: { employeeId: number; storeId: number; day: DayOfWeek; start: string; end: string }) =>
    sendJSON<Shift>('/shifts', 'POST', input),

  /** Take someone off a shift entirely (may leave the slot short). */
  deleteShift: (shiftId: number) => request<void>(`/shifts/${shiftId}`, { method: 'DELETE' }),

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
