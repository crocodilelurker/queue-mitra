import { useI18n } from '../../i18n/index.jsx'
import { Link } from '../../router.jsx'
import { Icon } from './Icons.jsx'

/** Shown on the slip and the live screen of an emergency ticket: go to Casualty now, staff already know. */
export default function EmergencyTicketNotice() {
  const { t } = useI18n()
  return (
    <section className="emergency-note emergency-note--ticket" role="alert">
      <div className="emergency-note__title-row">
        <Icon name="emergency" size={24} />
        <h2 className="form__title">{t.emergencyTicketSlipTitle}</h2>
      </div>
      <p>{t.emergencyTicketSlipBody}</p>
      <div className="form__actions no-print">
        <Link className="btn btn--call" to="/map?to=emergency_casualty_0">
          <Icon name="compass" size={18} />
          <span>{t.goCasualty}</span>
        </Link>
        <a className="btn btn--call" href="tel:108">
          <Icon name="ambulance" size={18} />
          <span>{t.call108}</span>
        </a>
      </div>
    </section>
  )
}
