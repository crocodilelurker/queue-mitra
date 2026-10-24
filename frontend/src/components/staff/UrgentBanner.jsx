import { useEffect, useState } from 'react'
import { startSiren, stopSiren } from '../../utils/sound.js'
import { Icon } from '../common/Icons.jsx'

/** Flashing banner and repeating siren for urgent help requests, until each is marked as seen. */
export default function UrgentBanner({ flags, onSeen }) {
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const active = flags.length > 0

  useEffect(() => {
    if (active && !muted) startSiren()
    else stopSiren()
    return stopSiren
  }, [active, muted])

  if (!active) return null
  return (
    <div className="urgent-banner" role="alert">
      <strong className="urgent-banner__title">
        <Icon name="emergency" size={22} /> {flags.some((f) => f.isEmergency) ? 'EMERGENCY' : 'URGENT HELP NEEDED'}</strong>
      <ul>
        {flags.map((f) => (
          <li key={f.id}>
            <span>
              {f.isEmergency && <b>EMERGENCY TICKET · </b>}
              <b>{f.tokenNumber}</b> · {f.firstName} · {f.department}
              {f.complaint && <> · “{f.complaint}”</>}
            </span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onSeen(f.id).catch(() => setError('Could not mark as seen. Try again.'))}
            >
              <Icon name="check" size={16} /> Seen
            </button>
          </li>
        ))}
      </ul>
      {error && <p>{error}</p>}
      <button type="button" className="btn btn--sm" aria-pressed={muted} onClick={() => setMuted((m) => !m)}>
        <Icon name={muted ? 'bell-off' : 'bell'} size={16} /> {muted ? 'Siren muted' : 'Mute siren'}
      </button>
    </div>
  )
}
