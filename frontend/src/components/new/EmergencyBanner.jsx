import { useI18n } from '../../i18n/index.jsx'
import { Icon } from '../common/Icons.jsx'

/** Shown above the emergency ticket form: what will happen, one-tap calls, and a way back to a normal ticket. */
export default function EmergencyBanner({ onCancel }) {
  const { t } = useI18n()
  return (
    <section className="emergency-note emergency-note--ticket" role="status" aria-label={t.emergencyTicketTitle}>
      <div className="emergency-note__title-row">
        <Icon name="emergency" size={24} />
        <h2 className="form__title">{t.emergencyTicketTitle}</h2>
      </div>
      <p>{t.emergencyTicketBody}</p>
      <div className="form__actions">
        <a className="btn btn--call" href="tel:108">
          <Icon name="ambulance" size={18} />
          <span>{t.call108}</span>
        </a>
        <a className="btn btn--call" href="tel:112">
          <Icon name="phone" size={18} />
          <span>{t.call112}</span>
        </a>
      </div>
      <button type="button" className="link-btn" onClick={onCancel}>
        {t.notEmergency}
      </button>
    </section>
  )
}
