import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { StarBadgeIcon } from '../components/icons'
import { api } from '../lib/api'
import type { RosterWorker, Store, Tier } from '../types'

const TIERS: Tier[] = ['NEW', 'REGULAR', 'SENIOR', 'MANAGER']

export function Workers() {
  const [workers, setWorkers] = useState<RosterWorker[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  function refresh() {
    return Promise.all([api.getRoster(), api.getStores()])
      .then(([w, s]) => {
        setWorkers(w)
        setStores(s)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load workers'))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`

  async function invite(id: number) {
    try {
      await api.inviteWorker(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create an invite')
    }
  }

  async function remove(w: RosterWorker) {
    if (!window.confirm(`Remove ${w.name}? Their shifts this week become open slots.`)) return
    try {
      await api.deleteWorker(w.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove worker')
    }
  }

  function copy(id: number, code: string) {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(id)
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
      },
      () => {},
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-lg font-bold text-ink">Workers</h1>
        <Button onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : '+ Add worker'}</Button>
      </div>

      {error && <p className="mb-3 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {adding && (
        <AddWorkerForm
          stores={stores}
          onDone={async () => {
            setAdding(false)
            await refresh()
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <p className="font-body text-sm text-muted-ink">Loading…</p>
      ) : workers.length === 0 ? (
        <p className="font-body text-sm text-muted-ink">No workers yet — add one above.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {workers.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-bold text-ink">{w.name}</span>
                    {w.standby && (
                      <span className="rounded-full border border-ink/25 px-1.5 py-px font-body text-[9px] font-bold text-muted-ink">
                        on-call
                      </span>
                    )}
                  </div>
                  <span className="font-body text-[11px] text-muted-ink">
                    {w.hourLimit}h/wk · up to {w.maxShifts} days
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {w.stores.length === 0 && (
                      <span className="font-body text-[11px] text-coral-dark">no store assigned</span>
                    )}
                    {w.stores.map((s) => (
                      <span
                        key={s.storeId}
                        className="flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2 py-0.5 font-body text-[10px] font-bold text-ink"
                      >
                        {storeName(s.storeId)} · {s.proficiency}
                        {s.canOpen && <StarBadgeIcon size={10} />}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => void remove(w)}
                  className="shrink-0 rounded-full border-2 border-coral px-2.5 py-0.5 font-heading text-[11px] font-bold text-coral-dark"
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 border-t border-ink/10 pt-2 font-body text-[11px]">
                {w.account ? (
                  <span className="font-bold text-green">✓ signed up · {w.account.email}</span>
                ) : w.inviteCode ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-ink">Invite code</span>
                    <code className="rounded bg-cream px-1.5 py-0.5 font-bold text-ink">{w.inviteCode}</code>
                    <button
                      onClick={() => copy(w.id, w.inviteCode!)}
                      className="font-bold text-ink underline"
                    >
                      {copied === w.id ? 'copied!' : 'copy'}
                    </button>
                    <span className="text-muted-ink">— hasn't signed up yet</span>
                  </span>
                ) : (
                  <button
                    onClick={() => void invite(w.id)}
                    className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading font-bold text-ink"
                  >
                    Send invite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddWorkerForm({
  stores,
  onDone,
  onError,
}: {
  stores: Store[]
  onDone: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [hourLimit, setHourLimit] = useState(30)
  const [maxShifts, setMaxShifts] = useState(5)
  const [storeId, setStoreId] = useState<number | ''>(stores[0]?.id ?? '')
  const [proficiency, setProficiency] = useState<Tier>('REGULAR')
  const [canOpen, setCanOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.createWorker({
        name: name.trim(),
        hourLimit,
        maxShifts,
        store: storeId === '' ? undefined : { storeId, proficiency, canOpen },
      })
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add worker')
    } finally {
      setBusy(false)
    }
  }

  const field = 'rounded-lg border-2 border-ink bg-cream px-2 py-1 font-body text-xs text-ink outline-none'

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
    >
      <label className="flex flex-col gap-1">
        <span className="font-body text-[10px] font-bold text-muted-ink">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-[10px] font-bold text-muted-ink">Hours/wk</span>
        <input
          type="number"
          min={1}
          max={80}
          value={hourLimit}
          onChange={(e) => setHourLimit(Number(e.target.value))}
          className={`${field} w-20`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-[10px] font-bold text-muted-ink">Max days</span>
        <input
          type="number"
          min={1}
          max={7}
          value={maxShifts}
          onChange={(e) => setMaxShifts(Number(e.target.value))}
          className={`${field} w-16`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-[10px] font-bold text-muted-ink">Store</span>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value === '' ? '' : Number(e.target.value))}
          className={field}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-[10px] font-bold text-muted-ink">Tier</span>
        <select
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value as Tier)}
          className={field}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 pb-1.5">
        <input type="checkbox" checked={canOpen} onChange={(e) => setCanOpen(e.target.checked)} />
        <span className="font-body text-[11px] font-bold text-muted-ink">Can open</span>
      </label>
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? 'Adding…' : 'Add'}
      </Button>
    </form>
  )
}
