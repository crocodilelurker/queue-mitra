import { useI18n } from '../i18n/index.jsx'

export default function LanguageSwitch() {
  const { lang, setLang, langs } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {Object.entries(langs).map(([code, l]) => (
        <button
          key={code}
          type="button"
          className="lang-switch__btn"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {l.langName}
        </button>
      ))}
    </div>
  )
}
