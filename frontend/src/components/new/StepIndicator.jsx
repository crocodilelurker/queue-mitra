import { useI18n } from '../../i18n/index.jsx'

export default function StepIndicator({ current, total = 4 }) {
  const { f } = useI18n()
  const label = f('stepOf', { n: current, total })
  const progressPct = Math.round((current / total) * 100)

  return (
    <div className="steps-wrapper" aria-label={label}>
      <div className="steps-header">
        <span className="steps-chip">{label}</span>
        <span className="steps-pct">{progressPct}% complete</span>
      </div>
      <div className="steps-bar-track">
        <div className="steps-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}
