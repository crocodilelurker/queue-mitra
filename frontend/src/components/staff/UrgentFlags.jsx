import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { startSiren, stopSiren } from '../../utils/sound.js'
import { Icon } from '../common/Icons.jsx'
import { Button, errorText, minutesSince, useNow } from './ui.jsx'

// A ticketless flag ("I need urgent help" pressed before registering) has no ticket id: use the flag's own id.
export const flagId = (f) => f.flagId || f._id || f.id || f.ticketId

const soundBlocked = () => typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive

/**
 * "I need urgent help" flags, pinned at the top of every staff screen.
 * A repeating alert sound plays until every flag is marked as seen.
 * The app never decides who is urgent: it only makes sure a person sees the flag immediately.
 */
export default function UrgentFlags({ flags = [], onChanged }) {
  const now = useNow(15000)
  const [hidden, setHidden] = useState(() => new Set())
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [needsTap, setNeedsTap] = useState(soundBlocked)

  const visible = flags.filter((f) => !hidden.has(flagId(f)))
  const active = visible.length > 0

  useEffect(() => {
    if (active) startSiren()
    else stopSiren()
    return () => stopSiren()
  }, [active])

  useEffect(() => {
    if (!needsTap) return
    const on = () => setNeedsTap(false)
    window.addEventListener('pointerdown', on, { once: true })
    window.addEventListener('keydown', on, { once: true })
    return () => {
      window.removeEventListener('pointerdown', on)
      window.removeEventListener('keydown', on)
    }
  }, [needsTap])

  // Forget locally hidden flags once the server no longer lists them.
  useEffect(() => {
    setHidden((prev) => {
      const ids = new Set(flags.map(flagId))
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [flags])

  if (!active) return null

  const markSeen = async (f) => {
    const id = flagId(f)
    setBusy(id)
    setError(null)
    try {
      await api.urgentSeen(id)
      setHidden((prev) => new Set(prev).add(id))
      onChanged?.()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="sx-urgent" role="alert" aria-label="Urgent help requests">
      <div className="sx-urgent__inner">
        <div className="sx-urgent__title">
          <span className="sx-urgent__pulse" aria-hidden="true" />
          <Icon name="alert" size={18} />
          {visible.length === 1 ? '1 person needs urgent help' : `${visible.length} people need urgent help`} — please check on them now
          {needsTap && (
            <Button size="sm" variant="ghost" icon="volume" onClick={() => setNeedsTap(false)}>
              Turn on alert sound
            </Button>
          )}
        </div>
        <ul className="sx-urgent__list">
          {visible.map((f) => {
            const id = flagId(f)
            const mins = minutesSince(f.raisedAt, now)
            const where = f.location || f.note
            return (
              <li key={id} className="sx-urgent__item">
                <span className="sx-urgent__token">{f.tokenNumber || <Icon name="map-pin" size={20} />}</span>
                <span className="sx-urgent__desc">
                  {f.tokenNumber ? (
                    <>
                      <strong>{f.firstName || 'Patient'}</strong> · {f.departmentName || f.department || 'OPD'}
                    </>
                  ) : (
                    <strong>No token yet — at {where || 'the hospital (location not given)'}</strong>
                  )}
                  <small>
                    Raised {mins < 1 ? 'just now' : `${mins} min ago`}
                    {f.by ? ` · by ${f.by}` : ''}
                    {f.tokenNumber && where ? ` · ${where}` : ''}
                  </small>
                </span>
                <Button size="sm" icon="check" busy={busy === id} onClick={() => markSeen(f)}>
                  Mark as seen
                </Button>
              </li>
            )
          })}
        </ul>
        {error && <p className="sx-small">Could not mark as seen: {error}</p>}
      </div>
    </section>
  )
}
