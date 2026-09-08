import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { ManagersSection } from '../components/ManagersSection'
import { RequirementsEditor } from '../components/RequirementsEditor'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { EmployeeStore, ShiftRequirement, Store } from '../types'

type StorePatch = { name: string; requiresOpenerSkill: boolean; pairNewWorkers: boolean }

export function Stores() {
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [stores, setStores] = useState<Store[]>([])
  const [links, setLinks] = useState<EmployeeStore[]>([])
  const [reqs, setReqs] = useState<ShiftRequirement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [showNeeds, setShowNeeds] = useState<number | null>(null)

  function refresh() {
    return Promise.all([api.getStores(), api.getEmployeeStores(), api.getShiftRequirements()])
      .then(([s, l, r]) => {
        setStores(s)
        setLinks(l)
        setReqs(r)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load stores'))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const workerCount = (storeId: number) => links.filter((l) => l.storeId === storeId).length
  const reqCount = (storeId: number) => reqs.filter((r) => r.storeId === storeId).length

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      setEditing(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
      <h1 className="font-heading text-lg font-bold text-ink">Stores</h1>
      <p className="mt-1 font-body text-xs text-muted-ink">
        New stores won't be scheduled until they have shift requirements.
      </p>
      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {isOwner && (
        <>
          <AddStore onAdd={(patch) => act(() => api.createStore(patch))} />
          {!loading && stores.length > 0 && (
            <div className="mt-3">
              <ManagersSection stores={stores} />
            </div>
          )}
        </>
      )}

      {loading ? (
        <p className="mt-3 font-body text-sm text-muted-ink">Loading…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {stores.map((s) =>
            editing === s.id ? (
              <EditStore
                key={s.id}
                store={s}
                onSave={(patch) => act(() => api.updateStore(s.id, patch))}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div
                key={s.id}
                className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-heading text-sm font-bold text-ink">{s.name}</span>
                  <span className="font-body text-[11px] text-muted-ink">
                    {workerCount(s.id)} worker{workerCount(s.id) === 1 ? '' : 's'} ·{' '}
                    {s.requiresOpenerSkill ? 'opener skill required' : 'anyone can open'}
                    {s.pairNewWorkers && ' · new workers paired'}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setShowNeeds((v) => (v === s.id ? null : s.id))}
                      className={`rounded-full border-2 border-ink px-2.5 py-0.5 font-heading text-[11px] font-bold ${
                        reqCount(s.id) === 0 ? 'bg-coral-bg text-coral-dark' : 'bg-cream text-ink'
                      }`}
                    >
                      Shift needs ({reqCount(s.id)})
                    </button>
                    <button
                      onClick={() => setEditing(s.id)}
                      className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-heading text-[11px] font-bold text-ink"
                    >
                      Edit
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${s.name}?`)) void act(() => api.deleteStore(s.id))
                        }}
                        className="rounded-full border-2 border-coral px-2.5 py-0.5 font-heading text-[11px] font-bold text-coral-dark"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {showNeeds === s.id && (
                  <RequirementsEditor storeId={s.id} onChange={() => void refresh()} />
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

const checkboxRow =
  'flex items-center gap-1.5 font-body text-[11px] font-bold text-muted-ink'

function AddStore({ onAdd }: { onAdd: (patch: StorePatch) => void }) {
  const [name, setName] = useState('')
  const [requiresOpenerSkill, setRequiresOpenerSkill] = useState(true)
  const [pairNewWorkers, setPairNewWorkers] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), requiresOpenerSkill, pairNewWorkers })
    setName('')
    setRequiresOpenerSkill(true)
    setPairNewWorkers(false)
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New store name"
        className="rounded-lg border-2 border-ink bg-cream px-2 py-1 font-body text-xs text-ink outline-none"
      />
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={requiresOpenerSkill}
          onChange={(e) => setRequiresOpenerSkill(e.target.checked)}
        />
        Opening needs a trained opener
      </label>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={pairNewWorkers}
          onChange={(e) => setPairNewWorkers(e.target.checked)}
        />
        New workers can't work solo
      </label>
      <Button type="submit" disabled={!name.trim()}>
        Add store
      </Button>
    </form>
  )
}

function EditStore({
  store,
  onSave,
  onCancel,
}: {
  store: Store
  onSave: (patch: StorePatch) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(store.name)
  const [requiresOpenerSkill, setRequiresOpenerSkill] = useState(store.requiresOpenerSkill)
  const [pairNewWorkers, setPairNewWorkers] = useState(store.pairNewWorkers)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border-2 border-ink bg-cream px-2 py-1 font-body text-xs text-ink outline-none"
      />
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={requiresOpenerSkill}
          onChange={(e) => setRequiresOpenerSkill(e.target.checked)}
        />
        Opener skill required
      </label>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={pairNewWorkers}
          onChange={(e) => setPairNewWorkers(e.target.checked)}
        />
        New workers can't work solo
      </label>
      <div className="ml-auto flex gap-2">
        <button
          onClick={() =>
            name.trim() && onSave({ name: name.trim(), requiresOpenerSkill, pairNewWorkers })
          }
          className="rounded-full border-2 border-ink bg-green px-3 py-0.5 font-heading text-[11px] font-bold text-white"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border-2 border-ink bg-cream px-3 py-0.5 font-heading text-[11px] font-bold text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
