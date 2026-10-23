import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useI18n } from '../../i18n/index.jsx'
import { Link } from '../../router.jsx'
import Modal from './Modal.jsx'
import ListenButton from './ListenButton.jsx'

/**
 * Emergency guidance. It never judges whether a case is urgent: it always points to Casualty
 * and the emergency numbers. `detail` carries the triage result when a red-flag symptom was typed.
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
    <Modal open={open} onClose={onClose} title={`⚠ ${t.emergency}`} variant="danger">
      {detail?.directive && <p className="modal__alert">{detail.directive}</p>}
      {detail?.reason && <p className="modal__reason">{detail.reason}</p>}
      <p className="modal__lead">{headline}</p>
      <div className="modal__actions">
        <a className="btn btn--call" href="tel:112">
          <span aria-hidden="true">📞</span> {t.call112}
        </a>
        <a className="btn btn--call" href="tel:108">
          <span aria-hidden="true">🚑</span> {t.call108}
        </a>
        <Link className="btn" to="/map?to=emergency_casualty_0" onClick={onClose}>
          <span aria-hidden="true">🧭</span> {t.goCasualty}
        </Link>
        <ListenButton text={spoken} />
      </div>
      {signs?.signs?.length > 0 && (
        <>
          <h3 className="modal__sub">{t.warningSigns}</h3>
          <ul className="modal__signs">
            {signs.signs.map((s) => (
              <li key={s.key}>{s.reason}</li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="btn modal__close" onClick={onClose}>
        <span aria-hidden="true">✕</span> {t.close}
      </button>
    </Modal>
  )
}
