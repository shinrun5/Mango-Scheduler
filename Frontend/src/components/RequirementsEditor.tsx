import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, DAYS, toHHMM24 } from '../lib/time'
import type { DayOfWeek, RequirementInput, ShiftRequirement } from '../types'

type Friendly = Omit<RequirementInput, 'storeId'>

function toFriendly(r: ShiftRequirement): Friendly {
  return {
    day: r.day,
    start: toHHMM24(r.start),
    end: toHHMM24(r.end),
    peopleNeeded: r.managerRequired + r.seniorRequired + r.regularRequired + r.newRequired,
    seniorsNeeded: r.managerRequired + r.seniorRequired,
    allowNew: r.newRequired > 0,
    needOpen: r.needOpen,
    graceMinutes: r.graceMinutes,
  }
}

const blank = (day: DayOfWeek): Friendly => ({
  day,
  start: '11:30',
  end: '17:00',
  peopleNeeded: 1,
  seniorsNeeded: 0,
  allowNew: false,
  needOpen: false,
  graceMinutes: 0,
})

/** Per-store editor for the demand windows the scheduler solves against. */
export function RequirementsEditor({ storeId, onChange }: { storeId: number; onChange?: () => void }) {
  const [rows, setRows] = useState<ShiftRequirement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function refresh() {
    return api
      .getStoreRequirements(storeId)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load shift needs'))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await refresh()
      onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  if (loading) return <p className="mt-2 font-body text-xs text-muted-ink">Loading…</p>

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3">
      {error && <p className="font-body text-xs font-bold text-coral-dark">{error}</p>}
      {DAYS.map((day) => {
        const dayRows = rows.filter((r) => r.day === day)
        return (
          <div key={day}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-heading text-[11px] font-bold text-ink">{DAY_LABEL[day]}</span>
              <button
                onClick={() => void act(() => api.createRequirement({ storeId, ...blank(day) }))}
                className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-heading text-[10px] font-bold text-ink"
              >
                + Add window
              </button>
            </div>
            {dayRows.length === 0 ? (
              <span className="font-body text-[11px] text-muted-ink">no coverage needed</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {dayRows.map((r) => (
                  <Row
                    key={r.id}
                    initial={toFriendly(r)}
                    onSave={(v) => act(() => api.updateRequirementFull(r.id, v))}
                    onDelete={() => act(() => api.deleteRequirement(r.id))}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Row({
  initial,
  onSave,
  onDelete,
}: {
  initial: Friendly
  onSave: (v: Friendly) => void
  onDelete: () => void
}) {
  const [v, setV] = useState(initial)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)
  const set = (patch: Partial<Friendly>) => setV((x) => ({ ...x, ...patch }))

  const num = 'w-12 rounded-md border-2 border-ink bg-cream px-1 py-0.5 font-body text-xs text-ink outline-none'
  const time = 'rounded-md border-2 border-ink bg-cream px-1 py-0.5 font-body text-xs text-ink outline-none'

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-cream/60 p-1.5">
      <input type="time" step={1800} value={v.start} onChange={(e) => set({ start: e.target.value })} className={time} />
      <span className="font-body text-[11px] text-muted-ink">–</span>
      <input type="time" step={1800} value={v.end} onChange={(e) => set({ end: e.target.value })} className={time} />

      <label className="flex items-center gap-1 font-body text-[10px] font-bold text-muted-ink">
        <input
          type="number"
          min={1}
          max={12}
          value={v.peopleNeeded}
          onChange={(e) => set({ peopleNeeded: Number(e.target.value) })}
          className={num}
        />
        people
      </label>
      <label className="flex items-center gap-1 font-body text-[10px] font-bold text-muted-ink">
        <input
          type="number"
          min={0}
          max={v.peopleNeeded}
          value={v.seniorsNeeded}
          onChange={(e) => set({ seniorsNeeded: Number(e.target.value) })}
          className={num}
        />
        senior+
      </label>
      <label className="flex items-center gap-1 font-body text-[10px] font-bold text-muted-ink">
        <input type="checkbox" checked={v.allowNew} onChange={(e) => set({ allowNew: e.target.checked })} />
        new ok
      </label>
      <label className="flex items-center gap-1 font-body text-[10px] font-bold text-muted-ink">
        <input type="checkbox" checked={v.needOpen} onChange={(e) => set({ needOpen: e.target.checked })} />
        opener
      </label>
      <label className="flex items-center gap-1 font-body text-[10px] font-bold text-muted-ink">
        late ok
        <input
          type="number"
          min={0}
          max={180}
          step={15}
          value={v.graceMinutes}
          onChange={(e) => set({ graceMinutes: Number(e.target.value) })}
          className={num}
        />
        m
      </label>

      <div className="ml-auto flex gap-1.5">
        {dirty && (
          <button
            onClick={() => onSave(v)}
            className="rounded-full border-2 border-ink bg-green px-2 py-0.5 font-heading text-[10px] font-bold text-white"
          >
            Save
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded-full border-2 border-coral px-2 py-0.5 font-heading text-[10px] font-bold text-coral-dark"
        >
          ×
        </button>
      </div>
    </div>
  )
}
