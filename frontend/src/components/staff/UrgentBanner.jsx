import { useEffect, useState } from 'react'
import { startSiren, stopSiren } from '../../utils/sound.js'

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
      <strong className="urgent-banner__title">🚨 URGENT HELP NEEDED</strong>
      <ul>
        {flags.map((f) => (
          <li key={f.id}>
            <span>
              <b>{f.tokenNumber}</b> · {f.firstName} · {f.department}
            </span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onSeen(f.id).catch(() => setError('Could not mark as seen. Try again.'))}
            >
              <span aria-hidden="true">👁</span> Seen
            </button>
          </li>
        ))}
      </ul>
      {error && <p>{error}</p>}
      <button type="button" className="btn btn--sm" aria-pressed={muted} onClick={() => setMuted((m) => !m)}>
        <span aria-hidden="true">{muted ? '🔇' : '🔔'}</span> {muted ? 'Siren muted' : 'Mute siren'}
      </button>
    </div>
  )
}
