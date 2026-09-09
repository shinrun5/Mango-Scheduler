import { useI18n, type Lang } from '../lib/i18n'

/** EN | 中文 switch — sits in the top bar of both layouts. */
export function LangToggle() {
  const { lang, setLang } = useI18n()
  const opts: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' },
  ]
  return (
    <div className="flex overflow-hidden rounded-full border-2 border-ink">
      {opts.map((o) => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          className={`px-2 py-0.5 font-heading text-[11px] font-bold ${
            lang === o.code ? 'bg-ink text-white' : 'bg-paper text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
