import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { homePathForRole } from '../lib/roles'
import type { Role } from '../types'

/** Guards its child routes: bounces to /login when signed out, and to the user's
 * own home when their role doesn't match `role`. */
export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-body text-muted-ink">Loading…</div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (role && user.role !== role) return <Navigate to={homePathForRole(user.role)} replace />
  return <Outlet />
}
