import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { DAY_LABEL, DAYS, to12Hour, toHHMM24 } from '../lib/time'
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

  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="font-heading text-lg font-bold text-ink">My Availability</h1>
        <p className="mt-1 mb-4 font-body text-sm text-muted-ink">
          The hours you can work each week. Your manager's schedule is built from this.
        </p>

        {!linked ? (
          <p className="font-body text-sm text-coral-dark">
            Your account isn't linked to an employee record yet — ask your manager to sort that out.
          </p>
        ) : loading ? (
          <p className="font-body text-sm text-muted-ink">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {DAYS.map((day) => {
              const dayRows = rows.filter((r) => r.day === day)
              return (
                <div
                  key={day}
                  className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-heading text-sm font-bold text-ink">{DAY_LABEL[day]}</span>
                    <button
                      onClick={() => addRow(day)}
                      className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
                    >
                      + Add hours
                    </button>
                  </div>

                  {dayRows.length === 0 ? (
                    <span className="font-body text-xs text-muted-ink">Not available</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {dayRows.map((r) => {
                        const bad = invalidKeys.has(r.key)
                        return (
                          <div key={r.key} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={r.start}
                              step={1800}
                              onChange={(e) => patchRow(r.key, { start: e.target.value })}
                              className={`rounded-lg border-2 bg-cream px-2 py-1 font-body text-xs text-ink outline-none ${
                                bad ? 'border-coral' : 'border-ink'
                              }`}
                            />
                            <span className="font-body text-xs text-muted-ink">to</span>
                            <input
                              type="time"
                              value={r.end}
                              step={1800}
                              onChange={(e) => patchRow(r.key, { end: e.target.value })}
                              className={`rounded-lg border-2 bg-cream px-2 py-1 font-body text-xs text-ink outline-none ${
                                bad ? 'border-coral' : 'border-ink'
                              }`}
                            />
                            {bad && (
                              <span className="font-body text-[11px] font-bold text-coral-dark">
                                end must be after start
                              </span>
                            )}
                            <button
                              onClick={() => removeRow(r.key)}
                              aria-label="Remove"
                              className="ml-auto rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-heading text-xs font-bold text-ink"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {linked && !loading && (
        <div className="sticky bottom-0 flex items-center justify-between border-t-[3px] border-ink bg-paper px-6 py-3">
          <span className="font-body text-xs font-semibold text-muted-ink">
            {error ? (
              <span className="text-coral-dark">{error}</span>
            ) : invalidKeys.size > 0 ? (
              <span className="text-coral-dark">Fix the highlighted times</span>
            ) : dirty ? (
              'Unsaved changes'
            ) : justSaved ? (
              'Saved ✓'
            ) : (
              'All changes saved'
            )}
          </span>
          <Button onClick={() => void save()} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </>
  )
}
