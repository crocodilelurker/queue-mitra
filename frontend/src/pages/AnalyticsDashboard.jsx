import { useEffect } from 'react'
import { api } from '../api/client.js'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Layout from '../components/Layout.jsx'
import DemoToolbar from '../components/staff/DemoToolbar.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { Link } from '../router.jsx'
import { Icon } from '../components/common/Icons.jsx'

const HEAT = { green: 'ok', amber: 'warn', red: 'bad' }
const HEAT_LABEL = { green: 'Normal', amber: 'Busy', red: 'Overcrowded' }
const LANG_NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', other: 'Other' }

function Bar({ label, value, max }) {
  return (
    <div className="bar">
      <span className="bar__label">{label}</span>
      <span className="bar__track" aria-hidden="true">
        <span className="bar__fill" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="bar__value">{value}</span>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const { data, error, loading, reload } = useAsync(() => api.analytics(), [])

  useEffect(() => {
    const id = setInterval(() => reload(true), 5000)
    return () => clearInterval(id)
  }, [reload])

  if (loading) return <Layout><Loading /></Layout>
  if (error && !data) return <Layout><ErrorNote error={error} onRetry={reload} /></Layout>

  const overview = data?.overview || {}
  const emergencySLA = data?.emergencySLA || { averageResponseTimeSeconds: 0, flagsResolved: 0, targetSlaSeconds: 60, totalUrgentFlagsRaised: 0 }
  const languages = data?.languages || {}
  const hourlyTraffic = data?.hourlyTraffic || {}
  const departmentHeatmap = data?.departmentHeatmap || []

  const hourly = Object.entries(hourlyTraffic)
  const maxHour = Math.max(1, ...hourly.map(([, v]) => v))
  const maxLang = Math.max(1, ...Object.values(languages))
  const assistedPct = overview.totalPatientsToday ? Math.round(((overview.assistedCount || 0) / overview.totalPatientsToday) * 100) : 0
  const sla = emergencySLA.averageResponseTimeSeconds || 0
  const slaOk = emergencySLA.flagsResolved === 0 || sla <= (emergencySLA.targetSlaSeconds || 60)

  const cards = [
    ['Registered today', overview.totalPatientsToday],
    ['Waiting', overview.currentlyWaiting],
    ['In consultation', overview.inConsultation],
    ['Completed', overview.completedToday],
    ['No-shows', overview.noShowCount],
  ]

  return (
    <Layout wide>
      <div className="staff-bar">
        <h1 className="hero hero--sm">{data.hospital.name} · Analytics</h1>
        <Link className="btn btn--sm" to="/doctor">
          <Icon name="stethoscope" size={16} /> Staff desk
        </Link>
      </div>
      <p className="field__hint">Date {data.serviceDate} · refreshes every 5 seconds</p>

      <section className="stat-cards" aria-label="Patient flow">
        {cards.map(([label, value]) => (
          <div key={label} className="box stat-card">
            <p className="stat-card__value">{value}</p>
            <p>{label}</p>
          </div>
        ))}
      </section>

      <div className="analytics-grid">
        <section className="box panel" aria-label="Emergency response">
          <h2 className="form__title">Emergency response</h2>
          <p className={`badge badge--${slaOk ? 'ok' : 'bad'}`}>{emergencySLA.flagsResolved === 0 ? 'No answered flags yet' : slaOk ? 'Within target' : 'Action required'}</p>
          <dl className="stats">
            <div>
              <dt>Urgent flags raised</dt>
              <dd>{emergencySLA.totalUrgentFlagsRaised}</dd>
            </div>
            <div>
              <dt>Answered</dt>
              <dd>{emergencySLA.flagsResolved}</dd>
            </div>
            <div>
              <dt>Average response</dt>
              <dd>{sla}s</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>&lt; {emergencySLA.targetSlaSeconds}s</dd>
            </div>
          </dl>
        </section>

        <section className="box panel" aria-label="Registrations by hour">
          <h2 className="form__title">Registrations by hour</h2>
          {hourly.map(([hour, value]) => (
            <Bar key={hour} label={hour} value={value} max={maxHour} />
          ))}
        </section>

        <section className="box panel" aria-label="Languages and assisted registration">
          <h2 className="form__title">Languages</h2>
          {Object.entries(languages).map(([code, value]) => (
            <Bar key={code} label={LANG_NAMES[code]} value={value} max={maxLang} />
          ))}
          <p>
            <b>Assisted registrations:</b> {overview.assistedCount} ({assistedPct}%)
          </p>
        </section>
      </div>

      <section aria-label="Overcrowding by department">
        <h2 className="form__title">Waiting-area load by department</h2>
        <div className="heatmap">
          {departmentHeatmap.map((d) => (
            <div key={d.code} className={`box heat heat--${HEAT[d.overcrowding]}`}>
              <p className="heat__name">{d.name}</p>
              <p className="heat__count">
                {d.waitingCount}/{d.capacity}
              </p>
              <p>
                {HEAT_LABEL[d.overcrowding]} · done {d.completedCount}
              </p>
            </div>
          ))}
        </div>
      </section>
      <DemoToolbar />
    </Layout>
  )
}
