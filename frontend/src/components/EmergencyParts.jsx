import { useHospital } from '../context/Hospital.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

/** Tap-to-call buttons: 112 (all emergencies), 108 (ambulance) and the hospital's own emergency number. */
export function EmergencyCalls() {
  const { t, f } = useI18n()
  const { hospital } = useHospital() || {}
  const phone = hospital?.contact?.emergencyPhone
  return (
    <div className="call-grid">
      <a className="btn btn--call" href="tel:112">
        <Icon name="phone" size={22} />
        <span>{t.call112}</span>
      </a>
      <a className="btn btn--call" href="tel:108">
        <Icon name="ambulance" size={22} />
        <span>{t.call108}</span>
      </a>
      {phone && (
        <a className="btn btn--outline-danger" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
          <Icon name="hospital" size={22} />
          <span>{f('callHospital', { phone })}</span>
        </a>
      )}
    </div>
  )
}

/** The signs that need care right away (from the brief), in the patient's language. */
export function WarningSigns({ title = true }) {
  const { t } = useI18n()
  return (
    <section className="signs" aria-labelledby="signs-title">
      {title && (
        <h2 id="signs-title" className="signs__title">
          {t.signsTitle}
        </h2>
      )}
      <ul className="signs__list">
        {t.signs.map((sign) => (
          <li key={sign}>
            <Icon name="alert" size={20} />
            <span>{sign}</span>
          </li>
        ))}
      </ul>
      <p className="signs__go">{t.signsGo}</p>
    </section>
  )
}
