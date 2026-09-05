import { useState } from 'react'
import type { Candidate } from '../lib/candidates'
import { fruitFor } from '../lib/fruit'
import { to12Hour } from '../lib/time'
import { FruitAvatar } from './FruitAvatar'

const WIDTH = 260

function CandidateList({ candidates, onPick, empty }: { candidates: Candidate[]; onPick: (id: number) => void; empty: string }) {
  return (
    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {candidates.length === 0 && <span className="px-2 py-1.5 font-body text-xs text-muted-ink">{empty}</span>}
      {candidates.map((c) => (
        <button
          key={c.employeeId}
          onClick={() => onPick(c.employeeId)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-cream"
        >
          <FruitAvatar kind={fruitFor(c.employeeId)} size={22} />
          <span className="font-body text-xs font-bold text-ink">{c.name}</span>
          {!c.coversFull && (
            <span className="ml-auto shrink-0 font-body text-[10px] font-semibold text-coral-dark">partial</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function AssignPopover({
  title,
  subtitle,
  candidates,
  anchorRect,
  onPick,
  onClose,
  split,
}: {
  title: string
  subtitle?: string
  candidates: Candidate[]
  anchorRect: DOMRect
  onPick: (employeeId: number) => void
  onClose: () => void
  /** Present only when tapping an existing person's shift -- lets the manager hand
   * off the tail of it to someone else instead of a full swap. */
  split?: {
    minTime: string // HH:MM, the shift's own start
    maxTime: string // HH:MM, the shift's own end
    getCandidates: (splitTime: string) => Candidate[]
    onSplit: (splitTime: string, employeeId: number) => void
  }
}) {
  const [splitTime, setSplitTime] = useState('')
  const left = Math.min(Math.max(anchorRect.left, 8), window.innerWidth - WIDTH - 8)
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 60)
  const splitValid = !!split && splitTime > split.minTime && splitTime < split.maxTime

  return (
    <>
      {/* click-outside catcher */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 flex flex-col gap-3 rounded-2xl border-[2.5px] border-ink bg-paper p-3 shadow-[4px_4px_0_var(--color-ink)]"
        style={{ top, left, width: WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-sm font-bold text-ink">{title}</span>
            {subtitle && <span className="font-body text-[11px] font-semibold text-muted-ink">{subtitle}</span>}
          </div>
          <CandidateList candidates={candidates} onPick={onPick} empty="Nobody else is available for this window." />
        </div>

        {split && (
          <div className="flex flex-col gap-2 border-t-2 border-dashed border-cream pt-2.5">
            <div className="flex items-center gap-2">
              <span className="font-body text-[11px] font-bold text-muted-ink">Split at</span>
              <input
                type="time"
                value={splitTime}
                min={split.minTime}
                max={split.maxTime}
                onChange={(e) => setSplitTime(e.target.value)}
                className="rounded-lg border-2 border-ink px-1.5 py-0.5 font-body text-xs font-bold text-ink"
              />
            </div>
            {splitValid && (
              <>
                <span className="font-body text-[11px] font-semibold text-muted-ink">
                  Who takes over {to12Hour(splitTime)}–{to12Hour(split.maxTime)}?
                </span>
                <CandidateList
                  candidates={split.getCandidates(splitTime)}
                  onPick={(id) => split.onSplit(splitTime, id)}
                  empty="Nobody's available to cover the rest of this window."
                />
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
