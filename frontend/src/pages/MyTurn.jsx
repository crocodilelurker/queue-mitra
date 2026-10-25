import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import { useSocket } from '../api/socket.js'
import Layout from '../components/Layout.jsx'
import SmsToast from '../components/SmsToast.jsx'
import UrgentHelp from '../components/UrgentHelp.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { useAccess } from '../context/Access.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { formatTime } from '../utils/format.js'
import { askNotificationPermission, canNotify, notificationPermission, showNotification } from '../utils/notify.js'
import { rememberTicket } from '../utils/patientStore.js'
import { chime, vibrate } from '../utils/sound.js'
import { speak } from '../utils/speech.js'

const NEAR = 3 // alert when this many people (or fewer) are ahead

function once(key) {
  try {
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
  } catch {
    /* storage unavailable: alert anyway */
  }
  return true
}

function useMinutesSince(ts) {
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 20000)
    return () => clearInterval(timer)
  }, [])
  return ts ? Math.floor((Date.now() - ts) / 60000) : null
}

function DoctorStatus({ doctor }) {
  const { t, f, lang, roomName } = useI18n()
  const state = doctor.state || 'available'
  const text = {
    available: t.docInRoom,
    on_break: doctor.until ? f('docBreakUntil', { time: formatTime(doctor.until, lang) }) : t.docBreak,
    running_late: f('docLate', { n: doctor.delayMinutes || 0 }),
    offline: t.docOffline,
  }[state] || t.docInRoom
  const icon = { available: 'check-circle', on_break: 'coffee', running_late: 'clock', offline: 'user-x' }[state] || 'doctor'
  return (
    <li className={`doc-status doc-status--${state}`}>
      <Icon name={icon} size={24} />
      <div>
        <p className="doc-status__name">
          {doctor.name}
          {doctor.room && <span className="muted"> · {roomName(doctor.room)}</span>}
        </p>
        <p className="doc-status__state">{text}</p>
      </div>
    </li>
  )
}

export default function MyTurn({ publicId }) {
  const { t, f, lang, pick, deptName, floorName, floorWord, roomName } = useI18n()
  const { prefs } = useAccess()
  const { byCode } = useDepartments()
  const { data: ticket, error, loading, reload, setData } = useAsync(() => api.ticket(publicId), [publicId])
  const [queue, setQueue] = useState(null)
  const [messages, setMessages] = useState([])
  const [toast, setToast] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [urgentSeen, setUrgentSeen] = useState(false)
  const [calledOpen, setCalledOpen] = useState(false)
  const [permission, setPermission] = useState(notificationPermission)
  const minutesAgo = useMinutesSince(updatedAt)

  const deptCode = ticket?.department?.code
  const hospitalCode = ticket?.hospital?.code

  useEffect(() => {
    if (!ticket) return
    setUpdatedAt(Date.now())
    rememberTicket(ticket)
  }, [ticket])

  const loadQueue = useCallback(() => {
    if (!deptCode) return
    api.departmentQueue(deptCode, hospitalCode).then(setQueue).catch(() => {})
  }, [deptCode, hospitalCode])
  useEffect(loadQueue, [loadQueue, ticket?.status])

  useEffect(() => {
    api
      .notifications(publicId)
      .then((d) => setMessages((d.notifications || []).map((n) => ({ ...n, id: n._id }))))
      .catch(() => {})
  }, [publicId])

  // Fallback when the live connection is down: check again every minute.
  useEffect(() => {
    const timer = setInterval(() => reload(true), 60000)
    return () => clearInterval(timer)
  }, [reload])

  const room = ticket?.room || queue?.department?.rooms?.[0] || byCode[ticket?.department?.code]?.rooms?.[0] || ''
  const floor = ticket?.department?.floor ?? queue?.department?.floor ?? 0
  const where = room ? f('roomOnFloor', { room: roomName(room), floor: floorName(floor) }) : floorName(floor)

  // ---- Alerts: 3 people ahead, and "it's your turn" ----
  const ahead = ticket?.status === 'waiting' ? ticket.peopleAhead : null
  useEffect(() => {
    if (ahead === null || ahead === undefined || ahead > NEAR || !room) return
    if (!once(`qm-near-${publicId}`)) return
    const text = f('nearSms', { room: roomName(room), floor: floorWord(floor) })
    chime()
    vibrate([300, 150, 300])
    setToast({ id: `near-${publicId}`, text, sentAt: new Date().toISOString() })
    showNotification(t.nearTitle, text, `near-${publicId}`)
    if (prefs.readAloud) speak(text, lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ahead, publicId, room])

  useEffect(() => {
    if (ticket?.status !== 'called') return
    setCalledOpen(true)
    if (!once(`qm-called-${publicId}-${ticket.calledAt || ''}`)) return
    const text = f('calledBody', { where })
    chime()
    vibrate([400, 150, 400, 150, 400])
    showNotification(t.calledTitle, text, `called-${publicId}`)
    if (prefs.readAloud) speak(`${t.calledTitle}. ${text}`, lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.status, publicId])

  const connected = useSocket({
    join: [['ticket:join', publicId], ...(queue?.department?.id ? [['department:join', queue.department.id]] : [])],
    on: {
      'ticket:position': (d) => {
        if (d.publicId !== publicId) return
        setUpdatedAt(Date.now())
        setData((prev) => (prev ? { ...prev, status: 'waiting', peopleAhead: d.peopleAhead, estimatedWaitMinutes: d.estimatedWaitMinutes, nowServing: d.nowServing } : prev))
      },
      'ticket:called': (c) => {
        if (c.publicId !== publicId) return
        setUpdatedAt(Date.now())
        setData((prev) =>
          prev ? { ...prev, status: 'called', room: c.room, doctorName: c.doctorName, calledAt: c.calledAt, department: { ...prev.department, floor: c.floor ?? prev.department.floor } } : prev
        )
      },
      'ticket:sms': (m) => {
        setMessages((prev) => [m, ...prev.filter((x) => x.id !== m.id)])
        setToast(m)
      },
      'ticket:updated': (u) => {
        if (u.publicId !== publicId) return
        setUpdatedAt(Date.now())
        if (u.urgentSeen) {
          setUrgentSeen(true)
          setData((prev) => (prev ? { ...prev, urgentRaised: false } : prev))
        }
        if (u.status === 'waiting') reload(true)
        else if (u.status) setData((prev) => (prev ? { ...prev, status: u.status } : prev))
      },
      'ticket:transferred': (x) => x.publicId === publicId && reload(true),
      'queue:updated': (snap) => {
        setQueue(snap)
        setUpdatedAt(Date.now())
      },
      'hospital:updated': () => {
        reload(true)
        loadQueue()
      },
    },
  })

  // After a reconnect, fetch the latest position (events may have been missed).
  const wasConnected = useRef(false)
  useEffect(() => {
    if (connected && wasConnected.current === false && ticket) reload(true)
    wasConnected.current = connected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const closeToast = useCallback(() => setToast(null), [])

  if (loading) return <Layout><Loading /></Layout>
  if (error) return <Layout><ErrorNote error={error} onRetry={reload} /></Layout>

  const status = ticket.status
  const dept = deptName(ticket.department)
  const mapQuery = new URLSearchParams({ room, dept: deptCode || '' })
  if (prefs.avoidStairs) mapQuery.set('avoidStairs', '1')
  const mapLink = `/map?${mapQuery}`
  const nowServing = (ticket.nowServing?.length ? ticket.nowServing : queue?.nowServing) || []
  const doctors = queue?.doctors || []
  const minutes = ticket.estimatedWaitMinutes ?? 0

  const nextStep = {
    waiting: ahead !== null && ahead <= NEAR ? f('nextNear', { where }) : t.nextWait,
    called: f('calledBody', { where }),
    completed: t.nextDone,
    no_show: t.nextNoShow,
  }[status]

  const spoken = [
    `${t.yourToken} ${ticket.tokenNumber}`,
    status === 'waiting' && (ahead === 0 ? t.youAreNext : ahead === 1 ? t.aheadOne : f('aheadMany', { n: ahead })),
    status === 'waiting' && ahead > 0 && f('aboutMin', { n: minutes }),
    nextStep,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <Layout>
      <SmsToast sms={toast} onClose={closeToast} />

      <section className="turn-head">
        <div>
          <p className="turn-head__label">{t.yourToken}</p>
          <p className="turn-head__token">{ticket.tokenNumber}</p>
        </div>
        <div className="turn-head__who">
          <p className="turn-head__name">{ticket.firstName}</p>
          <p className="muted">{dept}</p>
        </div>
      </section>

      <p className={`live-status${connected ? ' is-live' : ''}`} role="status">
        <span className="live-status__dot" aria-hidden="true" />
        <span>
          {connected ? t.liveOn : t.liveOff}
          {minutesAgo !== null && ` · ${minutesAgo < 1 ? t.updatedJustNow : f('updatedMinAgo', { n: minutesAgo })}`}
        </span>
      </p>

      {status === 'waiting' && ahead !== null && ahead <= NEAR && (
        <section className="notice notice--near" role="alert">
          <Icon name="bell" size={26} />
          <div>
            <p className="notice__title">{t.nearTitle}</p>
            <p>{f('nearSms', { room: roomName(room) || t.yourRoom, floor: floorWord(floor) })}</p>
          </div>
        </section>
      )}

      {status === 'waiting' && (
        <section className="turn-card" aria-live="polite">
          <p className="turn-card__big">{ahead === 0 ? t.youAreNext : ahead === 1 ? t.aheadOne : f('aheadMany', { n: ahead })}</p>
          {ahead > 0 && (
            <p className="turn-card__wait">
              <Icon name="clock" size={24} />
              <span>{f('aboutMin', { n: minutes })}</span>
            </p>
          )}
          <dl className="turn-card__rows">
            <div>
              <dt>{t.nowServing}</dt>
              <dd>{nowServing.length ? nowServing.map((n) => n.tokenNumber).join(', ') : t.nobodyYet}</dd>
            </div>
            <div>
              <dt>{t.labelRoom}</dt>
              <dd>{where}</dd>
            </div>
          </dl>
        </section>
      )}

      {status === 'called' && (
        <section className="turn-card turn-card--called" role="alert">
          <p className="turn-card__big">{t.calledTitle}</p>
          <p className="turn-card__wait">{f('calledBody', { where })}</p>
        </section>
      )}

      {(status === 'completed' || status === 'no_show') && (
        <section className={`turn-card turn-card--${status}`}>
          <Icon name={status === 'completed' ? 'check-circle' : 'alert'} size={40} />
          <p className="turn-card__big">{status === 'completed' ? t.doneTitle : t.noShowTitle}</p>
        </section>
      )}

      <section className="next-step">
        <h2 className="section-title">{t.nextStepTitle}</h2>
        <p>{nextStep}</p>
      </section>

      {status === 'waiting' || status === 'called' ? (
        <Link className="btn btn--primary btn--block" to={mapLink}>
          <Icon name="compass" size={22} />
          <span>{t.showMeWay}</span>
        </Link>
      ) : (
        <Link className="btn btn--primary btn--block" to={status === 'completed' ? '/map?to=pharmacy_0' : '/map?to=help_desk_0'}>
          <Icon name="compass" size={22} />
          <span>{status === 'completed' ? t.showWayPharmacy : t.showWayHelpDesk}</span>
        </Link>
      )}

      {doctors.length > 0 && (status === 'waiting' || status === 'called') && (
        <section className="card">
          <h2 className="section-title">{t.doctorStatus}</h2>
          <ul className="doc-list">
            {doctors.map((d) => (
              <DoctorStatus key={`${d.name}-${d.room}`} doctor={d} />
            ))}
          </ul>
        </section>
      )}

      {canNotify && permission === 'default' && status === 'waiting' && (
        <button type="button" className="btn btn--outline btn--block" onClick={async () => setPermission(await askNotificationPermission())}>
          <Icon name="bell" size={22} />
          <span>{t.allowAlerts}</span>
        </button>
      )}

      <ListenButton text={spoken} label={t.listenPage} className="btn btn--ghost btn--block" />

      {(status === 'waiting' || status === 'called') && (
        <UrgentHelp publicId={publicId} raised={ticket.urgentRaised || urgentSeen} seen={urgentSeen} onRaised={() => setData((prev) => ({ ...prev, urgentRaised: true }))} />
      )}

      {messages.length > 0 && (
        <details className="messages">
          <summary>
            <Icon name="message" size={22} />
            <span>{f('messagesN', { n: messages.length })}</span>
          </summary>
          <ul className="sms-list">
            {messages.map((m) => (
              <li key={m.id}>
                <span className="muted small">{formatTime(m.sentAt, lang)}</span>
                <p>{m.text || pick(m.message)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {calledOpen && status === 'called' && (
        <div className="called-screen" role="alertdialog" aria-modal="true" aria-labelledby="called-title">
          <Icon name="bell" size={64} />
          <h1 id="called-title" className="called-screen__title">
            {t.calledTitle}
          </h1>
          <p className="called-screen__where">{f('calledGo', { where })}</p>
          <p className="called-screen__token">{ticket.tokenNumber}</p>
          <Link className="btn btn--light btn--block" to={mapLink}>
            <Icon name="compass" size={24} />
            <span>{t.showMeWay}</span>
          </Link>
          <button type="button" className="btn btn--ghost-light btn--block" onClick={() => setCalledOpen(false)}>
            <Icon name="close" size={22} />
            <span>{t.close}</span>
          </button>
        </div>
      )}
    </Layout>
  )
}
