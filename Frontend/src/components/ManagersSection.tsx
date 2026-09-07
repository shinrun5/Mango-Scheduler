import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './Button'
import { api } from '../lib/api'
import type { ManagerRow, Store } from '../types'

/** Owner-only: manage the people who run the company — other owners and managers. */
export function ManagersSection({ stores }: { stores: Store[] }) {
  const [people, setPeople] = useState<ManagerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<null | 'manager' | 'owner'>(null)
  const [busy, setBusy] = useState<number | null>(null)

  function refresh() {
    return api
      .getTeam()
      .then(setPeople)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the team'))
  }
  useEffect(() => {
    refresh()
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`
  const owners = people.filter((p) => p.role === 'OWNER')
  const soleOwner = owners.length <= 1
  const ordered = [...people].sort((a, b) =>
    a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'OWNER' ? -1 : 1,
  )

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
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading text-sm font-bold text-ink">Team</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setAdding((v) => (v === 'manager' ? null : 'manager'))}
            className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
          >
            {adding === 'manager' ? 'Cancel' : '+ Manager'}
          </button>
          <button
            onClick={() => setAdding((v) => (v === 'owner' ? null : 'owner'))}
            className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
          >
            {adding === 'owner' ? 'Cancel' : '+ Owner'}
          </button>
        </div>
      </div>
      {error && <p className="mt-1 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {adding === 'manager' && (
        <AddManager
          stores={stores}
          onCreate={(input) => act(null, () => api.createManager(input)).then(() => setAdding(null))}
        />
      )}
      {adding === 'owner' && (
        <AddOwner onCreate={(input) => act(null, () => api.createOwner(input)).then(() => setAdding(null))} />
      )}

      <div className="mt-2 flex flex-col gap-2">
        {ordered.map((p) => {
          const lockRole = p.isSelf || (p.role === 'OWNER' && soleOwner)
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-2">
              <span className="font-body text-xs font-bold text-ink">{p.email}</span>
              <span
                className={`rounded-full border px-1.5 py-px font-body text-[9px] font-bold ${
                  p.role === 'OWNER'
                    ? 'border-grape/50 text-grape'
                    : 'border-ink/25 text-muted-ink'
                }`}
              >
                {p.role.toLowerCase()}
              </span>
              {p.isSelf && (
                <span className="font-body text-[10px] font-bold text-muted-ink">you</span>
              )}
              {p.isEmployee && (
                <span className="rounded-full border border-ink/25 px-1.5 py-px font-body text-[9px] font-bold text-muted-ink">
                  also works here
                </span>
              )}

              {p.role === 'MANAGER' && (
                <div className="flex flex-wrap gap-1">
                  {stores.map((s) => {
                    const on = p.storeIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        disabled={busy === p.id}
                        onClick={() =>
                          act(p.id, () =>
                            api.setManagerStores(
                              p.id,
                              on ? p.storeIds.filter((x) => x !== s.id) : [...p.storeIds, s.id],
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
              )}

              <div className="ml-auto flex gap-1.5">
                {!lockRole && p.role === 'MANAGER' && (
                  <button
                    disabled={busy === p.id}
                    onClick={() => void act(p.id, () => api.setPersonRole(p.id, 'OWNER'))}
                    className="rounded-full border-2 border-grape/60 px-2 py-0.5 font-heading text-[10px] font-bold text-grape"
                  >
                    Make owner
                  </button>
                )}
                {!lockRole && p.role === 'OWNER' && (
                  <button
                    disabled={busy === p.id}
                    onClick={() => {
                      if (window.confirm(`Make ${p.email} a manager instead of an owner?`))
                        void act(p.id, () => api.setPersonRole(p.id, 'MANAGER'))
                    }}
                    className="rounded-full border-2 border-ink/40 px-2 py-0.5 font-heading text-[10px] font-bold text-muted-ink"
                  >
                    Make manager
                  </button>
                )}
                {!p.isSelf && !(p.role === 'OWNER' && soleOwner) && (
                  <button
                    disabled={busy === p.id}
                    onClick={() => {
                      if (window.confirm(`Remove ${p.email}'s login?`))
                        void act(p.id, () => api.removePerson(p.id))
                    }}
                    className="rounded-full border-2 border-coral px-2 py-0.5 font-heading text-[10px] font-bold text-coral-dark"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
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

function AddOwner({
  onCreate,
}: {
  onCreate: (input: { email: string; password: string }) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || password.length < 8) return
    onCreate({ email: email.trim(), password })
  }

  const field = 'rounded-lg border-2 border-ink bg-cream px-2 py-1 font-body text-xs text-ink outline-none'

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 border-t border-ink/10 pt-2">
      <input
        type="email"
        required
        placeholder="owner@email"
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
      <span className="font-body text-[10px] text-muted-ink">Owners see every store.</span>
      <Button type="submit" disabled={!email.trim() || password.length < 8}>
        Create
      </Button>
    </form>
  )
}
