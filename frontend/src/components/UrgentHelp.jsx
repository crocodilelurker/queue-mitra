import { useState } from 'react'
import { api } from '../api/client.js'
import { useI18n } from '../i18n/index.jsx'
import { placeNameFor } from '../i18n/places.js'
import { Link } from '../router.jsx'
import { lastTicket } from '../utils/patientStore.js'
import Modal from './common/Modal.jsx'
import { Icon } from './common/Icons.jsx'

// Where the person can say they are, so staff can find them. Optional.
const SPOTS = ['main_entrance_0', 'reg_counters_0', 'help_desk_0', 'pharmacy_0', 'laboratory_0', 'waiting_hall_a_1', 'help_desk_1', 'nurses_station_2']

/**
 * "I need urgent help": raises a flag at the top of the staff dashboard, with or without a token.
 * With a known slip it uses the ticket's urgent endpoint, otherwise POST /api/urgent.
 */
export default function UrgentHelp({ publicId = null, raised = false, seen = false, onRaised }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [spot, setSpot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    setBusy(true)
    setError(false)
    const ticketId = publicId || lastTicket()?.publicId
    try {
      if (ticketId) await api.urgent(ticketId)
      else
        await api.urgentHelp({
          language: lang,
          location: spot ? placeNameFor({ id: spot }, 'en') : undefined,
        })
      setSent(true)
      setOpen(false)
      onRaised?.()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const done = sent || raised
  return (
    <>
      {done ? (
        <section className="notice notice--urgent" role="status" aria-live="polite">
          <Icon name={seen ? 'check-circle' : 'bell'} size={24} />
          <div>
            <p className="notice__title">{seen ? t.urgentSeen : t.urgentSent}</p>
            <p>{t.urgentWorse}</p>
            <Link className="link-strong" to="/emergency">
              {t.goEmergencyNow}
            </Link>
          </div>
        </section>
      ) : (
        <button type="button" className="btn btn--urgent btn--block" onClick={() => setOpen(true)}>
          <Icon name="hand" size={24} />
          <span>{t.urgentBtn}</span>
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t.urgentBtn}>
        <p className="modal__lead">{t.urgentConfirm}</p>
        {!(publicId || lastTicket()) && (
          <div className="field">
            <label className="field__label" htmlFor="urgent-spot">
              {t.urgentWhere}
            </label>
            <select id="urgent-spot" className="field__control" value={spot} onChange={(e) => setSpot(e.target.value)}>
              <option value="">{t.urgentWhereUnknown}</option>
              {SPOTS.map((id) => (
                <option key={id} value={id}>
                  {placeNameFor({ id }, lang)}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && (
          <p className="status status--error" role="alert">
            {t.urgentFailed}
          </p>
        )}
        <div className="stack">
          <button type="button" className="btn btn--danger btn--block" onClick={send} disabled={busy}>
            <Icon name="bell" size={22} />
            <span>{busy ? t.sending : t.urgentYes}</span>
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setOpen(false)} disabled={busy}>
            <Icon name="close" size={20} />
            <span>{t.cancel}</span>
          </button>
        </div>
      </Modal>
    </>
  )
}
