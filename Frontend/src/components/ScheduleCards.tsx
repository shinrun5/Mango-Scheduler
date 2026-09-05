import type { MouseEvent } from 'react'
import { FruitAvatar } from './FruitAvatar'
import { StarBadgeIcon, WarningIcon } from './icons'
import { fruitFor } from '../lib/fruit'
import { timeRange } from '../lib/time'

export interface CardPerson {
  shiftId: number
  employeeId: number
  name: string
  isOpener: boolean
  /** Set when this person's hours differ from the slot's nominal window (e.g. after a
   * split): they come in after open, or leave before close. Values are 12h display strings. */
  note?: { comesIn?: string; leaves?: string }
}

export function ShiftCard({
  start,
  end,
  people,
  onPersonClick,
}: {
  start: string
  end: string
  people: CardPerson[]
  /** Tap a person to see who else could cover this shift instead. */
  onPersonClick?: (person: CardPerson, e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border-[2.5px] border-ink bg-paper px-2.5 py-2 shadow-[3px_3px_0_var(--color-ink)]">
      <span className="font-body text-[10px] font-extrabold uppercase tracking-wide text-muted-ink">
        {timeRange(start, end)}
      </span>
      {people.map((p) => (
        <button
          key={p.employeeId}
          type="button"
          onClick={(e) => onPersonClick?.(p, e)}
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg text-left transition-opacity hover:opacity-70"
        >
          <div className="relative h-[26px] w-[26px] shrink-0">
            <FruitAvatar kind={fruitFor(p.employeeId)} size={26} />
            {p.isOpener && (
              <div className="absolute -bottom-1 -right-1">
                <StarBadgeIcon size={12} />
              </div>
            )}
          </div>
          <span className="font-body text-xs font-bold text-ink">{p.name}</span>
          {p.note?.comesIn && (
            <span className="shrink-0 rounded-full border border-ink/25 px-1.5 py-px font-body text-[9px] font-bold text-muted-ink">
              in {p.note.comesIn}
            </span>
          )}
          {p.note?.leaves && (
            <span className="shrink-0 rounded-full bg-coral-bg px-1.5 py-px font-body text-[9px] font-bold text-coral-dark">
              til {p.note.leaves}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function GapCard({
  label,
  window,
  detail,
  onClick,
}: {
  label: string
  window: string
  detail: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-[2.5px] border-dashed border-coral bg-coral-bg p-3 text-center transition-opacity hover:opacity-80"
    >
      <WarningIcon size={20} />
      <span className="font-body text-[10px] font-extrabold text-coral-dark">{label}</span>
      <span className="font-body text-[10px] font-bold text-coral-dark">{window}</span>
      <span className="font-body text-[9px] font-semibold text-coral-dark/80">{detail}</span>
    </button>
  )
}
