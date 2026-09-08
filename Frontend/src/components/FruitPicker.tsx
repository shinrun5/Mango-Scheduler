import { useEffect, useState } from 'react'
import { FruitAvatar } from './FruitAvatar'
import { api } from '../lib/api'
import { FRUITS } from '../lib/fruit'

/** Pick your avatar fruit. Each fruit is one-per-store, so anything a coworker
 * already claimed is locked. Passing nothing = keep the auto-assigned default. */
export function FruitPicker({ onChange }: { onChange?: (fruit: string | null) => void }) {
  const [mine, setMine] = useState<string | null>(null)
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getMyFruit()
      .then((r) => {
        setMine(r.mine)
        setTaken(new Set(r.taken))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load fruits'))
      .finally(() => setLoading(false))
  }, [])

  async function pick(fruit: string | null) {
    if (saving) return
    setSaving(fruit ?? 'default')
    setError(null)
    try {
      const r = await api.setMyFruit(fruit)
      setMine(r.fruit)
      onChange?.(r.fruit)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <p className="font-body text-sm text-muted-ink">Loading…</p>

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-heading text-sm font-bold text-ink">Your fruit</span>
        {mine && (
          <button
            onClick={() => void pick(null)}
            className="font-body text-[11px] font-bold text-muted-ink underline"
          >
            use default
          </button>
        )}
      </div>
      <p className="mt-0.5 font-body text-xs text-muted-ink">
        One per store — greyed-out ones are already taken by a coworker.
      </p>
      {error && <p className="mt-1 font-body text-xs font-bold text-coral-dark">{error}</p>}

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {FRUITS.map((f) => {
          const isMine = f === mine
          const locked = !isMine && taken.has(f)
          return (
            <button
              key={f}
              type="button"
              disabled={locked || saving !== null}
              title={locked ? `${f} — taken` : f}
              onClick={() => void pick(f)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 transition-colors ${
                isMine
                  ? 'border-ink bg-cream shadow-[2px_2px_0_var(--color-ink)]'
                  : locked
                    ? 'border-ink/15 opacity-30'
                    : 'border-ink/20 hover:bg-cream'
              }`}
            >
              <FruitAvatar kind={f} size={30} />
              <span className="font-body text-[10px] font-bold capitalize leading-none text-ink">
                {f}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
