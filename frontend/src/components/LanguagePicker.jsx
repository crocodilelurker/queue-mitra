import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

/** Each language written in its own script. Used on the first visit and in Settings. */
export default function LanguagePicker({ onPicked, compact = false }) {
  const { lang, setLang, langs, t } = useI18n()
  return (
    <div className={`lang-list${compact ? ' lang-list--compact' : ''}`} role="radiogroup" aria-label={t.language}>
      {Object.entries(langs).map(([code, dict]) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          lang={code}
          className="lang-list__btn"
          onClick={() => {
            setLang(code)
            onPicked?.(code)
          }}
        >
          <span className="lang-list__name">{dict.langName}</span>
          {lang === code && <Icon name="check-circle" size={24} />}
        </button>
      ))}
    </div>
  )
}
