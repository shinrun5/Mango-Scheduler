import { Button } from './Button'
import { FruitAvatar } from './FruitAvatar'
import { SparkleIcon, WarningIcon } from './icons'

export function Header({
  gapCount,
  generating,
  onGenerate,
}: {
  gapCount: number | null
  generating: boolean
  onGenerate: () => void
}) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b-[3px] border-ink bg-paper px-8 py-4.5">
      <div className="flex items-center gap-2.5">
        <FruitAvatar kind="apple" size={32} />
        <span className="font-heading text-[22px] font-extrabold text-ink">Fruit Crew</span>
      </div>
      <div className="flex items-center gap-3.5">
        {gapCount !== null && gapCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border-2 border-coral bg-coral-bg px-3.5 py-1.5">
            <WarningIcon size={16} />
            <span className="font-body text-xs font-extrabold text-coral-dark">
              {gapCount} gap{gapCount === 1 ? '' : 's'} this week
            </span>
          </div>
        )}
        <Button onClick={onGenerate} disabled={generating}>
          <SparkleIcon size={16} />
          {generating ? 'Generating…' : 'Generate Schedule'}
        </Button>
      </div>
    </div>
  )
}
