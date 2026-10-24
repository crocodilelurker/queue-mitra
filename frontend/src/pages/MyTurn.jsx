import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import { useSocket } from '../api/socket.js'
import EmergencyTicketNotice from '../components/common/EmergencyTicketNotice.jsx'
import Modal from '../components/common/Modal.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Toggle from '../components/common/Toggle.jsx'
import Layout from '../components/Layout.jsx'
import SmsToast from '../components/SmsToast.jsx'
import { useAccess } from '../context/Access.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { formatTime } from '../utils/format.js'
import { chime, vibrate } from '../utils/sound.js'
import { Icon } from '../components/common/Icons.jsx'

function DoctorLine({ doctor }) {
  const { t, f, lang } = useI18n()
  const status = {
    available: t.docInRoom,
    on_break: f('docBreak', { time: formatTime(doctor.until, lang) }),
    running_late: f('docLate', { n: doctor.delayMinutes }),
    offline: t.docOffline,
  }[doctor.state]
  return (
    <li className={`doc doc--${doctor.state}`}>
      <div className="doc__indicator" />
      <div className="doc__details">
        <strong>{doctor.name}</strong>
        <span>{doctor.room} · {status}</span>
      </div>
    </li>
  )
}

export default function MyTurn({ publicId }) {
  const { t, f, lang, pick, deptName } = useI18n()
  const { prefs, setPref } = useAccess()
  useDepartments()
  const { data: ticket, error, loading, reload, setData } = useAsync(() => api.ticket(publicId), [publicId])
  const [queue, setQueue] = useState(null)
  const [messages, setMessages] = useState([])
  const [toast, setToast] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [urgentOpen, setUrgentOpen] = useState(false)
  const [urgentBusy, setUrgentBusy] = useState(false)
  const [urgentError, setUrgentError] = useState(null)
  const [urgentSeen, setUrgentSeen] = useState(false)
  const lastAhead = useRef(null)

  const hospitalCode = ticket?.hospital.code
  const deptCode = ticket?.department.code

  useEffect(() => {
    if (!deptCode) return
    api.departmentQueue(deptCode, hospitalCode).then(setQueue).catch(() => {})
  }, [deptCode, hospitalCode, ticket?.status])

  useEffect(() => {
    api.notifications(publicId).then((d) => setMessages(d.notifications.map((n) => ({ ...n, id: n._id })))).catch(() => {})
  }, [publicId])

  useEffect(() => {
    if (ticket && lastAhead.current === null) lastAhead.current = ticket.peopleAhead
  }, [ticket])

  const onPosition = useCallback(
    (d) => {
      if (d.publicId !== publicId) return
      if (d.peopleAhead <= 3 && lastAhead.current !== null && lastAhead.current > 3) {
        chime()
        vibrate()
      }
      lastAhead.current = d.peopleAhead
      setUpdatedAt(d.updatedAt)
      setData((prev) => (prev ? { ...prev, status: 'waiting', peopleAhead: d.peopleAhead, estimatedWaitMinutes: d.estimatedWaitMinutes, nowServing: d.nowServing } : prev))
    },
    [publicId, setData]
  )

  const connected = useSocket({
    join: [['ticket:join', publicId], ...(queue ? [['department:join', queue.department.id]] : [])],
    on: {
      'ticket:position': onPosition,
      'ticket:called': (c) => {
        if (c.publicId !== publicId) return
        chime()
        vibrate([300, 100, 300, 100, 300])
        setUpdatedAt(c.calledAt)
        setData((prev) => (prev ? { ...prev, status: 'called', room: c.room, doctorName: c.doctorName, calledAt: c.calledAt, department: { ...prev.department, floor: c.floor } } : prev))
      },
      'ticket:sms': (m) => {
        setMessages((prev) => [m, ...prev.filter((x) => x.id !== m.id)])
        setToast(m)
      },
      'ticket:updated': (u) => {
        if (u.publicId !== publicId) return
        if (u.urgentSeen) {
          setUrgentSeen(true)
          setData((prev) => (prev ? { ...prev, urgentRaised: false } : prev))
        }
        if (u.status === 'waiting') reload(true)
        else if (u.status) setData((prev) => (prev ? { ...prev, status: u.status } : prev))
      },
      'ticket:transferred': (x) => x.publicId === publicId && reload(true),
      'queue:updated': (snap) => setQueue(snap),
    },
  })

  const wasConnected = useRef(false)
  useEffect(() => {
    if (connected && wasConnected.current) reload(true)
    wasConnected.current = connected
  }, [connected, reload])

  const closeToast = useCallback(() => setToast(null), [])

  const raiseUrgent = async () => {
    setUrgentBusy(true)
    setUrgentError(null)
    try {
      await api.urgent(publicId)
      setData((prev) => ({ ...prev, urgentRaised: true }))
      setUrgentSeen(false)
      setUrgentOpen(false)
    } catch (err) {
      setUrgentError(err)
    } finally {
      setUrgentBusy(false)
    }
  }

  const savePref = (name, value) => {
    setPref(name, value)
    api.preferences(publicId, { language: lang, accessibility: { ...prefs, [name]: value } }).catch(() => {})
  }

  if (loading) return <Layout><Loading /></Layout>
  if (error) return <Layout><ErrorNote error={error} onRetry={reload} /></Layout>

  const status = ticket.status
  const dept = deptName(ticket.department)
  const rooms = queue?.department.rooms?.join(' / ') || ''
  const room = ticket.room || rooms
  const floor = ticket.department.floor
  const ahead = ticket.peopleAhead
  const mapLink = `/map?${new URLSearchParams({ room: ticket.room || queue?.department.rooms?.[0] || '', dept: deptCode })}`

  return (
    <Layout>
      <SmsToast sms={toast} onClose={closeToast} />

      <div className="turn-hero card">
        <div className="turn-hero__top">
          <div className="turn-hero__badge">
            <span className="slip__token-label">YOUR TOKEN</span>
            <span className="turn-hero__token">{ticket.tokenNumber}</span>
          </div>
          <div className="turn-hero__status">
            <span className={`live-beacon ${connected ? 'live-beacon--connected' : ''}`}>
              <span className="live-beacon__dot" />
              <span>{connected ? t.liveOn : t.liveOff}</span>
            </span>
            {updatedAt && <span className="turn-hero__sync">{f('updatedAt', { time: formatTime(updatedAt, lang) })}</span>}
          </div>
        </div>

        <div className="turn-hero__patient">
          <strong>{ticket.firstName}</strong>
          <span>{dept} · Floor {floor}</span>
        </div>
      </div>

      {ticket.isEmergency && (status === 'waiting' || status === 'called') && <EmergencyTicketNotice />}

      {status === 'called' && (
        <section className="turn-card turn-card--called card" role="alert">
          <div className="turn-card__called-icon">
            <Icon name="bell" size={32} />
          </div>
          <h1 className="turn-card__called-title">{t.yourTurn}</h1>
          <p className="turn-card__called-desc">{f('yourTurnBody', { room: ticket.room, doctor: ticket.doctorName || '' })}</p>
          <Link className="btn btn--primary btn--lg" to={mapLink}>
            <Icon name="map-pin" size={20} />
            <span>{t.guideRoom}</span>
          </Link>
        </section>
      )}

      {status === 'waiting' && (
        <>
          {ahead !== null && ahead <= 3 && (
            <section className="turn-alert-banner card" role="alert">
              <Icon name="bell" size={22} />
              <div>
                <strong>Turn Approaching!</strong>
                <p>{f('closeAlert', { room, floor })}</p>
              </div>
            </section>
          )}

          <section className="turn-metrics card" aria-live="polite">
            <div className="turn-metrics__ahead-box">
              <span className="turn-metrics__number">{ahead}</span>
              <span className="turn-metrics__label">
                {ahead === 0 ? t.youAreNext : ahead === 1 ? t.aheadOne : f('aheadMany', { n: ahead })}
              </span>
            </div>

            <div className="turn-metrics__wait-chip">
              <Icon name="clock" size={16} />
              <span>{f('aboutMin', { n: ticket.estimatedWaitMinutes })}</span>
            </div>

            <div className="turn-metrics__meta">
              {ticket.nowServing?.length > 0 && (
                <div className="turn-metrics__meta-row">
                  <span className="meta-label">{t.nowServing}:</span>
                  <strong>{ticket.nowServing.map((n) => `${n.tokenNumber} (${n.room})`).join(', ')}</strong>
                </div>
              )}
              <div className="turn-metrics__meta-row">
                <span className="meta-label">{t.goTo}:</span>
                <strong>{room} · {f('floorN', { n: floor })}</strong>
              </div>
            </div>

            <Link className="btn btn--primary btn--block" to={mapLink}>
              <Icon name="compass" size={18} />
              <span>{t.directionsToRoom}</span>
            </Link>
          </section>
        </>
      )}

      {status === 'completed' && (
        <section className="turn-card card text-center">
          <Icon name="check" size={36} color="#157238" />
          <p className="mt-2 font-semibold">{t.finished}</p>
        </section>
      )}

      {status === 'no_show' && (
        <section className="turn-card card text-center">
          <Icon name="alert" size={36} color="#dc2626" />
          <p className="mt-2 font-semibold">{t.noShow}</p>
        </section>
      )}

      {queue?.doctors?.length > 0 && (
        <section className="card panel">
          <h2 className="panel__title">
            <Icon name="doctor" size={18} />
            <span>{t.doctorStatus}</span>
          </h2>
          <ul className="doc-list">
            {queue.doctors.map((d) => (
              <DoctorLine key={d.name} doctor={d} />
            ))}
          </ul>
        </section>
      )}

      {(ticket.urgentRaised || urgentSeen) && (
        <section className="emergency-note" role="status">
          <Icon name="alert" size={18} />
          <p>{urgentSeen && !ticket.urgentRaised ? t.urgentSeen : t.urgentSent}</p>
        </section>
      )}

      <details className="card panel" open={messages.length > 0 && messages.length < 3}>
        <summary className="panel__summary">
          <Icon name="chat" size={18} />
          <span>{t.smsTitle} ({messages.length})</span>
        </summary>
        {messages.length === 0 ? (
          <p className="field__hint mt-2">{t.noMessages}</p>
        ) : (
          <ul className="sms-list">
            {messages.map((m) => (
              <li key={m.id} className="sms-list__item">
                <span className="sms-list__time">{formatTime(m.sentAt, lang)}</span>
                <p className="sms-list__body">{pick(m.message)}</p>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="card panel">
        <summary className="panel__summary">
          <Icon name="user" size={18} />
          <span>{t.prefsTitle}</span>
        </summary>
        <div className="toggles mt-2">
          <Toggle iconName="map" label={t.prefAvoidStairs} checked={prefs.avoidStairs} onChange={(v) => savePref('avoidStairs', v)} />
          <Toggle iconName="sparkles" label={t.prefLargeText} checked={prefs.largeText} onChange={(v) => savePref('largeText', v)} />
          <Toggle iconName="speaker" label={t.prefReadAloud} checked={prefs.readAloud} onChange={(v) => savePref('readAloud', v)} />
          <Toggle iconName="eye" label={t.prefHighContrast} checked={prefs.highContrast} onChange={(v) => savePref('highContrast', v)} />
        </div>
      </details>

      {(status === 'waiting' || status === 'called') && (
        <button type="button" className="btn btn--danger btn--block" onClick={() => setUrgentOpen(true)}>
          <Icon name="emergency" size={18} />
          <span>{t.urgentBtn}</span>
        </button>
      )}

      <Modal open={urgentOpen} onClose={() => setUrgentOpen(false)} title={t.urgentBtn}>
        <p>{t.urgentConfirm}</p>
        <ErrorNote error={urgentError} />
        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={() => setUrgentOpen(false)} disabled={urgentBusy}>
            <Icon name="close" size={16} />
            <span>{t.cancel}</span>
          </button>
          <button type="button" className="btn btn--danger" onClick={raiseUrgent} disabled={urgentBusy}>
            <Icon name="emergency" size={16} />
            <span>{urgentBusy ? t.loading : t.urgentYes}</span>
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
