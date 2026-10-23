import { useI18n } from '../i18n/index.jsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'

export default function OfflineBanner() {
  const { t } = useI18n()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className="offline" role="status">
      {t.offline}
    </div>
  )
}
