import { useI18n } from '../../i18n/index.jsx'

// Round emergency button shown beside the /new form on every step.
// Pressing it switches the form into emergency mode (see NewPatient); `onPress` decides what happens.
export default function EmergencyButton({ onPress }) {
  const { t } = useI18n()
  return (
    <button type="button" className="emergency-btn" aria-label={t.emergency} title={t.emergency} onClick={onPress}>
      <span aria-hidden="true">⚠</span>
    </button>
  )
}
