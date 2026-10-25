import { api } from '../api/client.js'
import { EmergencyCalls, WarningSigns } from '../components/EmergencyParts.jsx'
import Layout from '../components/Layout.jsx'
import UrgentHelp from '../components/UrgentHelp.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import { Icon } from '../components/common/Icons.jsx'
import FloorPlan from '../components/map/FloorPlan.jsx'
import RouteSteps from '../components/map/RouteSteps.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'

const CASUALTY = 'emergency_casualty_0'

/** Emergency: go to Casualty now or tell any staff member. No token, no registration, no waiting. */
export default function EmergencyPage() {
  const { t, lang, landmark } = useI18n()
  const { data: map } = useAsync(() => api.map(), [])
  const { data: route } = useAsync(() => api.route({ from: 'main_entrance_0', to: CASUALTY, avoidStairs: true, language: lang }), [lang])
  const places = map?.places ?? []
  const casualty = places.find((p) => p.id === CASUALTY)

  const spoken = [t.emergencyTitle, t.emergencyLead, t.emergencyTell, t.casualtyExplain, casualty && landmark(casualty), t.call112, t.call108].filter(Boolean).join('. ')

  return (
    <Layout className="main--emergency">
      <section className="sos-hero" role="alert">
        <Icon name="emergency" size={40} />
        <h1 className="sos-hero__title">{t.emergencyTitle}</h1>
        <p className="sos-hero__lead">{t.emergencyLead}</p>
        <p>{t.emergencyTell}</p>
      </section>

      <EmergencyCalls />

      <section className="card" aria-labelledby="way-title">
        <h2 id="way-title" className="section-title">
          <Icon name="compass" size={24} />
          <span>{t.wayToCasualty}</span>
        </h2>
        <p className="muted">{t.casualtyExplain}</p>
        {casualty && <p className="explain explain--strong">{landmark(casualty)}</p>}
        {places.length > 0 && (
          <div className="plan-box plan-box--compact">
            <FloorPlan places={places} floor={0} route={route} startId="main_entrance_0" endId={CASUALTY} />
          </div>
        )}
        {route?.steps && places.length > 0 && <RouteSteps steps={route.steps} places={places} activeFloor={0} />}
        <Link className="btn btn--outline btn--block" to={`/map?to=${CASUALTY}&avoidStairs=1`}>
          <Icon name="map" size={22} />
          <span>{t.wayFromElsewhere}</span>
        </Link>
      </section>

      <UrgentHelp />
      <ListenButton text={spoken} label={t.listenPage} className="btn btn--ghost btn--block" />
      <WarningSigns />
    </Layout>
  )
}
