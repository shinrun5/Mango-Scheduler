import { useEffect, useMemo, useState } from 'react'
import { Button } from './Button'
import { api } from '../lib/api'
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
  return JSON.stringify(rows.map((r) => `${r.day} ${r.start} ${r.end}`).sort())
}

/** The standing weekly-availability editor for whoever is signed in
 * (uses /availability/mine). Set once — it repeats every week. The caller must
 * already be linked to an employee record. `barClass` positions the sticky save
 * bar: employees sit above the bottom tab bar, managers at the edge. */
export function AvailabilityEditor({ barClass }: { barClass: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [savedSig, setSavedSig] = useState('[]')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
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
  }, [])

  const invalidKeys = useMemo(
    () => new Set(rows.filter((r) => r.start >= r.end).map((r) => r.key)),
    [rows],
  )
  const dirty = signature(rows) !== savedSig
  const canSave = dirty && invalidKeys.size === 0 && !saving

  function addRow(day: DayOfWeek) {
    const prev = rows.filter((r) => r.day === day).at(-1)
    const start = prev ? prev.end : '17:00'
    const [h] = start.split(':').map(Number)
    const end = `${String(Math.min((h ?? 17) + 4, 23)).padStart(2, '0')}:00`
    setRows((rs) => [...rs, { key: newKey(), day, start, end: end > start ? end : '23:00' }])
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
          : { text: 'Saved — repeats every week', tone: 'text-muted-ink' }
  const showSave = dirty || saving || invalidKeys.size > 0

  const timeInput =
    'w-[7.5rem] shrink-0 rounded-lg border-2 bg-cream px-2 py-1 font-body text-sm text-ink outline-none'

  if (loading) return <p className="font-body text-sm text-muted-ink">Loading…</p>

  return (
    <>
      <div className="overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
        {DAYS.map((day) => {
          const dayRows = rows.filter((r) => r.day === day)
          return (
            <div
              key={day}
              className="flex gap-3 border-b-2 border-ink/10 px-3 py-2.5 last:border-b-0"
            >
              <span className="w-9 shrink-0 pt-1.5 font-heading text-sm font-bold text-ink">
                {DAY_LABEL[day]}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-1.5">
                {dayRows.length === 0 && (
                  <span className="pt-1.5 font-body text-xs text-muted-ink">Not available</span>
                )}
                {dayRows.map((r) => {
                  const bad = invalidKeys.has(r.key)
                  return (
                    <span key={r.key} className="flex items-center gap-1">
                      <input
                        type="time"
                        value={r.start}
                        step={1800}
                        onChange={(e) => patchRow(r.key, { start: e.target.value })}
                        className={`${timeInput} ${bad ? 'border-coral' : 'border-ink'}`}
                      />
                      <span className="font-body text-xs text-muted-ink">–</span>
                      <input
                        type="time"
                        value={r.end}
                        step={1800}
                        onChange={(e) => patchRow(r.key, { end: e.target.value })}
                        className={`${timeInput} ${bad ? 'border-coral' : 'border-ink'}`}
                      />
                      <button
                        onClick={() => removeRow(r.key)}
                        aria-label="Remove"
                        className="ml-0.5 rounded-full px-1.5 font-heading text-base font-bold leading-none text-muted-ink hover:text-coral-dark"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                <button
                  onClick={() => addRow(day)}
                  className="mt-0.5 rounded-full border-2 border-ink/30 px-2.5 py-1 font-heading text-[11px] font-bold text-sky-dark hover:border-ink"
                >
                  + hours
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className={`fixed inset-x-0 z-20 flex items-center gap-3 border-t-[3px] border-ink px-4 py-2.5 transition-colors sm:px-6 ${barClass} ${
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
    </>
  )
}
