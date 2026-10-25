import { useI18n } from '../../i18n/index.jsx'
import ListenButton from '../common/ListenButton.jsx'
import { Icon } from '../common/Icons.jsx'
import { placeIconName } from './placeIcons.js'

/**
 * Turns the server's route (Dijkstra over the building graph) into short sentences in the patient's language.
 * The server's own hints are English-only and one-directional, so every sentence is built here.
 */
export function useRouteSentences() {
  const { t, f, placeName, landmark, floorWord } = useI18n()
  return (steps, places) => {
    const byId = Object.fromEntries(places.map((p) => [p.id, p]))
    return steps.map((step, i) => {
      const place = byId[step.placeId ?? step.place?.id] || step.place || { id: step.placeId, name: step.name }
      const name = placeName(place)
      const prev = steps[i - 1]
      const last = i === steps.length - 1
      let text
      let icon = placeIconName(place)
      if (steps.length === 1) text = f('alreadyHere', { name })
      else if (i === 0) {
        text = f('startAt', { name })
        icon = 'user'
      } else if (prev && step.floor !== prev.floor) {
        const dir = step.floor > prev.floor ? t.up : t.down
        text = f(step.usesStairs ? 'takeStairs' : 'takeLift', { dir, floor: floorWord(step.floor) })
        icon = step.usesStairs ? 'stairs' : 'lift'
      } else if (last) {
        text = f('arriveAt', { name })
        icon = 'flag'
      } else if (place.category === 'vertical_transport') text = f('walkTo', { name })
      else text = f('walkPast', { name })
      const lm = landmark(place)
      return { key: `${place.id}-${i}`, text, landmark: lm, floor: step.floor ?? place.floor ?? 0, icon, metres: step.distanceMeters || 0, last }
    })
  }
}

export default function RouteSteps({ steps, places, activeFloor, onPickFloor }) {
  const { t, f, floorName } = useI18n()
  const sentences = useRouteSentences()(steps, places)
  return (
    <ol className="route-steps">
      {sentences.map((s, i) => {
        const newFloor = i === 0 || s.floor !== sentences[i - 1].floor
        return (
          <li key={s.key} className={`route-steps__item${s.floor === activeFloor ? ' is-on-map' : ''}${s.last ? ' is-last' : ''}`}>
            {newFloor && (
              <button type="button" className="route-steps__floor" onClick={() => onPickFloor?.(s.floor)} aria-pressed={s.floor === activeFloor}>
                <Icon name="layers" size={18} />
                <span>{floorName(s.floor)}</span>
                {s.floor !== activeFloor && <span className="route-steps__show">{t.showOnMap}</span>}
              </button>
            )}
            <div className="route-steps__row">
              <span className="route-steps__num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="route-steps__text">
                <p className="route-steps__main">
                  <Icon name={s.icon} size={20} />
                  <span>{s.text}</span>
                </p>
                {s.landmark && <p className="route-steps__landmark">{s.landmark}</p>}
                {s.metres > 0 && <p className="muted small">{f('metres', { n: s.metres })}</p>}
              </div>
              <ListenButton text={[s.text, s.landmark].filter(Boolean).join('. ')} className="btn btn--icon" label={t.listen} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
