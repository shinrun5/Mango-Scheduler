import { FruitAvatar } from '../components/FruitAvatar'
import { useAuth } from '../lib/auth'

export function Availability() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex items-center justify-between border-b-[3px] border-ink bg-paper px-8 py-4.5">
        <div className="flex items-center gap-2.5">
          <FruitAvatar kind="apple" size={32} />
          <span className="font-heading text-[22px] font-extrabold text-ink">Fruit Crew</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-xs font-semibold text-muted-ink">{user?.email}</span>
          <button
            onClick={() => void logout()}
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-heading text-xs font-bold text-ink"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-8">
        <h1 className="font-heading text-lg font-bold text-ink">My Availability</h1>
        <p className="max-w-md font-body text-sm text-muted-ink">
          This is where you'll set the hours you can work each week. Coming next — for now your
          account is linked and ready (employee #{user?.employeeId ?? '—'}).
        </p>
      </div>
    </div>
  )
}
