import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import ListenButton from '../components/common/ListenButton.jsx'
import QrCode from '../components/common/QrCode.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Layout from '../components/Layout.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'

const PLACEHOLDER_DOCTOR = 'Assigned OPD Specialist' // what the backend sends before a doctor calls the patient

export default function OpdSlip({ publicId }) {
  const { t, f, pick, deptName } = useI18n()
  useDepartments() // loads translated department names
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
  ]

  return (
    <Layout>
      <article className="box slip" aria-label={t.slipHeader}>
        <header className="slip__head">
          <p className="slip__hospital">{slip.hospital.name}</p>
          <p className="field__hint">
            {slip.hospital.address?.line}, {slip.hospital.address?.city} · {slip.serviceDate}
          </p>
          <p className="slip__label">{t.slipHeader}</p>
        </header>
        <p className="slip__token" aria-label={`${t.token} ${slip.tokenNumber}`}>
          {slip.tokenNumber}
        </p>
        <dl className="summary">
          {rows.map(([label, value]) => (
            <div key={label} className="summary__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="slip__qr">
          <QrCode value={trackUrl} label={t.qrCaption} />
          <p className="field__hint">{t.qrCaption}</p>
        </div>
        <p className="slip__disclaimer">{pick(slip.disclaimer)}</p>
        <p className="field__hint">{f('emergencyNumbers', { phone: slip.hospital.contact?.emergencyPhone || '108' })}</p>
      </article>

      <p className="field__hint no-print">{t.slipSnapshotNote}</p>
      <div className="slip__actions no-print">
        <Link className="btn btn--primary" to={`/my-turn/${slip.publicId}`}>
          <span aria-hidden="true">⏱️</span> {t.trackTurn}
        </Link>
        <Link className="btn" to={`/map?${mapQuery}`}>
          <span aria-hidden="true">🚶</span> {t.directionsToRoom}
        </Link>
        <button type="button" className="btn" onClick={() => window.print()}>
          <span aria-hidden="true">🖨️</span> {t.printSlip}
        </button>
        <ListenButton text={speech} />
      </div>
    </Layout>
  )
}
