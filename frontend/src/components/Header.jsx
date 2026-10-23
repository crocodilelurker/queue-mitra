import { useI18n } from '../i18n/index.jsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import LanguageSwitch from './LanguageSwitch.jsx'

export default function Header() {
  const { t } = useI18n()
  const { canInstall, install } = useInstallPrompt()
  return (
    <header className="header">
      <div className="box box--lg header__brand">{t.appName}</div>
      <div className="header__actions">
        {canInstall && (
          <button type="button" className="btn btn--sm" onClick={install}>
            {t.install}
          </button>
        )}
        <LanguageSwitch />
      </div>
    </header>
  )
}
