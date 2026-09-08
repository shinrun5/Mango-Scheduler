import { useCallback, useState } from 'react'
import { AvailabilityEditor, type AvailWindow } from './AvailabilityEditor'
import { api } from '../lib/api'
import { shiftWeekYMD, thisMondayYMD, toHHMM24, weekRangeLabel } from '../lib/time'

const norm = (ws: { day: AvailWindow['day']; start: string; end: string }[]): AvailWindow[] =>
  ws.map((w) => ({ day: w.day, start: toHHMM24(w.start), end: toHHMM24(w.end) }))

const WEEKS = [0, 1, 2, 3, 4].map((n) => {
  const ymd = shiftWeekYMD(`${thisMondayYMD()}T00:00:00.000Z`, n)
  const label = n === 0 ? 'This week' : n === 1 ? 'Next week' : `In ${n} weeks`
  return { ymd, label: `${label} — ${weekRangeLabel(`${ymd}T00:00:00.000Z`)}` }
})

/** The availability screen: your standing weekly hours, or a one-week override.
 * `barClass` is passed straight through to the editor's sticky save bar. */
export function AvailabilityPanel({ barClass }: { barClass: string }) {
  const [mode, setMode] = useState<'standing' | 'week'>('standing')
  const [week, setWeek] = useState(WEEKS[0].ymd)
  const [hasOverride, setHasOverride] = useState(false)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)

  const standingLoad = useCallback(() => api.getMyAvailability().then(norm), [])
  const standingSave = useCallback((w: AvailWindow[]) => api.saveMyAvailability(w).then(norm), [])

  const weekLoad = useCallback(
    () =>
      api.getMyWeekAvailability(week).then((r) => {
        setHasOverride(r.hasOverride)
        return r.windows
      }),
    [week],
  )
  const weekSave = useCallback(
    (w: AvailWindow[]) =>
      api.saveMyWeekAvailability(week, w).then((r) => {
        setHasOverride(true)
        return r.windows
      }),
    [week],
  )

  async function clearOverride() {
    setBusy(true)
    try {
      await api.clearMyWeekAvailability(week)
      setHasOverride(false)
      setReload((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  const tab = (active: boolean) =>
    `rounded-full border-2 border-ink px-3 py-1 font-heading text-xs font-bold ${
      active ? 'bg-ink text-white' : 'bg-paper text-ink'
    }`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button className={tab(mode === 'standing')} onClick={() => setMode('standing')}>
          Every week
        </button>
        <button className={tab(mode === 'week')} onClick={() => setMode('week')}>
          Just one week
        </button>
      </div>

      {mode === 'week' && (
        <div className="flex flex-col gap-1.5">
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="w-full rounded-xl border-[2.5px] border-ink bg-cream px-3 py-2 font-body text-sm font-bold text-ink outline-none"
          >
            {WEEKS.map((w) => (
              <option key={w.ymd} value={w.ymd}>
                {w.label}
              </option>
            ))}
          </select>
          <p className="font-body text-xs text-muted-ink">
            {hasOverride
              ? 'This week has its own hours — your standing hours apply every other week.'
              : 'Starts from your standing hours. Saving here only changes this one week.'}
          </p>
          {hasOverride && (
            <button
              onClick={() => void clearOverride()}
              disabled={busy}
              className="self-start font-body text-xs font-bold text-coral-dark underline"
            >
              Remove this week's override
            </button>
          )}
        </div>
      )}

      {mode === 'standing' ? (
        <AvailabilityEditor
          key="standing"
          barClass={barClass}
          load={standingLoad}
          save={standingSave}
          idleText="Saved — repeats every week"
        />
      ) : (
        <AvailabilityEditor
          key={`week-${week}-${reload}`}
          barClass={barClass}
          load={weekLoad}
          save={weekSave}
          idleText={hasOverride ? 'Saved — this week only' : 'Copy of your standing hours — not saved yet'}
        />
      )}
    </div>
  )
}
