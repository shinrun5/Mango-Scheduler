import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './Button'
import { api } from '../lib/api'
import type { ManagerRow, Store } from '../types'

/** Owner-only: create manager logins and pick which stores each one runs. */
export function ManagersSection({ stores }: { stores: Store[] }) {
  const [managers, setManagers] = useState<ManagerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  function refresh() {
    return api
      .getManagers()
      .then(setManagers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load managers'))
  }
  useEffect(() => {
    refresh()
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`

  async function act(id: number | null, fn: () => Promise<unknown>) {
    setBusy(id ?? -1)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm font-bold text-ink">Managers</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
        >
          {adding ? 'Cancel' : '+ Add manager'}
        </button>
      </div>
      {error && <p className="mt-1 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {adding && (
        <AddManager
          stores={stores}
          onCreate={(input) =>
            act(null, () => api.createManager(input)).then(() => setAdding(false))
          }
        />
      )}

      <div className="mt-2 flex flex-col gap-2">
        {managers.length === 0 && !adding && (
          <span className="font-body text-xs text-muted-ink">
            No managers yet — you're running every store.
          </span>
        )}
        {managers.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-2">
            <span className="font-body text-xs font-bold text-ink">{m.email}</span>
            {m.isEmployee && (
              <span className="rounded-full border border-ink/25 px-1.5 py-px font-body text-[9px] font-bold text-muted-ink">
                also an employee
              </span>
            )}
            <div className="flex flex-wrap gap-1">
              {stores.map((s) => {
                const on = m.storeIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    disabled={busy === m.id}
                    onClick={() =>
                      act(m.id, () =>
                        api.setManagerStores(
                          m.id,
                          on ? m.storeIds.filter((x) => x !== s.id) : [...m.storeIds, s.id],
                        ),
                      )
                    }
                    className={`rounded-full border-2 px-2 py-0.5 font-heading text-[10px] font-bold ${
                      on ? 'border-ink bg-ink text-white' : 'border-ink/30 text-muted-ink'
                    }`}
                  >
                    {storeName(s.id)}
                  </button>
                )
              })}
            </div>
            <button
              disabled={busy === m.id}
              onClick={() => {
                if (window.confirm(`Remove ${m.email}'s manager login?`))
                  void act(m.id, () => api.deleteManager(m.id))
              }}
              className="ml-auto rounded-full border-2 border-coral px-2 py-0.5 font-heading text-[10px] font-bold text-coral-dark"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddManager({
  stores,
  onCreate,
}: {
  stores: Store[]
  onCreate: (input: { email: string; password: string; storeIds: number[] }) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [picked, setPicked] = useState<number[]>([])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || password.length < 8) return
    onCreate({ email: email.trim(), password, storeIds: picked })
  }

  const field = 'rounded-lg border-2 border-ink bg-cream px-2 py-1 font-body text-xs text-ink outline-none'

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 border-t border-ink/10 pt-2">
      <input
        type="email"
        required
        placeholder="manager@email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={field}
      />
      <input
        type="password"
        required
        placeholder="temp password (8+)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
      />
      <div className="flex flex-wrap gap-1">
        {stores.map((s) => {
          const on = picked.includes(s.id)
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              className={`rounded-full border-2 px-2 py-0.5 font-heading text-[10px] font-bold ${
                on ? 'border-ink bg-ink text-white' : 'border-ink/30 text-muted-ink'
              }`}
            >
              {s.name}
            </button>
          )
        })}
      </div>
      <Button type="submit" disabled={!email.trim() || password.length < 8}>
        Create
      </Button>
    </form>
  )
}
