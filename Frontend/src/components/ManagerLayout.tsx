import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FruitAvatar } from './FruitAvatar'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StoreProvider, useStore } from '../lib/store-context'

const tab = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
    isActive ? 'bg-ink text-white' : 'bg-paper text-ink'
  }`

export function ManagerLayout() {
  return (
    <StoreProvider>
      <Chrome />
    </StoreProvider>
  )
}

/** Logo, store switcher, nav tabs, logout — inside StoreProvider so the switcher works.
 * On mobile the identity row and the nav strip stack; the nav scrolls sideways. */
function Chrome() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { stores, storeId, setStoreId } = useStore()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    api
      .getChangeRequests('PENDING')
      .then((r) => setPending(r.filter((x) => !(x.openOffer && !x.targetEmployee)).length))
      .catch(() => {})
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex flex-col gap-2 border-b-[3px] border-ink bg-paper px-4 py-2.5 sm:px-8 sm:py-3">
        {/* identity row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FruitAvatar kind="apple" size={28} />
            <span className="font-heading text-lg font-extrabold text-ink sm:text-xl">Fruit Crew</span>
          </div>
          <div className="flex items-center gap-2">
            {stores.length > 0 && (
              <select
                value={storeId ?? ''}
                onChange={(e) => setStoreId(Number(e.target.value))}
                className="max-w-[9rem] rounded-full border-2 border-ink bg-cream px-3 py-1 font-heading text-xs font-bold text-ink outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <NavLink
              to="/account"
              className="hidden font-body text-xs font-semibold text-muted-ink hover:text-ink md:inline"
            >
              {user?.name ?? user?.email}
              {user?.role === 'OWNER' && ' · owner'}
            </NavLink>
            <button
              onClick={() => void logout()}
              className="shrink-0 rounded-full border-2 border-ink bg-paper px-3 py-1 font-heading text-xs font-bold text-ink"
            >
              Log out
            </button>
          </div>
        </div>

        {/* nav strip — scrolls sideways when it doesn't fit */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5">
          {user?.role === 'OWNER' && (
            <NavLink to="/overview" className={tab}>
              Overview
            </NavLink>
          )}
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
          <NavLink to="/my-availability" className={tab}>
            My hours
          </NavLink>
          <NavLink to="/history" className={tab}>
            History
          </NavLink>
          <NavLink to="/account" className={tab}>
            Account
          </NavLink>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
