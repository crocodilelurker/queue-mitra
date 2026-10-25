import { useOfflineSync } from '../hooks/useOfflineSync.js'
import { useI18n } from '../i18n/index.jsx'
import Header from './Header.jsx'
import OfflineBanner from './OfflineBanner.jsx'

/** Patient page frame: offline notice, header (with Settings and Emergency) and one centred column. */
export default function Layout({ children, wide = false, className = '', footer = null }) {
  useOfflineSync()
  const { t } = useI18n()
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <OfflineBanner />
      <Header />
      <main id="main" className={`main${wide ? ' main--wide' : ''}${className ? ` ${className}` : ''}`}>
        {children}
      </main>
      {footer && <footer className="page-footer">{footer}</footer>}
    </div>
  )
}
