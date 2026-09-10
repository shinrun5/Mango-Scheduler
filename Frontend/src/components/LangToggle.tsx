import { useI18n } from '../lib/i18n'

/** One small button that flips the language — shows the language you'd switch TO.
 * A single button (not a segmented EN | 中文 pair) so it never crowds the top bar
 * on a narrow phone. */
export function LangToggle() {
  const { lang, setLang } = useI18n()
  const next = lang === 'en' ? 'zh' : 'en'
  return (
    <button
      onClick={() => setLang(next)}
      aria-label={next === 'zh' ? 'Switch to Chinese' : 'Switch to English'}
      className="shrink-0 whitespace-nowrap rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-heading text-[11px] font-bold text-ink"
    >
      {next === 'zh' ? '中文' : 'EN'}
    </button>
  )
}
