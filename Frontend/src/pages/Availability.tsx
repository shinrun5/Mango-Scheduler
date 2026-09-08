import { AvailabilityPanel } from '../components/AvailabilityPanel'
import { useAuth } from '../lib/auth'

export function Availability() {
  const { user } = useAuth()
  const linked = user?.employeeId != null

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-40 sm:p-6 sm:pb-24">
      <h1 className="font-heading text-lg font-bold text-ink">My Availability</h1>
      <p className="mt-0.5 mb-4 font-body text-sm text-muted-ink">
        Your standing weekly hours — set once, repeats every week. Use “Just one week” for a
        temporary change (extra class, time off) that only applies to that week.
      </p>

      {linked ? (
        <AvailabilityPanel barClass="bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:bottom-0" />
      ) : (
        <p className="font-body text-sm text-coral-dark">
          Your account isn't linked to an employee record yet — ask your manager to sort that out.
        </p>
      )}
    </div>
  )
}
