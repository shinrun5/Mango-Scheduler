import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store-context'
import { DAY_LABEL, DAYS, dayDate, relativeTime, to12Hour, weekRangeLabel } from '../lib/time'
import type { SnapshotDetail, SnapshotMeta } from '../types'

export function History() {
  const { storeId } = useStore()
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [workingWeek, setWorkingWeek] = useState<string | null>(null)
  const [selected, setSelected] = useState<SnapshotDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  function refresh() {
    if (storeId == null) return Promise.resolve()
    return Promise.all([api.getSnapshots(storeId), api.getScheduleStatus(storeId)])
      .then(([snaps, status]) => {
        setSnapshots(snaps)
        setWorkingWeek(status.weekStart)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load history'))
  }

  useEffect(() => {
    if (storeId == null) return
    refresh().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // a week the manager has moved past is frozen — no restoring it over the live one
  const isLocked = (weekStart: string) =>
    workingWeek != null && weekStart.slice(0, 10) < workingWeek.slice(0, 10)

  async function open(id: number) {
    setError(null)
    try {
      setSelected(await api.getSnapshot(storeId!, id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that schedule')
    }
  }

  async function restore(id: number) {
    if (!window.confirm('Replace the current working schedule with this one? It will be un-posted so you can review it.')) return
    setBusy(true)
    setError(null)
    try {
      const { restored } = await api.restoreSnapshot(storeId!, id)
      window.alert(`Restored ${restored} shifts. Review it on the Schedule tab, then re-post.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore')
    } finally {
      setBusy(false)
    }
  }

  async function del(id: number) {
    if (!window.confirm('Delete this saved schedule?')) return
    try {
      await api.deleteSnapshot(storeId!, id)
      if (selected?.id === id) setSelected(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
      <h1 className="font-heading text-lg font-bold text-ink">History</h1>
      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {loading ? (
        <p className="mt-3 font-body text-sm text-muted-ink">Loading…</p>
      ) : snapshots.length === 0 ? (
        <p className="mt-3 font-body text-sm text-muted-ink">
          No saved schedules yet — use “Save to history” on the Schedule tab. Regenerating also
          auto-saves the current one.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-bold text-ink">
                  Week of {weekRangeLabel(s.weekStart)}
                </span>
                {s.label && (
                  <span className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-body text-[10px] font-bold text-ink">
                    {s.label}
                  </span>
                )}
                {isLocked(s.weekStart) && (
                  <span className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-body text-[10px] font-bold text-ink">
                    🔒 locked
                  </span>
                )}
                <span className="ml-auto font-body text-[10px] text-muted-ink">
                  saved {relativeTime(s.savedAt)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => (selected?.id === s.id ? setSelected(null) : void open(s.id))}
                  className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
                >
                  {selected?.id === s.id ? 'Hide' : 'View'}
                </button>
                {!isLocked(s.weekStart) && (
                  <button
                    disabled={busy}
                    onClick={() => void restore(s.id)}
                    className="rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-heading text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
                <button
                  onClick={() => void del(s.id)}
                  className="rounded-full border-2 border-coral px-2.5 py-0.5 font-heading text-[11px] font-bold text-coral-dark"
                >
                  Delete
                </button>
              </div>

              {selected?.id === s.id && <SnapshotView snap={selected} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SnapshotView({ snap }: { snap: SnapshotDetail }) {
  const stores = [...new Set(snap.shifts.map((s) => s.storeName))].sort()

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3">
      {stores.map((store) => (
        <div key={store}>
          <p className="font-heading text-xs font-bold text-ink">{store}</p>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {DAYS.map((day, i) => {
              const rows = snap.shifts
                .filter((s) => s.storeName === store && s.day === day)
                .sort((a, b) => a.start.localeCompare(b.start))
              if (rows.length === 0) return null
              return (
                <div key={day}>
                  <p className="font-body text-[10px] font-bold text-muted-ink">
                    {DAY_LABEL[day]} {dayDate(snap.weekStart, i)}
                  </p>
                  {rows.map((r, j) => (
                    <p key={j} className="font-body text-[11px] text-ink">
                      {r.employeeName ?? '(open)'}{' '}
                      <span className="text-muted-ink">
                        {to12Hour(r.start)}–{to12Hour(r.end)}
                      </span>
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
