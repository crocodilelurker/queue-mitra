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
      <strong>{doctor.name}</strong> · {doctor.room} · {status}
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

  // Doctor status and room list come from the department queue (public endpoint).
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
      // Alert when the patient moves to 3 or fewer ahead (sound + vibration; the banner stays on screen).
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

  // After a dropped connection, refresh once so nothing is missed.
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
      <div className="turn-head">
        <p className="turn-head__token">{ticket.tokenNumber}</p>
        <p>
          {ticket.firstName} · {dept}
        </p>
        <p className="field__hint" aria-live="off">
          <span className={`live live--${connected ? 'on' : 'off'}`} aria-hidden="true" /> {connected ? t.liveOn : t.liveOff}
          {updatedAt && ` · ${f('updatedAt', { time: formatTime(updatedAt, lang) })}`}
        </p>
      </div>

      {ticket.isEmergency && (status === 'waiting' || status === 'called') && <EmergencyTicketNotice />}

      {status === 'called' && (
        <section className="turn-card turn-card--called" role="alert">
          <h1>{t.yourTurn}</h1>
          <p>{f('yourTurnBody', { room: ticket.room, doctor: ticket.doctorName || '' })}</p>
          <Link className="btn btn--primary" to={mapLink}>
            <span aria-hidden="true">🚶</span> {t.guideRoom}
          </Link>
        </section>
      )}

      {status === 'waiting' && (
        <>
          {ahead !== null && ahead <= 3 && (
            <section className="turn-card turn-card--close" role="alert">
              <strong>{f('closeAlert', { room, floor })}</strong>
            </section>
          )}
          <section className="turn-card" aria-live="polite">
            <p className="turn-card__big">{ahead}</p>
            <p>{ahead === 0 ? t.youAreNext : ahead === 1 ? t.aheadOne : f('aheadMany', { n: ahead })}</p>
            <p className="turn-card__wait">{f('aboutMin', { n: ticket.estimatedWaitMinutes })}</p>
            {ticket.nowServing?.length > 0 && (
              <p className="field__hint">
                {t.nowServing}: {ticket.nowServing.map((n) => `${n.tokenNumber} (${n.room})`).join(', ')}
              </p>
            )}
            <p className="field__hint">
              {t.goTo}: {room} · {f('floorN', { n: floor })}
            </p>
          </section>
          <Link className="btn" to={mapLink}>
            <span aria-hidden="true">🚶</span> {t.directionsToRoom}
          </Link>
        </>
      )}

      {status === 'completed' && <section className="turn-card">{t.finished}</section>}
      {status === 'no_show' && <section className="turn-card turn-card--close">{t.noShow}</section>}

      {queue?.doctors?.length > 0 && (
        <section className="box panel">
          <h2 className="form__title">{t.doctorStatus}</h2>
          <ul className="doc-list">
            {queue.doctors.map((d) => (
              <DoctorLine key={d.name} doctor={d} />
            ))}
          </ul>
        </section>
      )}

      {(ticket.urgentRaised || urgentSeen) && (
        <section className="emergency-note" role="status">
          <p>{urgentSeen && !ticket.urgentRaised ? t.urgentSeen : t.urgentSent}</p>
        </section>
      )}

      <details className="box panel" open={messages.length > 0 && messages.length < 3}>
        <summary>
          <span aria-hidden="true">💬</span> {t.smsTitle} ({messages.length})
        </summary>
        {messages.length === 0 ? (
          <p className="field__hint">{t.noMessages}</p>
        ) : (
          <ul className="sms-list">
            {messages.map((m) => (
              <li key={m.id}>
                <span className="field__hint">{formatTime(m.sentAt, lang)}</span>
                <p>{pick(m.message)}</p>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="box panel">
        <summary>
          <span aria-hidden="true">♿</span> {t.prefsTitle}
        </summary>
        <div className="toggles">
          <Toggle icon="♿" label={t.prefAvoidStairs} checked={prefs.avoidStairs} onChange={(v) => savePref('avoidStairs', v)} />
          <Toggle icon="🔠" label={t.prefLargeText} checked={prefs.largeText} onChange={(v) => savePref('largeText', v)} />
          <Toggle icon="🔊" label={t.prefReadAloud} checked={prefs.readAloud} onChange={(v) => savePref('readAloud', v)} />
          <Toggle icon="◐" label={t.prefHighContrast} checked={prefs.highContrast} onChange={(v) => savePref('highContrast', v)} />
        </div>
      </details>

      {(status === 'waiting' || status === 'called') && (
        <button type="button" className="btn btn--danger btn--block" onClick={() => setUrgentOpen(true)}>
          <span aria-hidden="true">🆘</span> {t.urgentBtn}
        </button>
      )}

      <Modal open={urgentOpen} onClose={() => setUrgentOpen(false)} title={t.urgentBtn}>
        <p>{t.urgentConfirm}</p>
        <ErrorNote error={urgentError} />
        <div className="form__actions">
          <button type="button" className="btn" onClick={() => setUrgentOpen(false)} disabled={urgentBusy}>
            <span aria-hidden="true">✕</span> {t.cancel}
          </button>
          <button type="button" className="btn btn--danger" onClick={raiseUrgent} disabled={urgentBusy}>
            <span aria-hidden="true">🆘</span> {urgentBusy ? t.loading : t.urgentYes}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
