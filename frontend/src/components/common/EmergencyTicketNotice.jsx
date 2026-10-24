import { useI18n } from '../../i18n/index.jsx'
import { Link } from '../../router.jsx'

/** Shown on the slip and the live screen of an emergency ticket: go to Casualty now, staff already know. */
export default function EmergencyTicketNotice() {
  const { t } = useI18n()
  return (
    <section className="emergency-note emergency-note--ticket" role="alert">
      <h2 className="form__title">⚠ {t.emergencyTicketSlipTitle}</h2>
      <p>{t.emergencyTicketSlipBody}</p>
      <div className="form__actions no-print">
        <Link className="btn btn--call" to="/map?to=emergency_casualty_0">
          <span aria-hidden="true">🧭</span> {t.goCasualty}
        </Link>
        <a className="btn btn--call" href="tel:108">
          <span aria-hidden="true">🚑</span> {t.call108}
        </a>
      </div>
    </section>
  )
}
