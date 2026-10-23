import { useI18n } from '../../i18n/index.jsx'

export default function StepIndicator({ current, total = 3 }) {
  const { t } = useI18n()
  return (
    <div className="steps" aria-label={`${t.step} ${current} / ${total}`} role="img">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`steps__dot${i < current ? ' steps__dot--on' : ''}`} />
      ))}
      <span className="steps__text" aria-hidden="true">
        {t.step} {current} / {total}
      </span>
    </div>
  )
}
