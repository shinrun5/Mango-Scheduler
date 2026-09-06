import { Button } from './Button'
import { SparkleIcon, WarningIcon } from './icons'
import { relativeTime } from '../lib/time'

/** The schedule toolbar (sits under ManagerLayout's bar): gap count, post, generate. */
export function Header({
  gapCount,
  generating,
  onGenerate,
  publishedAt,
  onPublish,
  onUnpublish,
  publishBusy,
}: {
  gapCount: number | null
  generating: boolean
  onGenerate: () => void
  publishedAt?: string | null
  onPublish?: () => void
  onUnpublish?: () => void
  publishBusy?: boolean
}) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3 border-b-2 border-ink/10 bg-paper px-8 py-3">
      {gapCount !== null && gapCount > 0 && (
        <div className="mr-auto flex items-center gap-1.5 rounded-full border-2 border-coral bg-coral-bg px-3.5 py-1.5">
          <WarningIcon size={16} />
          <span className="font-body text-xs font-extrabold text-coral-dark">
            {gapCount} gap{gapCount === 1 ? '' : 's'} this week
          </span>
        </div>
      )}

      {onPublish &&
        (publishedAt ? (
          <div className="flex items-center gap-2 rounded-full border-2 border-green bg-paper px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green" />
            <span className="font-body text-xs font-extrabold text-ink">
              Posted · {relativeTime(publishedAt)}
            </span>
            <button
              onClick={onUnpublish}
              disabled={publishBusy}
              className="font-body text-[11px] font-bold text-muted-ink underline disabled:opacity-50"
            >
              unpost
            </button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onPublish} disabled={publishBusy}>
            {publishBusy ? 'Posting…' : 'Post schedule'}
          </Button>
        ))}

      <Button onClick={onGenerate} disabled={generating}>
        <SparkleIcon size={16} />
        {generating ? 'Generating…' : 'Generate Schedule'}
      </Button>
    </div>
  )
}
