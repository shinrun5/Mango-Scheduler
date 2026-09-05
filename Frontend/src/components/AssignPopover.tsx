import { useState } from 'react'
import type { Candidate } from '../lib/candidates'
import { fruitFor } from '../lib/fruit'
import { clockToMin, minToClock, to12Hour } from '../lib/time'
import { FruitAvatar } from './FruitAvatar'

/** A sensible default split point: the window's midpoint, snapped to the half hour. */
function defaultSplit(windowStart: string, windowEnd: string): string {
  const a = clockToMin(windowStart)
  const b = clockToMin(windowEnd)
  const snapped = Math.round((a + b) / 2 / 30) * 30
  const mid = a + 30 < b - 30 ? Math.min(Math.max(snapped, a + 30), b - 30) : Math.round((a + b) / 2)
  return minToClock(mid)
}

const WIDTH = 260

export interface SplitConfig {
  windowStart: string // HH:MM 24h
  windowEnd: string // HH:MM 24h
  /** Non-null: an existing shift — this person keeps [windowStart, T], only the tail
   * needs a taker. Null: a gap — both halves need one. */
  headStaysWith: string | null
  candidatesFor: (fromHHMM24: string, toHHMM24: string) => Candidate[]
  commit: (args: { which: 'head' | 'tail'; splitAt: string; employeeId: number }) => void
}

function CandidateList({
  candidates,
  onPick,
  empty,
}: {
  candidates: Candidate[]
  onPick: (id: number) => void
  empty: string
}) {
  return (
    <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
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
  split?: SplitConfig
}) {
  const [splitTime, setSplitTime] = useState(() =>
    split ? defaultSplit(split.windowStart, split.windowEnd) : '',
  )
  const left = Math.min(Math.max(anchorRect.left, 8), window.innerWidth - WIDTH - 8)
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 60)

  // Splitting is a last resort — only offered when nobody can cover the whole window.
  const someoneCoversWhole = candidates.some((c) => c.coversFull)
  const showSplit = !!split && !someoneCoversWhole
  const splitValid = !!split && splitTime > split.windowStart && splitTime < split.windowEnd

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

        {showSplit && split && (
          <div className="flex flex-col gap-2 border-t-2 border-dashed border-cream pt-2.5">
            <span className="font-body text-[11px] font-bold text-coral-dark">
              Nobody can cover the whole shift — split it as a last resort:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-body text-[11px] font-bold text-muted-ink">Split at</span>
              <input
                type="time"
                value={splitTime}
                min={split.windowStart}
                max={split.windowEnd}
                onChange={(e) => setSplitTime(e.target.value)}
                className="rounded-lg border-2 border-ink px-1.5 py-0.5 font-body text-xs font-bold text-ink"
              />
            </div>
            {splitValid && (
              <>
                {split.headStaysWith !== null ? (
                  <span className="font-body text-[11px] font-semibold text-muted-ink">
                    {split.headStaysWith} keeps {to12Hour(split.windowStart)}–{to12Hour(splitTime)}
                  </span>
                ) : (
                  <>
                    <span className="font-body text-[11px] font-semibold text-muted-ink">
                      Who covers {to12Hour(split.windowStart)}–{to12Hour(splitTime)}?
                    </span>
                    <CandidateList
                      candidates={split.candidatesFor(split.windowStart, splitTime)}
                      onPick={(id) => split.commit({ which: 'head', splitAt: splitTime, employeeId: id })}
                      empty="Nobody's available for the first part."
                    />
                  </>
                )}
                <span className="font-body text-[11px] font-semibold text-muted-ink">
                  Who covers {to12Hour(splitTime)}–{to12Hour(split.windowEnd)}?
                </span>
                <CandidateList
                  candidates={split.candidatesFor(splitTime, split.windowEnd)}
                  onPick={(id) => split.commit({ which: 'tail', splitAt: splitTime, employeeId: id })}
                  empty="Nobody's available for the rest."
                />
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
