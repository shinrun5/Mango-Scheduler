import { FruitAvatar } from './FruitAvatar'
import { fruitForPerson } from '../lib/fruit'
import type { ChatMessage } from '../types'

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString()

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Chat/DM message stream: day dividers, grouped runs, own messages right-aligned.
 * `peerName` (DM mode) labels the other person's messages; otherwise the message's
 * own `authorName` is used. */
export function MessageList({
  messages,
  peerName,
}: {
  messages: ChatMessage[]
  peerName?: string
}) {
  return (
    <>
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const showDay = !prev || !sameDay(prev.createdAt, m.createdAt)
        const grouped =
          !!prev &&
          !showDay &&
          prev.authorKey === m.authorKey &&
          prev.mine === m.mine &&
          new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000
        const who = m.mine ? 'You' : peerName ?? m.authorName
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
                    {who} · {clock(m.createdAt)}
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
  )
}
