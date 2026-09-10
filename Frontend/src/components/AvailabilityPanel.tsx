import { useCallback, useEffect, useState } from 'react'
import { AvailabilityEditor, type AvailWindow } from './AvailabilityEditor'
import type { DayHours, DayOfWeek } from '../types'
import { TimeOffPanel } from './TimeOffPanel'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import { shiftWeekYMD, thisMondayYMD, toHHMM24, weekRangeLabel } from '../lib/time'

const norm = (ws: { day: AvailWindow['day']; start: string; end: string }[]): AvailWindow[] =>
  ws.map((w) => ({ day: w.day, start: toHHMM24(w.start), end: toHHMM24(w.end) }))

const WEEKS = [0, 1, 2, 3, 4].map((n) => ({
  n,
  ymd: shiftWeekYMD(`${thisMondayYMD()}T00:00:00.000Z`, n),
}))
const NEXT_WEEK = WEEKS[1].ymd

/** The availability screen: your standing weekly hours, or a one-week override.
 * `barClass` is passed straight through to the editor's sticky save bar. */
export function AvailabilityPanel({ barClass }: { barClass: string }) {
  const t = useT()
  const weekLabel = (n: number, ymd: string) => {
    const head = n === 0 ? t('avail.thisWeek') : n === 1 ? t('avail.nextWeek') : t('avail.inNWeeks', { n })
    return `${head} — ${weekRangeLabel(`${ymd}T00:00:00.000Z`)}`
  }
  const [mode, setMode] = useState<'standing' | 'week' | 'timeoff'>('standing')
  const [week, setWeek] = useState(WEEKS[0].ymd)
  const [hasOverride, setHasOverride] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  // the always-visible "next week is finalized" confirmation, independent of the tab
  const [nextConfirmed, setNextConfirmed] = useState<boolean | null>(null)
  const nextRange = weekRangeLabel(`${NEXT_WEEK}T00:00:00.000Z`)

  useEffect(() => {
    let live = true
    api
      .getMyWeekAvailability(NEXT_WEEK)
      .then((r) => live && setNextConfirmed(r.confirmed))
      .catch(() => live && setNextConfirmed(false))
    return () => {
      live = false
    }
  }, [])

  async function confirmNextWeek() {
    setBusy(true)
    try {
      await api.confirmMyWeekAvailability(NEXT_WEEK)
      setNextConfirmed(true)
      if (week === NEXT_WEEK) setConfirmed(true)
    } finally {
      setBusy(false)
    }
  }
  // store hours per weekday — drives the editor's quick-add buttons
  const [hoursByDay, setHoursByDay] = useState<Record<DayOfWeek, DayHours>>()

  useEffect(() => {
    let live = true
    api
      .getMyStoreHours()
      .then((h) => live && setHoursByDay(h.byDay))
      .catch(() => {}) // fall back to the editor's built-in defaults
    return () => {
      live = false
    }
  }, [])

  const standingLoad = useCallback(() => api.getMyAvailability().then(norm), [])
  const standingSave = useCallback((w: AvailWindow[]) => api.saveMyAvailability(w).then(norm), [])

  const weekLoad = useCallback(
    () =>
      api.getMyWeekAvailability(week).then((r) => {
        setHasOverride(r.hasOverride)
        setConfirmed(r.confirmed)
        return r.windows
      }),
    [week],
  )
  const weekSave = useCallback(
    (w: AvailWindow[]) =>
      api.saveMyWeekAvailability(week, w).then((r) => {
        setHasOverride(true)
        setConfirmed(true)
        if (week === NEXT_WEEK) setNextConfirmed(true)
        return r.windows
      }),
    [week],
  )

  async function confirmWeek() {
    setBusy(true)
    try {
      await api.confirmMyWeekAvailability(week)
      setConfirmed(true)
      if (week === NEXT_WEEK) setNextConfirmed(true)
    } finally {
      setBusy(false)
    }
  }

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
      {nextConfirmed !== null && (
        <div
          className={`rounded-xl border-2 px-3 py-2.5 ${
            nextConfirmed ? 'border-green bg-green/10' : 'border-ink bg-paper'
          }`}
        >
          {nextConfirmed ? (
            <p className="font-body text-xs font-bold text-green-dark">
              {t('avail.next.confirmed', { range: nextRange })}
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-body text-xs text-ink">
                {t('avail.next.prompt', { range: nextRange })}
              </span>
              <button
                onClick={() => void confirmNextWeek()}
                disabled={busy}
                className="shrink-0 rounded-full border-2 border-ink bg-green px-3.5 py-1 font-heading text-[11px] font-bold text-white disabled:opacity-50"
              >
                {t('avail.next.confirmBtn')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        <button className={`shrink-0 ${tab(mode === 'standing')}`} onClick={() => setMode('standing')}>
          {t('avail.tab.every')}
        </button>
        <button className={`shrink-0 ${tab(mode === 'week')}`} onClick={() => setMode('week')}>
          {t('avail.tab.week')}
        </button>
        <button className={`shrink-0 ${tab(mode === 'timeoff')}`} onClick={() => setMode('timeoff')}>
          {t('avail.tab.timeoff')}
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
                {weekLabel(w.n, w.ymd)}
              </option>
            ))}
          </select>
          <p className="font-body text-xs text-muted-ink">
            {hasOverride ? t('avail.week.hasOverride') : t('avail.week.fromStanding')}
          </p>
          {hasOverride && (
            <button
              onClick={() => void clearOverride()}
              disabled={busy}
              className="self-start font-body text-xs font-bold text-coral-dark underline"
            >
              {t('avail.week.removeOverride')}
            </button>
          )}
          {!hasOverride &&
            (confirmed ? (
              <p className="font-body text-xs font-bold text-green-dark">
                {t('avail.week.confirmed')}
              </p>
            ) : (
              <button
                onClick={() => void confirmWeek()}
                disabled={busy}
                className="self-start rounded-full border-2 border-ink bg-green px-3 py-1 font-heading text-xs font-bold text-white disabled:opacity-50"
              >
                {t('avail.week.confirmBtn')}
              </button>
            ))}
        </div>
      )}

      {mode === 'timeoff' ? (
        <TimeOffPanel />
      ) : mode === 'standing' ? (
        <AvailabilityEditor
          key="standing"
          barClass={barClass}
          load={standingLoad}
          save={standingSave}
          idleText={t('avail.idle.every')}
          hoursByDay={hoursByDay}
        />
      ) : (
        <AvailabilityEditor
          key={`week-${week}-${reload}`}
          barClass={barClass}
          load={weekLoad}
          save={weekSave}
          idleText={hasOverride ? t('avail.idle.weekSaved') : t('avail.idle.weekCopy')}
          hoursByDay={hoursByDay}
        />
      )}
    </div>
  )
}
