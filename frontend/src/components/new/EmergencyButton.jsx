import { useI18n } from '../../i18n/index.jsx'
import { Icon } from '../common/Icons.jsx'

// Sleek floating emergency badge shown beside the /new form on every step.
export default function EmergencyButton({ onPress }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className="emergency-btn"
      aria-label={t.emergency}
      title={t.emergency}
      onClick={onPress}
    >
      <span className="emergency-btn__pulse" aria-hidden="true" />
      <Icon name="emergency" size={24} color="#ffffff" />
    </button>
  )
}
