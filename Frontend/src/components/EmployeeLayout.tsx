import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarIcon, ClockIcon, SwapIcon, UserIcon } from './icons'
import { FruitAvatar } from './FruitAvatar'
import { NotificationBell } from './NotificationBell'
import { useAuth } from '../lib/auth'

const NAV = [
  { to: '/my-shifts', label: 'Shifts', Icon: CalendarIcon },
  { to: '/marketplace', label: 'Market', Icon: SwapIcon },
  { to: '/availability', label: 'Availability', Icon: ClockIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
]

const topTab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
    isActive ? 'bg-ink text-white' : 'bg-paper text-ink'
  }`

const bottomTab = ({ isActive }: { isActive: boolean }) =>
  `relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 font-heading text-[11px] font-bold transition-colors ${
    isActive ? 'text-ink' : 'text-muted-ink'
  }`

/** Employee chrome: nav pills in the top bar on desktop, a bottom tab bar on phones. */
export function EmployeeLayout(): ReactNode {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b-[3px] border-ink bg-paper px-4 py-2.5 sm:px-8 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <FruitAvatar kind="apple" size={28} />
          <span className="font-heading text-lg font-extrabold text-ink sm:text-xl">Fruit Crew</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={topTab}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <NavLink
            to="/profile"
            className="hidden font-body text-xs font-semibold text-muted-ink hover:text-ink md:inline"
          >
            {user?.name ?? user?.email}
          </NavLink>
          <NotificationBell />
          <button
            onClick={() => void logout()}
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-heading text-xs font-bold text-ink"
          >
            Log out
          </button>
        </div>
      </div>

      {/* pages add pb-24 sm:pb-6 so the fixed bottom bar never covers content */}
      <Outlet />

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t-[3px] border-ink bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={bottomTab}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-1/2 top-1 h-1 w-7 -translate-x-1/2 rounded-full bg-green transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon size={22} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
