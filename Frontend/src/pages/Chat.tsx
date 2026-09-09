import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { FruitAvatar } from '../components/FruitAvatar'
import { api } from '../lib/api'
import { fruitForPerson } from '../lib/fruit'
import type { ChatMessage, Store } from '../types'

const POLL_MS = 3000
const STORE_KEY = 'fruitcrew.chatStoreId'

const readStoreId = (): number | null => {
  try {
    return Number(localStorage.getItem(STORE_KEY)) || null
  } catch {
    return null
  }
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString()
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function Chat() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const lastId = messages.length ? messages[messages.length - 1].id : 0

  useEffect(() => {
    api
      .getStores()
      .then((list) => {
        setStores(list)
        const saved = readStoreId()
        setStoreId(list.find((s) => s.id === saved)?.id ?? list[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your stores'))
  }, [])

  const pickStore = (id: number) => {
    setStoreId(id)
    try {
      localStorage.setItem(STORE_KEY, String(id))
    } catch {
      /* ignore */
    }
  }

  // initial page whenever the store changes
  useEffect(() => {
    if (storeId == null) return
    let live = true
    setLoading(true)
    setMessages([])
    stickToBottom.current = true
    api
      .getChatMessages(storeId)
      .then((r) => {
        if (!live) return
        setMessages(r.messages)
        setHasMore(r.hasMore)
        void api.markChatRead(storeId).catch(() => {})
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load messages'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [storeId])

  // poll for new messages while the tab is visible
  useEffect(() => {
    if (storeId == null) return
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await api.getChatMessages(storeId, { after: lastId })
        if (r.messages.length === 0) return
        setMessages((cur) => {
          const seen = new Set(cur.map((m) => m.id))
          return [...cur, ...r.messages.filter((m) => !seen.has(m.id))]
        })
        void api.markChatRead(storeId).catch(() => {})
      } catch {
        /* keep polling */
      }
    }
    const h = setInterval(tick, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(h)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [storeId, lastId])

  // remember whether we're pinned to the bottom before each render
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }
  useLayoutEffect(() => {
    if (stickToBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadEarlier = useCallback(async () => {
    if (storeId == null || messages.length === 0) return
    const before = messages[0].id
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const r = await api.getChatMessages(storeId, { before })
      stickToBottom.current = false
      setHasMore(r.hasMore)
      setMessages((cur) => {
        const seen = new Set(cur.map((m) => m.id))
        return [...r.messages.filter((m) => !seen.has(m.id)), ...cur]
      })
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load older messages')
    }
  }, [storeId, messages])

  async function send() {
    const body = draft.trim()
    if (!body || sending || storeId == null) return
    setSending(true)
    setError(null)
    try {
      const { message } = await api.sendChatMessage(storeId, body)
      setDraft('')
      stickToBottom.current = true
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [...cur, message]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col p-4 pb-24 sm:p-6 sm:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-lg font-bold text-ink">Chat</h1>
        {stores.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {stores.map((s) => (
              <button
                key={s.id}
                onClick={() => pickStore(s.id)}
                className={`rounded-full border-2 border-ink px-2.5 py-1 font-heading text-xs font-bold ${
                  s.id === storeId ? 'bg-ink text-white' : 'bg-paper text-ink'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-0.5 mb-3 font-body text-xs text-muted-ink">
        Everyone who works this store — messages are visible to the whole crew and their managers.
      </p>

      <div className="flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="max-h-[calc(100vh-16rem)] min-h-[16rem] flex-1 overflow-y-auto px-3 py-3 sm:px-4"
        >
          {loading ? (
            <p className="py-8 text-center font-body text-sm text-muted-ink">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-muted-ink">
              No messages yet — say hi 👋
            </p>
          ) : (
            <>
              {hasMore && (
                <div className="mb-2 text-center">
                  <button
                    onClick={() => void loadEarlier()}
                    className="rounded-full border-2 border-ink/30 px-3 py-1 font-heading text-[11px] font-bold text-ink hover:border-ink"
                  >
                    Load earlier
                  </button>
                </div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1]
                const showDay = !prev || !sameDay(prev.createdAt, m.createdAt)
                const grouped =
                  !!prev &&
                  !showDay &&
                  prev.authorKey === m.authorKey &&
                  prev.mine === m.mine &&
                  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="my-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-ink/10" />
                        <span className="font-body text-[10px] font-bold uppercase tracking-wide text-muted-ink">
                          {dayLabel(m.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-ink/10" />
                      </div>
                    )}
                    <div className={`flex gap-2 ${grouped ? 'mt-0.5' : 'mt-2.5'} ${m.mine ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 shrink-0">
                        {!grouped && (
                          <FruitAvatar
                            kind={fruitForPerson({ employeeId: m.authorKey, avatarFruit: m.authorFruit })}
                            size={26}
                          />
                        )}
                      </div>
                      <div className={`flex min-w-0 max-w-[78%] flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                        {!grouped && (
                          <span className="mb-0.5 font-body text-[11px] font-bold text-muted-ink">
                            {m.mine ? 'You' : m.authorName} · {clock(m.createdAt)}
                          </span>
                        )}
                        <span
                          className={`whitespace-pre-wrap break-words rounded-2xl border-2 border-ink px-3 py-1.5 font-body text-sm ${
                            m.mine ? 'bg-sky text-ink' : 'bg-cream text-ink'
                          }`}
                        >
                          {m.body}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="flex items-end gap-2 border-t-2 border-ink/10 p-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            rows={1}
            placeholder="Message the crew…"
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border-2 border-ink bg-cream px-3 py-2 font-body text-sm text-ink outline-none focus:bg-paper"
          />
          <Button onClick={() => void send()} disabled={sending || !draft.trim()} className="shrink-0">
            {sending ? '…' : 'Send'}
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 font-body text-xs font-bold text-coral-dark">{error}</p>}
    </div>
  )
}
