import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABEL, DAYS, dayDate, timeRange } from '../lib/time'
import type { ChangeRequest, Store } from '../types'

export function Marketplace() {
  const [data, setData] = useState<{
    available: ChangeRequest[]
    claimed: ChangeRequest[]
    posted: ChangeRequest[]
  } | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const refresh = useCallback(
    () =>
      Promise.all([api.getMarketplace(), api.getStores(), api.getMyShifts().catch(() => null)]).then(
        ([m, s, mine]) => {
          setData(m)
          setStores(s)
          setWeekStart(mine?.weekStart ?? null)
        },
      ),
    [],
  )

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Could not load the marketplace'))
  }, [refresh])

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `Store ${id}`
  const when = (r: ChangeRequest) => {
    const d = weekStart ? `${dayDate(weekStart, DAYS.indexOf(r.shift.day))} · ` : ''
    return `${DAY_LABEL[r.shift.day]} ${d}${timeRange(r.shift.start, r.shift.end)} · ${storeName(r.shift.storeId)}`
  }

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusy(id)
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

  if (error && !data) return <div className="p-6 font-body text-sm text-coral-dark">{error}</div>
  if (!data) return <div className="p-6 font-body text-sm text-muted-ink">Loading…</div>

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6 pb-24 sm:pb-6">
      <h1 className="font-heading text-lg font-bold text-ink">Marketplace</h1>
      <p className="mt-1 font-body text-sm text-muted-ink">
        Shifts your coworkers can't work. Claim one and your manager confirms it.
      </p>
      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}

      <Section title="Up for grabs">
        {data.available.length === 0 ? (
          <Empty>Nothing on the board right now.</Empty>
        ) : (
          data.available.map((r) => (
            <Card key={r.id}>
              <Line>{when(r)}</Line>
              <Sub>offered by {r.requestedBy.name}</Sub>
              {r.note && <Note>“{r.note}”</Note>}
              <button
                disabled={busy === r.id}
                onClick={() => void act(r.id, () => api.claimOffer(r.id))}
                className="mt-2 self-start rounded-full border-2 border-ink bg-green px-3 py-0.5 font-heading text-[11px] font-bold text-white disabled:opacity-50"
              >
                Claim
              </button>
            </Card>
          ))
        )}
      </Section>

      {data.claimed.length > 0 && (
        <Section title="You claimed — waiting for your manager">
          {data.claimed.map((r) => (
            <Card key={r.id}>
              <Line>{when(r)}</Line>
              <Sub>from {r.requestedBy.name}</Sub>
              <button
                disabled={busy === r.id}
                onClick={() => void act(r.id, () => api.unclaimOffer(r.id))}
                className="mt-2 self-start font-body text-[11px] font-bold text-muted-ink underline"
              >
                back out
              </button>
            </Card>
          ))}
        </Section>
      )}

      {data.posted.length > 0 && (
        <Section title="You posted">
          {data.posted.map((r) => (
            <Card key={r.id}>
              <Line>{when(r)}</Line>
              <Sub>
                {r.targetEmployee
                  ? `${r.targetEmployee.name} claimed it — waiting for your manager`
                  : 'on the board — no claims yet'}
              </Sub>
              <button
                disabled={busy === r.id}
                onClick={() => void act(r.id, () => api.cancelChangeRequest(r.id))}
                className="mt-2 self-start font-body text-[11px] font-bold text-coral-dark underline"
              >
                withdraw
              </button>
            </Card>
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 className="mt-6 font-heading text-sm font-bold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </>
  )
}
const Card = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]">
    {children}
  </div>
)
const Line = ({ children }: { children: ReactNode }) => (
  <span className="font-body text-xs font-bold text-ink">{children}</span>
)
const Sub = ({ children }: { children: ReactNode }) => (
  <span className="font-body text-[11px] text-muted-ink">{children}</span>
)
const Note = ({ children }: { children: ReactNode }) => (
  <span className="mt-0.5 font-body text-[11px] italic text-ink">{children}</span>
)
const Empty = ({ children }: { children: ReactNode }) => (
  <span className="font-body text-sm text-muted-ink">{children}</span>
)
