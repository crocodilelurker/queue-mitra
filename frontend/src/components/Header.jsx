import { useAccess } from '../context/Access.jsx'
import { useEmergency } from '../context/Emergency.jsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { Icon } from './common/Icons.jsx'
import LanguageSwitch from './LanguageSwitch.jsx'

/** Modern top bar on every screen: brand with medical crest, fast Emergency access, accessibility & language pills. */
export default function Header({ hideEmergency = false, emergencyTo = null }) {
  const { t } = useI18n()
  const { prefs, setPref } = useAccess()
  const { openEmergency } = useEmergency()
  const { canInstall, install } = useInstallPrompt()

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand" aria-label="Queue Mitra Home">
          <span className="brand-crest">
            <Icon name="cross" size={18} color="#ffffff" />
          </span>
          <div className="brand-copy">
            <span className="brand-title">{t.appName}</span>
            <span className="brand-sub">OPD & Smart Queue</span>
          </div>
        </Link>

        <div className="header__actions">
          {!hideEmergency &&
            (emergencyTo ? (
              <Link to={emergencyTo} className="btn-emergency">
                <span className="btn-emergency__pulse" aria-hidden="true" />
                <Icon name="emergency" size={18} />
                <span>{t.emergency}</span>
              </Link>
            ) : (
              <button type="button" className="btn-emergency" onClick={() => openEmergency()}>
                <span className="btn-emergency__pulse" aria-hidden="true" />
                <Icon name="emergency" size={18} />
                <span>{t.emergency}</span>
              </button>
            ))}

          <div className="header__tools">
            <Link to="/admin" className="pill-btn" title="Open Mediflow OPD Admin Desk">
              <Icon name="hospital-building" size={15} />
              <span className="pill-btn__label">Admin Desk</span>
            </Link>

            <button
              type="button"
              className={`pill-btn ${prefs.largeText ? 'pill-btn--active' : ''}`}
              aria-pressed={prefs.largeText}
              onClick={() => setPref('largeText', !prefs.largeText)}
              title={t.textSize}
            >
              <span className="pill-btn__text-glyph">Aa</span>
              <span className="pill-btn__label">{t.textSize}</span>
            </button>

            <LanguageSwitch />

            {canInstall && (
              <button type="button" className="pill-btn" onClick={install} title={t.install}>
                <Icon name="arrow-right" size={15} style={{ transform: 'rotate(90deg)' }} />
                <span className="pill-btn__label">{t.install}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
