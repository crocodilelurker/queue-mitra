import { useI18n } from '../i18n/index.jsx'

export default function LanguageSwitch() {
  const { lang, setLang, langs, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      {Object.entries(langs).map(([code, l]) => (
        <button
          key={code}
          type="button"
          className="lang-switch__btn"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {l.langName}
        </button>
      ))}
    </div>
  )
}
