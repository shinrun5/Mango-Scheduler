import { useState } from 'react'
import { AvailabilityPanel } from '../components/AvailabilityPanel'
import { Button } from '../components/Button'
import { FruitPicker } from '../components/FruitPicker'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

/** A manager/owner's own availability. They aren't schedulable until they opt in
 * (creates an employee record for them at every store they run). */
export function MyAvailability() {
  const { user, refreshUser } = useAuth()
  const linked = user?.employeeId != null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function optIn() {
    setBusy(true)
    setError(null)
    try {
      await api.becomeWorker()
      await refreshUser()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add you to the schedule')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:p-6">
      <h1 className="font-heading text-lg font-bold text-ink">My Availability</h1>
      <p className="mt-0.5 mb-4 font-body text-xs text-muted-ink sm:text-sm">
        Your standing weekly hours — set once, repeats every week. Use “Just one week” for a
        temporary change that only applies to that week.
      </p>

      {linked ? (
        <>
          <div className="mb-4 rounded-2xl border-[2.5px] border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]">
            <FruitPicker />
          </div>
          <AvailabilityPanel barClass="bottom-4" />
        </>
      ) : (
        <div className="rounded-2xl border-[2.5px] border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]">
          <p className="font-body text-sm text-ink">
            You're not in the schedule yet. Add yourself as a worker to pick up shifts at the
            stores you run.
          </p>
          {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}
          <Button onClick={() => void optIn()} disabled={busy} className="mt-3">
            {busy ? 'Adding…' : 'Add me to the schedule'}
          </Button>
        </div>
      )}
    </div>
  )
}
