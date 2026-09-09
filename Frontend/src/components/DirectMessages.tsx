import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { FruitAvatar } from './FruitAvatar'
import { MessageList } from './MessageList'
import { api } from '../lib/api'
import { fruitForPerson } from '../lib/fruit'
import { relativeTime } from '../lib/time'
import type { ChatMessage, DmPeer } from '../types'

const POLL_MS = 3000

/** Private 1-to-1 messaging: a list of people who share a store with you, and a
 * thread with whoever you pick. */
export function DirectMessages() {
  const [peers, setPeers] = useState<DmPeer[]>([])
  const [active, setActive] = useState<DmPeer | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const lastId = messages.length ? messages[messages.length - 1].id : 0

  const loadPeers = useCallback(
    () => api.getDmPeers().then((r) => setPeers(r.peers)).catch(() => {}),
    [],
  )

  useEffect(() => {
    loadPeers().finally(() => setLoading(false))
  }, [loadPeers])

  // open a thread
  useEffect(() => {
    if (!active) return
    let live = true
    setMessages([])
    stickToBottom.current = true
    api
      .getDmMessages(active.userId)
      .then((r) => {
        if (!live) return
        setMessages(r.messages)
        setHasMore(r.hasMore)
        void api.markDmRead(active.userId).then(loadPeers).catch(() => {})
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load messages'))
    return () => {
      live = false
    }
  }, [active, loadPeers])

  // poll the open thread + the peer list while visible
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      void loadPeers()
      if (!active) return
      try {
        const r = await api.getDmMessages(active.userId, { after: lastId })
        if (r.messages.length === 0) return
        setMessages((cur) => {
          const seen = new Set(cur.map((m) => m.id))
          return [...cur, ...r.messages.filter((m) => !seen.has(m.id))]
        })
        void api.markDmRead(active.userId).then(loadPeers).catch(() => {})
      } catch {
        /* keep polling */
      }
    }
    const h = setInterval(tick, POLL_MS)
    return () => clearInterval(h)
  }, [active, lastId, loadPeers])

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
    if (!active || messages.length === 0) return
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const r = await api.getDmMessages(active.userId, { before: messages[0].id })
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
  }, [active, messages])

  async function send() {
    const body = draft.trim()
    if (!body || sending || !active) return
    setSending(true)
    setError(null)
    try {
      const { message } = await api.sendDm(active.userId, body)
      setDraft('')
      stickToBottom.current = true
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [...cur, message]))
      void loadPeers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="mt-4 font-body text-sm text-muted-ink">Loading…</p>

  if (!active) {
    if (peers.length === 0) {
      return (
        <p className="mt-4 font-body text-sm text-muted-ink">
          Nobody to message yet — your coworkers show up here once they have an account.
        </p>
      )
    }
    return (
      <div className="mt-3 flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
        {peers.map((p) => (
          <button
            key={p.userId}
            onClick={() => setActive(p)}
            className="flex items-center gap-2.5 border-b-2 border-ink/10 px-3 py-2.5 text-left last:border-b-0 hover:bg-cream"
          >
            <FruitAvatar
              kind={fruitForPerson({ employeeId: p.avatarKey, avatarFruit: p.avatarFruit })}
              size={28}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-sm font-bold text-ink">{p.name}</span>
              {p.lastMessageAt && (
                <span className="font-body text-[11px] text-muted-ink">
                  {relativeTime(p.lastMessageAt)}
                </span>
              )}
            </span>
            {p.unread > 0 && (
              <span className="rounded-full bg-coral px-1.5 font-body text-[10px] font-bold text-white">
                {p.unread > 9 ? '9+' : p.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col">
      <button
        onClick={() => setActive(null)}
        className="mb-2 self-start font-body text-xs font-bold text-sky-dark"
      >
        ← everyone
      </button>
      <div className="flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
        <div className="flex items-center gap-2 border-b-2 border-ink/10 bg-cream px-3 py-2">
          <FruitAvatar
            kind={fruitForPerson({ employeeId: active.avatarKey, avatarFruit: active.avatarFruit })}
            size={22}
          />
          <span className="font-heading text-sm font-bold text-ink">{active.name}</span>
        </div>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="max-h-[calc(100vh-19rem)] min-h-[14rem] flex-1 overflow-y-auto px-3 py-3 sm:px-4"
        >
          {messages.length === 0 ? (
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
              <MessageList messages={messages} peerName={active.name} />
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
            placeholder={`Message ${active.name.split(' ')[0]}…`}
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
