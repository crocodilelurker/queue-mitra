import { useI18n } from '../../i18n/index.jsx'

// Round emergency button shown beside the /new form on every step.
// Placeholder: for now it only logs; wire it to a real action later.
export default function EmergencyButton() {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className="emergency-btn"
      aria-label={t.emergency}
      title={t.emergency}
      onClick={() => console.log('Emergency button clicked')}
    >
      <span aria-hidden="true">⚠</span>
    </button>
  )
}
