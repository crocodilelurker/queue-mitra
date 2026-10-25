import { useI18n } from '../../i18n/index.jsx'
import { Link } from '../../router.jsx'
import { EmergencyCalls } from '../EmergencyParts.jsx'
import ListenButton from './ListenButton.jsx'
import Modal from './Modal.jsx'
import { Icon } from './Icons.jsx'

/** Opened when something the patient typed looks like an emergency: go to Casualty now, or call. */
export default function EmergencyModal({ open, detail, onClose }) {
  const { t } = useI18n()
  const spoken = [detail?.directive, t.emergencyLead, t.emergencyTell].filter(Boolean).join(' ')

  return (
    <Modal open={open} onClose={onClose} title={t.emergencyTitle} variant="danger">
      {detail?.directive && <p className="modal__directive">{detail.directive}</p>}
      <p className="modal__lead">{t.emergencyLead}</p>
      <p>{t.emergencyTell}</p>
      <Link className="btn btn--danger btn--block" to="/emergency" onClick={onClose}>
        <Icon name="compass" size={22} />
        <span>{t.showWayCasualty}</span>
      </Link>
      <EmergencyCalls />
      <div className="modal__footer">
        <ListenButton text={spoken} />
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          <Icon name="close" size={20} />
          <span>{t.close}</span>
        </button>
      </div>
    </Modal>
  )
}
