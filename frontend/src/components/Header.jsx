import { useHospital } from '../context/Hospital.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link, useLocation } from '../router.jsx'
import { Icon } from './common/Icons.jsx'

/** Patient top bar: logo and hospital name, Settings, and the red Emergency button on every screen. */
export default function Header() {
  const { t } = useI18n()
  const { hospital } = useHospital() || {}
  const { pathname } = useLocation()

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="brand" aria-label={`${t.appName}${hospital?.name ? `, ${hospital.name}` : ''}. ${t.home}`}>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="#fff" />
            </svg>
          </span>
          <span className="brand__text">
            <span className="brand__name">{t.appName}</span>
            {hospital?.name && <span className="brand__hospital">{hospital.name}</span>}
          </span>
        </Link>
        <nav className="topbar__actions" aria-label={t.mainMenu}>
          <Link to="/settings" className="topbar__btn" aria-current={pathname === '/settings' ? 'page' : undefined}>
            <Icon name="settings" size={20} />
            <span>{t.settings}</span>
          </Link>
          <Link to="/emergency" className="topbar__sos" aria-current={pathname === '/emergency' ? 'page' : undefined}>
            <Icon name="emergency" size={20} />
            <span>{t.emergency}</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
