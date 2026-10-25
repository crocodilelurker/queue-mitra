import LanguagePicker from '../components/LanguagePicker.jsx'
import Layout from '../components/Layout.jsx'
import { Icon } from '../components/common/Icons.jsx'
import Toggle from '../components/common/Toggle.jsx'
import { useAccess } from '../context/Access.jsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { speak } from '../utils/speech.js'

const SIZES = [
  [0, 'textNormal', 'A'],
  [1, 'textLarge', 'A+'],
  [2, 'textLargest', 'A++'],
]

/** Language, text size, contrast, read aloud, stairs, and installing the app. Saved on this phone. */
export default function Settings() {
  const { t, lang } = useI18n()
  const { prefs, setPref } = useAccess()
  const { canInstall, install } = useInstallPrompt()

  return (
    <Layout className="main--form">
      <h1 className="page-title">{t.settings}</h1>
      <p className="lead">{t.settingsLead}</p>

      <section className="card" aria-labelledby="set-lang">
        <h2 id="set-lang" className="section-title">
          <Icon name="globe" size={24} />
          <span>{t.language}</span>
        </h2>
        <LanguagePicker compact />
      </section>

      <section className="card" aria-labelledby="set-size">
        <h2 id="set-size" className="section-title">
          <Icon name="text-size" size={24} />
          <span>{t.textSize}</span>
        </h2>
        <div className="size-pick" role="radiogroup" aria-labelledby="set-size">
          {SIZES.map(([value, key, glyph]) => (
            <button key={value} type="button" role="radio" aria-checked={prefs.textSize === value} className={`size-pick__btn size-pick__btn--${value}`} onClick={() => setPref('textSize', value)}>
              <span className="size-pick__glyph" aria-hidden="true">
                {glyph}
              </span>
              <span>{t[key]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack" aria-label={t.settings}>
        <Toggle iconName="contrast" label={t.prefHighContrast} hint={t.prefHighContrastHint} checked={prefs.highContrast} onChange={(v) => setPref('highContrast', v)} />
        <Toggle
          iconName="volume"
          label={t.prefReadAloud}
          hint={t.prefReadAloudHint}
          checked={prefs.readAloud}
          onChange={(v) => {
            setPref('readAloud', v)
            if (v) speak(t.prefReadAloudOn, lang)
          }}
        />
        <Toggle iconName="accessibility" label={t.avoidStairs} hint={t.avoidStairsHint} checked={prefs.avoidStairs} onChange={(v) => setPref('avoidStairs', v)} />
        <Toggle iconName="users" label={t.assisted} hint={t.assistedHint} checked={prefs.assisted} onChange={(v) => setPref('assisted', v)} />
      </section>

      {canInstall && (
        <button type="button" className="btn btn--secondary btn--block" onClick={install}>
          <Icon name="download" size={22} />
          <span>{t.install}</span>
        </button>
      )}

      <Link className="btn btn--primary btn--block" to="/">
        <Icon name="check" size={22} />
        <span>{t.done}</span>
      </Link>
    </Layout>
  )
}
