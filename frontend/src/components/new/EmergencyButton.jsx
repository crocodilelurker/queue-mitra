import { useEmergency } from '../../context/Emergency.jsx'
import { useI18n } from '../../i18n/index.jsx'

// Round emergency button shown beside the /new form on every step. Opens the shared emergency guidance.
export default function EmergencyButton() {
  const { t } = useI18n()
  const { openEmergency } = useEmergency()
  return (
    <button type="button" className="emergency-btn" aria-label={t.emergency} title={t.emergency} onClick={() => openEmergency()}>
      <span aria-hidden="true">⚠</span>
    </button>
  )
}
