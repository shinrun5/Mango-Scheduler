import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, relativeTime, timeRange } from '../lib/time'
import type { ChangeRequest, Store } from '../types'

const STATUS_STYLE: Record<ChangeRequest['status'], string> = {
  PENDING: 'border-orange bg-orange/10 text-ink',
  APPROVED: 'border-green bg-green/10 text-green',
  DENIED: 'border-coral bg-coral-bg text-coral-dark',
  CANCELLED: 'border-ink/25 text-muted-ink',
}

export function Requests() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  function refresh() {
    return Promise.all([api.getChangeRequests(), api.getStores()])
      .then(([r, s]) => {
        setRequests(r)
        setStores(s)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load requests'))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`

  async function resolve(id: number, approve: boolean) {
    setBusy(id)
    setError(null)
    try {
      await (approve ? api.approveChangeRequest(id) : api.denyChangeRequest(id))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve the request')
    } finally {
      setBusy(null)
    }
  }

  const sorted = [...requests].sort(
    (a, b) =>
      (a.status === 'PENDING' ? 0 : 1) - (b.status === 'PENDING' ? 0 : 1) || b.id - a.id,
  )

  function sentence(r: ChangeRequest) {
    const who = r.requestedBy.name
    if (r.type === 'DROP') return `${who} wants to drop`
    if (r.type === 'PICKUP') return `${who} wants to pick up`
    return `${who} wants to give this to ${r.targetEmployee?.name ?? '—'}`
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="font-heading text-lg font-bold text-ink">Requests</h1>
      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      {loading ? (
        <p className="mt-3 font-body text-sm text-muted-ink">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="mt-3 font-body text-sm text-muted-ink">No shift-change requests.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {sorted.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-sm font-bold text-ink">{sentence(r)}</span>
                <span
                  className={`rounded-full border px-1.5 py-px font-body text-[10px] font-bold ${STATUS_STYLE[r.status]}`}
                >
                  {r.status.toLowerCase()}
                </span>
                <span className="ml-auto font-body text-[10px] text-muted-ink">
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 font-body text-xs text-muted-ink">
                {DAY_LABEL[r.shift.day]} · {timeRange(r.shift.start, r.shift.end)} · {storeName(r.shift.storeId)}
              </p>
              {r.note && <p className="mt-1 font-body text-xs italic text-ink">“{r.note}”</p>}

              {r.status === 'PENDING' && (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, true)}
                    className="rounded-full border-2 border-ink bg-green px-3 py-0.5 font-heading text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, false)}
                    className="rounded-full border-2 border-coral px-3 py-0.5 font-heading text-[11px] font-bold text-coral-dark disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
