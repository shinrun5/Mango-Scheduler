import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { MessageList } from './MessageList'
import type { ChatMessage } from '../types'

const POLL_MS = 3000

export interface ThreadIO {
  fetchPage: (opts?: { after?: number; before?: number }) => Promise<{ messages: ChatMessage[]; hasMore: boolean }>
  send: (body: string) => Promise<{ message: ChatMessage }>
  markRead: () => Promise<unknown>
}

/** One open conversation — store channel or DM. Polls while visible; resets when
 * `convKey` changes. `io` may be a fresh closure each render (read via a ref). */
export function ChatThread({
  convKey,
  io,
  header,
  peerName,
  placeholder,
  onBack,
  onActivity,
}: {
  convKey: string
  io: ThreadIO
  header: ReactNode
  peerName?: string
  placeholder: string
  onBack: () => void
  onActivity?: () => void
}) {
  const ioRef = useRef(io)
  const actRef = useRef(onActivity)
  useLayoutEffect(() => {
    ioRef.current = io
    actRef.current = onActivity
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const lastId = messages.length ? messages[messages.length - 1].id : 0

  useEffect(() => {
    let live = true
    setLoading(true)
    setMessages([])
    stick.current = true
    ioRef.current
      .fetchPage()
      .then((r) => {
        if (!live) return
        setMessages(r.messages)
        setHasMore(r.hasMore)
        void ioRef.current.markRead().then(() => actRef.current?.()).catch(() => {})
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load messages'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [convKey])

  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await ioRef.current.fetchPage({ after: lastId })
        if (r.messages.length === 0) return
        setMessages((cur) => {
          const seen = new Set(cur.map((m) => m.id))
          return [...cur, ...r.messages.filter((m) => !seen.has(m.id))]
        })
        void ioRef.current.markRead().then(() => actRef.current?.()).catch(() => {})
      } catch {
        /* keep polling */
      }
    }
    const h = setInterval(tick, POLL_MS)
    return () => clearInterval(h)
  }, [convKey, lastId])

  const onScroll = () => {
    const el = scrollRef.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }
  useLayoutEffect(() => {
    if (stick.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const loadEarlier = useCallback(async () => {
    if (messages.length === 0) return
    const el = scrollRef.current
    const prev = el?.scrollHeight ?? 0
    try {
      const r = await ioRef.current.fetchPage({ before: messages[0].id })
      stick.current = false
      setHasMore(r.hasMore)
      setMessages((cur) => {
        const seen = new Set(cur.map((m) => m.id))
        return [...r.messages.filter((m) => !seen.has(m.id)), ...cur]
      })
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prev
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load older messages')
    }
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const { message } = await ioRef.current.send(body)
      setDraft('')
      stick.current = true
      setMessages((cur) => (cur.some((m) => m.id === message.id) ? cur : [...cur, message]))
      actRef.current?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
      <div className="flex items-center gap-1.5 border-b-2 border-ink/10 bg-cream px-2 py-2">
        <button
          onClick={onBack}
          aria-label="Back to chats"
          className="shrink-0 rounded-full px-2 font-heading text-xl font-bold leading-none text-ink hover:text-sky-dark"
        >
          ‹
        </button>
        {header}
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[calc(100vh-15rem)] min-h-[14rem] flex-1 overflow-y-auto px-3 py-3 sm:px-4"
      >
        {loading ? (
          <p className="py-8 text-center font-body text-sm text-muted-ink">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-ink">No messages yet — say hi 👋</p>
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
            <MessageList messages={messages} peerName={peerName} />
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
          placeholder={placeholder}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border-2 border-ink bg-cream px-3 py-2 font-body text-sm text-ink outline-none focus:bg-paper"
        />
        <Button onClick={() => void send()} disabled={sending || !draft.trim()} className="shrink-0">
          {sending ? '…' : 'Send'}
        </Button>
      </div>
      {error && (
        <p className="border-t border-ink/10 px-3 py-1 font-body text-xs font-bold text-coral-dark">{error}</p>
      )}
    </div>
  )
}
