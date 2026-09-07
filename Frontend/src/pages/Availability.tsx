import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { DAY_LABEL, DAYS, toHHMM24 } from '../lib/time'
import type { DayOfWeek } from '../types'

interface Row {
  key: string
  day: DayOfWeek
  start: string // "HH:MM"
  end: string
}

const newKey = () => Math.random().toString(36).slice(2)

/** normalized, comparable snapshot of the current windows */
function signature(rows: Row[]): string {
  return JSON.stringify(
    rows
      .map((r) => `${r.day} ${r.start} ${r.end}`)
      .sort(),
  )
}

export function Availability() {
  const { user } = useAuth()
  const linked = user?.employeeId != null

  const [rows, setRows] = useState<Row[]>([])
  const [savedSig, setSavedSig] = useState('[]')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!linked) {
      setLoading(false)
      return
    }
    api
      .getMyAvailability()
      .then((windows) => {
        const loaded = windows.map<Row>((w) => ({
          key: newKey(),
          day: w.day,
          start: toHHMM24(w.start),
          end: toHHMM24(w.end),
        }))
        setRows(loaded)
        setSavedSig(signature(loaded))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your availability'))
      .finally(() => setLoading(false))
  }, [linked])

  const invalidKeys = useMemo(
    () => new Set(rows.filter((r) => r.start >= r.end).map((r) => r.key)),
    [rows],
  )
  const dirty = signature(rows) !== savedSig
  const canSave = dirty && invalidKeys.size === 0 && !saving

  function addRow(day: DayOfWeek) {
    setRows((rs) => [...rs, { key: newKey(), day, start: '17:00', end: '22:00' }])
    setJustSaved(false)
  }
  function patchRow(key: string, patch: Partial<Pick<Row, 'start' | 'end'>>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setJustSaved(false)
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
    setJustSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const windows = rows.map((r) => ({ day: r.day, start: r.start, end: r.end }))
      const saved = await api.saveMyAvailability(windows)
      const fresh = saved.map<Row>((w) => ({
        key: newKey(),
        day: w.day,
        start: toHHMM24(w.start),
        end: toHHMM24(w.end),
      }))
      setRows(fresh)
      setSavedSig(signature(fresh))
      setJustSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const status = error
    ? { text: error, tone: 'text-coral-dark' }
    : invalidKeys.size > 0
      ? { text: 'Fix the highlighted times', tone: 'text-coral-dark' }
      : dirty
        ? { text: 'Unsaved changes', tone: 'text-ink' }
        : justSaved
          ? { text: 'Saved ✓', tone: 'text-green-dark' }
          : { text: 'All changes saved', tone: 'text-muted-ink' }
  // hide the button entirely when there's nothing to do — keeps the bar calm
  const showSave = dirty || saving || invalidKeys.size > 0

  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-40 sm:p-6 sm:pb-24">
        <h1 className="font-heading text-lg font-bold text-ink">My Availability</h1>
        <p className="mt-0.5 mb-4 font-body text-sm text-muted-ink">
          The hours you can work each week — your schedule is built from this.
        </p>

        {!linked ? (
          <p className="font-body text-sm text-coral-dark">
            Your account isn't linked to an employee record yet — ask your manager to sort that out.
          </p>
        ) : loading ? (
          <p className="font-body text-sm text-muted-ink">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {DAYS.map((day) => {
              const dayRows = rows.filter((r) => r.day === day)

              if (dayRows.length === 0) {
                return (
                  <button
                    key={day}
                    onClick={() => addRow(day)}
                    className="flex items-center justify-between rounded-xl border-2 border-ink/20 bg-paper/70 px-3.5 py-2.5 text-left active:bg-paper"
                  >
                    <span className="font-heading text-sm font-bold text-muted-ink">{DAY_LABEL[day]}</span>
                    <span className="font-body text-xs font-bold text-sky-dark">+ Add hours</span>
                  </button>
                )
              }

              return (
                <div
                  key={day}
                  className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-heading text-sm font-bold text-ink">{DAY_LABEL[day]}</span>
                    <button
                      onClick={() => addRow(day)}
                      className="rounded-full border-2 border-ink bg-cream px-2.5 py-1 font-heading text-[11px] font-bold text-ink"
                    >
                      + Add hours
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {dayRows.map((r) => {
                      const bad = invalidKeys.has(r.key)
                      return (
                        <div key={r.key} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={r.start}
                              step={1800}
                              onChange={(e) => patchRow(r.key, { start: e.target.value })}
                              className={`min-w-0 flex-1 rounded-lg border-2 bg-cream px-2 py-1.5 font-body text-sm text-ink outline-none ${
                                bad ? 'border-coral' : 'border-ink'
                              }`}
                            />
                            <span className="shrink-0 font-body text-xs text-muted-ink">–</span>
                            <input
                              type="time"
                              value={r.end}
                              step={1800}
                              onChange={(e) => patchRow(r.key, { end: e.target.value })}
                              className={`min-w-0 flex-1 rounded-lg border-2 bg-cream px-2 py-1.5 font-body text-sm text-ink outline-none ${
                                bad ? 'border-coral' : 'border-ink'
                              }`}
                            />
                            <button
                              onClick={() => removeRow(r.key)}
                              aria-label="Remove these hours"
                              className="shrink-0 rounded-full border-2 border-ink bg-cream px-2.5 py-1 font-heading text-sm font-bold leading-none text-ink"
                            >
                              ×
                            </button>
                          </div>
                          {bad && (
                            <span className="font-body text-[11px] font-bold text-coral-dark">
                              End must be after start
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {linked && !loading && (
        <div
          className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t-[3px] border-ink px-4 py-2.5 transition-colors sm:bottom-0 sm:px-6 ${
            dirty || invalidKeys.size > 0 || error ? 'bg-coral-bg' : 'bg-paper'
          } ${showSave ? 'justify-between' : 'justify-center'}`}
        >
          <span className={`font-body text-xs font-bold ${status.tone}`}>{status.text}</span>
          {showSave && (
            <Button onClick={() => void save()} disabled={!canSave} className="shrink-0">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
