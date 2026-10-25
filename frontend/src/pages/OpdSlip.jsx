import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import Layout from '../components/Layout.jsx'
import ShowStaff from '../components/ShowStaff.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import QrCode from '../components/common/QrCode.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { useAccess } from '../context/Access.jsx'
import { useAsync } from '../hooks/useAsync.js'
import en from '../i18n/en.js'
import { useI18n } from '../i18n/index.jsx'
import { Link, navigate } from '../router.jsx'
import { offlineRegistration, rememberTicket, SYNC_EVENT, syncedTicketFor, syncOfflineRegistrations } from '../utils/patientStore.js'
import { saveSlipImage } from '../utils/slipImage.js'

const PLACEHOLDER_DOCTORS = ['Assigned OPD Specialist', 'On Duty Doctor']

/** A registration made without internet: shown until the server confirms it and gives the token. */
function PendingSlip({ tempId }) {
  const { t, deptName } = useI18n()
  useDepartments()
  const item = offlineRegistration(tempId)

  useEffect(() => {
    const check = () => {
      const publicId = syncedTicketFor(tempId)
      if (publicId) navigate(`/slip/${publicId}`, { replace: true })
    }
    check()
    syncOfflineRegistrations()
    window.addEventListener(SYNC_EVENT, check)
    return () => window.removeEventListener(SYNC_EVENT, check)
  }, [tempId])

  if (!item && !syncedTicketFor(tempId)) {
    return (
      <Layout>
        <ErrorNote error={{ status: 404 }} />
        <Link className="btn btn--primary btn--block" to="/register">
          <Icon name="ticket" size={22} />
          <span>{t.cardRegister}</span>
        </Link>
      </Layout>
    )
  }

  return (
    <Layout>
      <article className="slip slip--pending" aria-live="polite">
        <p className="slip__pending-badge">
          <Icon name="clock" size={22} />
          <span>{t.pendingTitle}</span>
        </p>
        <p className="lead">{t.pendingBody}</p>
        {item && (
          <dl className="slip__rows">
            <div>
              <dt>{t.labelName}</dt>
              <dd>{item.payload.firstName}</dd>
            </div>
            <div>
              <dt>{t.labelDept}</dt>
              <dd>{deptName(item.payload.departmentCode)}</dd>
            </div>
          </dl>
        )}
        <p className="muted">{t.pendingCounter}</p>
      </article>
      <Link className="btn btn--outline btn--block" to="/map?to=reg_counters_0">
        <Icon name="compass" size={22} />
        <span>{t.showWayCounter}</span>
      </Link>
    </Layout>
  )
}

function Slip({ publicId }) {
  const { t, f, deptName, floorName, roomName } = useI18n()
  const { prefs } = useAccess()
  useDepartments()
  const { data: slip, error, loading, reload } = useAsync(() => api.slip(publicId), [publicId])
  const [large, setLarge] = useState(false)

  useEffect(() => {
    if (slip) rememberTicket(slip)
  }, [slip])

  if (loading) return <Layout><Loading /></Layout>
  if (error) return <Layout><ErrorNote error={error} onRetry={reload} /></Layout>

  const dept = deptName(slip.department)
  const floor = slip.department?.floor ?? 0
  const room = slip.room || ''
  const doctor = slip.doctorName && !PLACEHOLDER_DOCTORS.includes(slip.doctorName) ? slip.doctorName : null
  const waiting = slip.status === 'waiting'
  const ahead = slip.peopleAhead ?? 0
  const minutes = slip.estimatedWaitMinutes ?? 0
  const trackUrl = `${window.location.origin}/my-turn/${slip.publicId}`
  const mapQuery = new URLSearchParams({ room, dept: slip.department?.code || '' })
  if (prefs.avoidStairs || slip.accessibility?.avoidStairs) mapQuery.set('avoidStairs', '1')
  const where = room ? f('roomOnFloor', { room: roomName(room), floor: floorName(floor) }) : floorName(floor)

  const rows = [
    [t.labelDept, dept],
    [t.labelRoom, where],
    [t.labelDoctor, doctor || t.doctorAssigned],
    ...(waiting
      ? [
          [t.labelAhead, ahead === 0 ? t.youAreNext : ahead === 1 ? t.aheadOne : f('aheadMany', { n: ahead })],
          [t.labelWait, ahead === 0 ? t.waitSoon : f('aboutMin', { n: minutes })],
        ]
      : []),
  ]

  const speech = f('slipSpeech', { token: slip.tokenNumber.split('').join(' '), name: slip.patient.firstName, dept, where, ahead, minutes })

  const saveImage = () =>
    saveSlipImage(
      {
        hospital: slip.hospital?.name || t.appName,
        title: `${t.slipTitle} · ${slip.serviceDate || ''}`,
        tokenLabel: t.yourToken,
        token: slip.tokenNumber,
        name: slip.patient.firstName,
        rows,
        qrValue: trackUrl,
        qrCaption: t.qrCaption,
        footer: t.slipEmergencyNote,
      },
      `opd-slip-${slip.tokenNumber}.png`
    )

  const enFloor = en[`floor${floor}`] || `Floor ${floor}`
  return (
    <Layout>
      <article className="slip" aria-label={t.slipTitle}>
        <header className="slip__head">
          <p className="slip__hospital">{slip.hospital?.name}</p>
          <p className="slip__title">
            {t.slipTitle}
            {slip.serviceDate && <span className="slip__date"> · {slip.serviceDate}</span>}
          </p>
          <p className="slip__explain no-print">{t.opdShort}</p>
        </header>

        <div className="token-box">
          <p className="token-box__label">{t.yourToken}</p>
          <p className="token-box__value" aria-label={`${t.yourToken}: ${slip.tokenNumber}`}>
            {slip.tokenNumber}
          </p>
          <p className="token-box__explain no-print">{t.tokenExplain}</p>
        </div>

        <p className="slip__name">{slip.patient.firstName}</p>

        <dl className="slip__rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="slip__qr">
          <QrCode value={trackUrl} label={t.qrCaption} />
          <p>{t.qrCaption}</p>
        </div>
        <p className="slip__note">{t.slipEmergencyNote}</p>
      </article>

      <div className="slip-actions no-print">
        <Link className="btn btn--primary btn--block" to={`/map?${mapQuery}`}>
          <Icon name="compass" size={22} />
          <span>{t.showMeWay}</span>
        </Link>
        <Link className="btn btn--secondary btn--block" to={`/my-turn/${slip.publicId}`}>
          <Icon name="clock" size={22} />
          <span>{t.trackTurn}</span>
        </Link>
        <div className="tool-grid">
          <button type="button" className="btn btn--tool" onClick={saveImage}>
            <Icon name="download" size={22} />
            <span>{t.saveImage}</span>
          </button>
          <button type="button" className="btn btn--tool" onClick={() => window.print()}>
            <Icon name="print" size={22} />
            <span>{t.printSlip}</span>
          </button>
          <ListenButton text={speech} className="btn btn--tool" />
          <button type="button" className="btn btn--tool" onClick={() => setLarge(true)}>
            <Icon name="maximize" size={22} />
            <span>{t.showLarge}</span>
          </button>
        </div>
      </div>

      <ShowStaff
        open={large}
        onClose={() => setLarge(false)}
        title={t.yourToken}
        titleEn={en.yourToken}
        big={slip.tokenNumber}
        lines={[
          { label: t.labelName, value: slip.patient.firstName },
          { label: t.labelDept, value: dept, valueEn: slip.department?.name },
          { label: t.labelRoom, value: where, valueEn: room ? `${room}, ${enFloor}` : enFloor },
        ]}
      />
    </Layout>
  )
}

export default function OpdSlip({ publicId }) {
  return publicId.startsWith('local-') ? <PendingSlip tempId={publicId} /> : <Slip publicId={publicId} />
}
