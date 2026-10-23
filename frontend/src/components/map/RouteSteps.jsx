import { useI18n } from '../../i18n/index.jsx'

/** Localized sentence for one step. Backend hints are English only, so other languages use generated text. */
export function useStepText() {
  const { t, f, lang, placeName } = useI18n()
  return (step, prev, places) => {
    const place = places.find((p) => p.id === step.placeId)
    const name = place ? placeName(place) : step.name
    if (!prev) return f('startAt', { name })
    if (step.floor !== prev.floor) {
      const dir = step.floor > prev.floor ? t.up : t.down
      return f(step.usesStairs ? 'takeStairs' : 'takeLift', { dir, n: step.floor })
    }
    return lang === 'en' ? step.instruction : f('walkTo', { name })
  }
}

export default function RouteSteps({ steps, places }) {
  const { f } = useI18n()
  const stepText = useStepText()
  return (
    <ol className="steps-list">
      {steps.map((step, i) => (
        <li key={step.placeId + i} className="steps-list__item">
          <span className="steps-list__num" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <p className="steps-list__text">{stepText(step, steps[i - 1], places)}</p>
            <p className="field__hint">
              {f('floorN', { n: step.floor })} · {step.landmark}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
