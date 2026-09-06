import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, DAYS, relativeTime, timeRange } from '../lib/time'
import type { MyShiftsResponse, Store } from '../types'

export function MyShifts() {
  const [data, setData] = useState<MyShiftsResponse | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getMyShifts(), api.getStores()])
      .then(([d, s]) => {
        setData(d)
        setStores(s)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your shifts'))
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`

  if (error) return <div className="p-8 font-body text-sm text-coral-dark">{error}</div>
  if (!data) return <div className="p-8 font-body text-sm text-muted-ink">Loading…</div>

  if (!data.published) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
        <p className="mt-2 font-body text-sm text-muted-ink">
          This week's schedule isn't posted yet — check back soon.
        </p>
      </div>
    )
  }

  const byDay = DAYS.map((day) => ({
    day,
    shifts: data.shifts
      .filter((s) => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((d) => d.shifts.length > 0)

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-lg font-bold text-ink">My Shifts</h1>
        {data.publishedAt && (
          <span className="font-body text-xs text-muted-ink">posted {relativeTime(data.publishedAt)}</span>
        )}
      </div>

      {byDay.length === 0 ? (
        <p className="mt-2 font-body text-sm text-muted-ink">You're not on the schedule this week.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {byDay.map(({ day, shifts }) => (
            <div
              key={day}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <span className="font-heading text-sm font-bold text-ink">{DAY_LABEL[day]}</span>
              <div className="mt-1.5 flex flex-col gap-1">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="font-body text-xs font-bold text-ink">{storeName(s.storeId)}</span>
                    <span className="font-body text-xs text-muted-ink">{timeRange(s.start, s.end)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
