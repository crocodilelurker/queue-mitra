import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useI18n } from '../../i18n/index.jsx'
import { Link } from '../../router.jsx'
import Modal from './Modal.jsx'
import ListenButton from './ListenButton.jsx'
import { Icon } from './Icons.jsx'

/**
 * Emergency guidance modal with 1-tap dial buttons, direct Casualty route, and warning indicators.
 */
export default function EmergencyModal({ open, detail, onClose }) {
  const { t, lang } = useI18n()
  const [signs, setSigns] = useState(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    api
      .warningSigns(lang)
      .then((data) => alive && setSigns(data))
      .catch(() => alive && setSigns(null))
    return () => {
      alive = false
    }
  }, [open, lang])

  const headline = signs?.warningHeadline || t.emergencyHeadline
  const spoken = [detail?.directive, headline].filter(Boolean).join('. ')

  return (
    <Modal open={open} onClose={onClose} title={t.emergency} variant="danger">
      {detail?.directive && (
        <div className="emergency-directive-box">
          <Icon name="emergency" size={20} />
          <p>{detail.directive}</p>
        </div>
      )}
      {detail?.reason && <p className="modal__reason">{detail.reason}</p>}
      <p className="modal__lead">{headline}</p>

      <div className="modal__actions">
        <a className="btn btn--call" href="tel:112">
          <Icon name="phone" size={18} />
          <span>{t.call112}</span>
        </a>
        <a className="btn btn--call" href="tel:108">
          <Icon name="ambulance" size={18} />
          <span>{t.call108}</span>
        </a>
        {!detail?.inTicketFlow && (
          <Link className="btn btn--primary" to="/new?emergency=1" onClick={onClose}>
            <Icon name="ticket" size={18} />
            <span>{t.getEmergencyTicketNow}</span>
          </Link>
        )}
        <Link className="btn btn--outline" to="/map?to=emergency_casualty_0" onClick={onClose}>
          <Icon name="compass" size={18} />
          <span>{t.goCasualty}</span>
        </Link>
        <ListenButton text={spoken} />
      </div>

      {signs?.signs?.length > 0 && (
        <div className="modal__warning-section">
          <h3 className="modal__sub">{t.warningSigns}</h3>
          <ul className="modal__signs">
            {signs.signs.map((s) => (
              <li key={s.key}>
                <Icon name="alert" size={14} />
                <span>{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn--outline modal__close" onClick={onClose}>
        <Icon name="close" size={16} />
        <span>{t.close}</span>
      </button>
    </Modal>
  )
}
