import { useI18n } from '../../i18n/index.jsx'

/** Shown above the emergency ticket form: what will happen, one-tap calls, and a way back to a normal ticket. */
export default function EmergencyBanner({ onCancel }) {
  const { t } = useI18n()
  return (
    <section className="emergency-note emergency-note--ticket" role="status" aria-label={t.emergencyTicketTitle}>
      <h2 className="form__title">⚠ {t.emergencyTicketTitle}</h2>
      <p>{t.emergencyTicketBody}</p>
      <div className="form__actions">
        <a className="btn btn--call" href="tel:108">
          <span aria-hidden="true">🚑</span> {t.call108}
        </a>
        <a className="btn btn--call" href="tel:112">
          <span aria-hidden="true">📞</span> {t.call112}
        </a>
      </div>
      <button type="button" className="link-btn" onClick={onCancel}>
        {t.notEmergency}
      </button>
    </section>
  )
}
