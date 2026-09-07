import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FruitAvatar } from './FruitAvatar'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StoreProvider, useStore } from '../lib/store-context'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
    isActive ? 'bg-ink text-white' : 'bg-paper text-ink'
  }`

export function ManagerLayout() {
  return (
    <StoreProvider>
      <Chrome />
    </StoreProvider>
  )
}

/** Logo, store switcher, nav tabs, logout — inside StoreProvider so the switcher works. */
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[3px] border-ink bg-paper px-8 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <FruitAvatar kind="apple" size={30} />
            <span className="font-heading text-xl font-extrabold text-ink">Fruit Crew</span>
          </div>
          {stores.length > 0 && (
            <select
              value={storeId ?? ''}
              onChange={(e) => setStoreId(Number(e.target.value))}
              className="rounded-full border-2 border-ink bg-cream px-3 py-1 font-heading text-xs font-bold text-ink outline-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap items-center gap-2">
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
            <NavLink to="/history" className={tab}>
              History
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-body text-xs font-semibold text-muted-ink sm:inline">
            {user?.email}
            {user?.role === 'OWNER' && ' · owner'}
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
