import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FruitAvatar } from './FruitAvatar'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
    isActive ? 'bg-ink text-white' : 'bg-paper text-ink'
  }`

/** Shared chrome for the manager pages: logo, nav tabs, logout. */
export function ManagerLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [pending, setPending] = useState(0)

  // refresh the pending-requests badge on every navigation
  useEffect(() => {
    api
      .getChangeRequests('PENDING')
      .then((r) => setPending(r.length))
      .catch(() => {})
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink bg-paper px-8 py-3.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <FruitAvatar kind="apple" size={30} />
            <span className="font-heading text-xl font-extrabold text-ink">Fruit Crew</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/schedule" className={tab}>
              Schedule
            </NavLink>
            <NavLink to="/workers" className={tab}>
              Workers
            </NavLink>
            <NavLink to="/requests" className={tab}>
              Requests{pending > 0 ? ` (${pending})` : ''}
            </NavLink>
            <NavLink to="/stores" className={tab}>
              Stores
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-body text-xs font-semibold text-muted-ink sm:inline">
            {user?.email}
          </span>
          <button
            onClick={() => void logout()}
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-heading text-xs font-bold text-ink"
          >
            Log out
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
