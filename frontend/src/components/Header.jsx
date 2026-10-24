import { useAccess } from '../context/Access.jsx'
import { useEmergency } from '../context/Emergency.jsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import LanguageSwitch from './LanguageSwitch.jsx'

/** Top bar on every screen: brand, text size, Emergency (always reachable), language, install. */
export default function Header({ hideEmergency = false, emergencyTo = null }) {
  const { t } = useI18n()
  const { prefs, setPref } = useAccess()
  const { openEmergency } = useEmergency()
  const { canInstall, install } = useInstallPrompt()
  return (
    <header className="header">
      <Link to="/" className="box box--lg header__brand">
        {t.appName}
      </Link>
      {!hideEmergency &&
        (emergencyTo ? (
          <Link to={emergencyTo} className="btn btn--sm btn--danger header__emergency">
            <span aria-hidden="true">⚠</span> {t.emergency}
          </Link>
        ) : (
          <button type="button" className="btn btn--sm btn--danger header__emergency" onClick={() => openEmergency()}>
            <span aria-hidden="true">⚠</span> {t.emergency}
          </button>
        ))}
      <div className="header__tools">
        <button type="button" className="btn btn--sm" aria-pressed={prefs.largeText} onClick={() => setPref('largeText', !prefs.largeText)}>
          <span aria-hidden="true">Aa</span> {t.textSize}
        </button>
        <LanguageSwitch />
        {canInstall && (
          <button type="button" className="btn btn--sm" onClick={install}>
            <span aria-hidden="true">⬇</span> {t.install}
          </button>
        )}
      </div>
    </header>
  )
}
