import type { Role } from '../types'

/** Where a logged-in user of this role belongs by default. */
export function homePathForRole(role: Role): string {
  return role === 'EMPLOYEE' ? '/my-shifts' : '/schedule'
}
