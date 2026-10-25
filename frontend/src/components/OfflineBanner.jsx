import { useI18n } from '../i18n/index.jsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { Icon } from './common/Icons.jsx'

export default function OfflineBanner() {
  const { t } = useI18n()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className="offline-banner" role="status">
      <Icon name="wifi" size={18} />
      <span>{t.offline}</span>
    </div>
  )
}
