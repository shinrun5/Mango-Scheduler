import { NavLink, Outlet } from 'react-router-dom'
import { FruitAvatar } from './FruitAvatar'
import { useAuth } from '../lib/auth'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
    isActive ? 'bg-ink text-white' : 'bg-paper text-ink'
  }`

/** Shared chrome for the employee pages: top bar with nav tabs + logout. */
export function EmployeeLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink bg-paper px-8 py-4.5">
        <div className="flex items-center gap-2.5">
          <FruitAvatar kind="apple" size={32} />
          <span className="font-heading text-[22px] font-extrabold text-ink">Fruit Crew</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/my-shifts" className={tab}>
            My Shifts
          </NavLink>
          <NavLink to="/availability" className={tab}>
            My Availability
          </NavLink>
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
