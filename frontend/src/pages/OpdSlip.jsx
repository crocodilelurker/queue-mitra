import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import EmergencyTicketNotice from '../components/common/EmergencyTicketNotice.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import QrCode from '../components/common/QrCode.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Layout from '../components/Layout.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { Icon } from '../components/common/Icons.jsx'

const PLACEHOLDER_DOCTOR = 'Assigned OPD Specialist'

export default function OpdSlip({ publicId }) {
  const { t, f, pick, deptName } = useI18n()
  useDepartments()
  const { data: slip, error, loading, reload } = useAsync(() => api.slip(publicId), [publicId])

  if (loading) return <Layout><Loading /></Layout>
  if (error) return <Layout><ErrorNote error={error} onRetry={reload} /></Layout>

  const dept = deptName(slip.department)
  const doctor = slip.doctorName === PLACEHOLDER_DOCTOR ? t.doctorAssigned : slip.doctorName
  const gender = t[`gender${slip.patient.gender[0].toUpperCase()}${slip.patient.gender.slice(1)}`]
  const trackUrl = `${window.location.origin}/my-turn/${slip.publicId}`
  const mapQuery = new URLSearchParams({ room: slip.room, dept: slip.department.code })
  if (slip.accessibility?.avoidStairs) mapQuery.set('avoidStairs', '1')

  const speech = f('slipSpeech', {
    token: slip.tokenNumber,
    name: slip.patient.firstName,
    dept,
    room: slip.room,
    floor: slip.department.floor,
    ahead: slip.peopleAhead ?? 0,
    minutes: slip.estimatedWaitMinutes ?? 0,
  })

  const rows = [
    [t.patient, `${slip.patient.firstName}, ${slip.patient.age} · ${gender}`],
    [t.department, dept],
    [t.room, slip.room],
    [t.floor, f('floorN', { n: slip.department.floor })],
    [t.doctor, doctor],
    ...(slip.status === 'waiting'
      ? [
          [t.peopleAhead, String(slip.peopleAhead ?? 0)],
          [t.estWait, f('minutes', { n: slip.estimatedWaitMinutes ?? 0 })],
        ]
      : []),
    ...(slip.helperName ? [[t.helpedBy, slip.helperName]] : []),
    ...(slip.complaint ? [[t.problemReported, slip.complaint]] : []),
  ]

  return (
    <Layout>
      {slip.isEmergency && <EmergencyTicketNotice />}
      <article className="slip card" aria-label={t.slipHeader}>
        <header className="slip__head">
          <div className="slip__crest">
            <Icon name="cross" size={18} color="#0f766e" />
            <span className="slip__hospital">{slip.hospital.name}</span>
          </div>
          <p className="slip__meta">
            {slip.hospital.address?.line}, {slip.hospital.address?.city} · {slip.serviceDate}
          </p>
          <div className="slip__badge">
            <Icon name="ticket" size={14} />
            <span>{t.slipHeader}</span>
          </div>
        </header>

        <div className="slip__token-box">
          <span className="slip__token-label">OPD TOKEN</span>
          <p className="slip__token" aria-label={`${t.token} ${slip.tokenNumber}`}>
            {slip.tokenNumber}
          </p>
          <span className="slip__token-dept">{dept} · {slip.room}</span>
        </div>

        <dl className="summary-list">
          {rows.map(([label, value]) => (
            <div key={label} className="summary-list__item">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="slip__qr">
          <QrCode value={trackUrl} label={t.qrCaption} />
          <p className="slip__qr-caption">{t.qrCaption}</p>
        </div>

        <p className="slip__disclaimer">{pick(slip.disclaimer, 'slipDisclaimer')}</p>
        <p className="field__hint">{f('emergencyNumbers', { phone: slip.hospital.contact?.emergencyPhone || '108' })}</p>
      </article>

      <p className="field__hint no-print text-center">{t.slipSnapshotNote}</p>

      <div className="slip__actions no-print">
        <Link className="btn btn--primary btn--lg" to={`/my-turn/${slip.publicId}`}>
          <Icon name="clock" size={18} />
          <span>{t.trackTurn}</span>
        </Link>
        <Link className="btn btn--outline" to={`/map?${mapQuery}`}>
          <Icon name="map-pin" size={18} />
          <span>{t.directionsToRoom}</span>
        </Link>
        <button type="button" className="btn btn--outline" onClick={() => window.print()}>
          <Icon name="print" size={18} />
          <span>{t.printSlip}</span>
        </button>
        <ListenButton text={speech} />
      </div>
    </Layout>
  )
}
