import { useI18n } from '../../i18n/index.jsx'

export default function StepIndicator({ current, total = 4 }) {
  const { f } = useI18n()
  const label = f('stepOf', { n: current, total })
  return (
    <div className="steps" aria-label={label} role="img">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`steps__dot${i < current ? ' steps__dot--on' : ''}`} />
      ))}
      <span className="steps__text" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}
