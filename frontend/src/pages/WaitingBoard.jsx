import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useSocket } from '../api/socket.js'
import { useAsync } from '../hooks/useAsync.js'
import { Link } from '../router.jsx'
import { canSpeak, speak } from '../utils/speech.js'
import { Icon } from '../components/common/Icons.jsx'

// Wings as laid out on the first floor (see the hospital map): left wing rooms 1-4, right wing rooms 5-8.
const LEFT = ['MED', 'CHD', 'WOM']
const RIGHT = ['ORT', 'ENT', 'EYE', 'SKN']
const ANNOUNCE_LANGS = ['hi', 'en', 'te']

function announcement(call, rooms, lang) {
  const info = rooms.find((r) => r.room === call.room && r.departmentName === call.department)
  const dept = (lang !== 'en' && (info?.departmentTranslations?.[lang]?.name || info?.translations?.[lang]?.name)) || call.department
  return {
    hi: `टोकन ${call.tokenNumber}, कृपया मंजिल ${call.floor} पर ${call.room} (${dept}) में जाएं।`,
    en: `Token ${call.tokenNumber}, please proceed to ${call.room} (${dept}) on Floor ${call.floor}.`,
    te: `టోకెన్ ${call.tokenNumber}, దయచేసి అంతస్తు ${call.floor} లోని ${call.room} (${dept}) కి వెళ్లండి.`,
  }[lang]
}

function RoomCard({ room, flash }) {
  const late = room.doctorState === 'running_late'
  const away = room.doctorState === 'on_break' || room.doctorState === 'offline'
  return (
    <article className={`board-room${flash ? ' board-room--flash' : ''}`} aria-label={`${room.room} ${room.departmentName}`}>
      <header className="board-room__info">
        <h2>
          {room.room} · {room.departmentName}
        </h2>
        <p className="board-room__alt">
          {room.departmentTranslations?.hi?.name || ''} {room.departmentTranslations?.te?.name ? `· ${room.departmentTranslations.te.name}` : ''}
        </p>
        <p className="board-room__doctor">
          {room.doctorName}
          {late && <span className="board-tag board-tag--late"> · Running {room.delayMinutes} min late</span>}
          {away && <span className="board-tag board-tag--late"> · {room.doctorState === 'on_break' ? 'On break' : 'Not available'}</span>}
        </p>
      </header>
      <div className="board-room__queue">
        <p className="board-room__label">Now serving · अभी · ఇప్పుడు</p>
        <p className="board-room__token">{room.nowServing || '—'}</p>
        <p className="board-room__next">
          <span className="board-room__label">Next · अगला · తర్వాత</span>
          {room.nextTokens.length ? room.nextTokens.map((n) => <span key={n}>{n}</span>) : <span className="board-room__none">—</span>}
        </p>
      </div>
    </article>
  )
}

export default function WaitingBoard() {
  const { data: hospital } = useAsync(() => api.hospital(), [])
  const { data, error, reload } = useAsync(() => api.board(), [])
  const [soundOn, setSoundOn] = useState(false)
  const [flash, setFlash] = useState(null)
  const [clock, setClock] = useState(() => new Date())
  const rooms = useRef([])
  const spoken = useRef(0)
  const soundRef = useRef(false)
  const refreshTimer = useRef(null)

  rooms.current = data?.rooms ?? []
  soundRef.current = soundOn

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000)
    const poll = setInterval(() => reload(true), 30000) // safety net if a socket event is missed
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      clearTimeout(refreshTimer.current)
    }
  }, [reload])

  const refresh = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => reload(true), 250)
  }, [reload])

  const onCalled = useCallback(
    (call) => {
      setFlash(`${call.department}|${call.room}`)
      setTimeout(() => setFlash(null), 7000)
      if (soundRef.current) {
        const lang = ANNOUNCE_LANGS[spoken.current++ % ANNOUNCE_LANGS.length] // alternate languages
        speak(announcement(call, rooms.current, lang), lang)
      }
      refresh()
    },
    [refresh]
  )

  // The board room is named after the hospital's database id (not its code).
  const connected = useSocket({
    join: hospital ? [['board:join', hospital.hospital._id]] : [],
    on: { 'queue:updated': refresh, 'token:called': onCalled },
  })

  const byDept = (codes) => codes.flatMap((c) => rooms.current.filter((r) => r.departmentCode === c))

  return (
    <div className="board">
      <header className="board__head">
        <div>
          <h1>{data?.hospital.name ?? 'City District Hospital'}</h1>
          <p>OPD · First Floor</p>
        </div>
        <div className="board__clock" aria-live="off">
          {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          <span className={`live live--${connected ? 'on' : 'off'}`} title={connected ? 'Live' : 'Reconnecting'} />
        </div>
      </header>

      {!soundOn && canSpeak && (
        <button type="button" className="btn board__sound" onClick={() => setSoundOn(true)}>
          <Icon name="volume" size={20} /> Tap to turn on spoken announcements
        </button>
      )}
      {error && !data && <p className="board__error">Cannot reach the server. Retrying…</p>}

      <div className="board__grid">
        <section aria-label="Left wing">
          {byDept(LEFT).map((r) => (
            <RoomCard key={r.room} room={r} flash={flash === `${r.departmentName}|${r.room}`} />
          ))}
        </section>
        <section aria-label="Right wing">
          {byDept(RIGHT).map((r) => (
            <RoomCard key={r.room} room={r} flash={flash === `${r.departmentName}|${r.room}`} />
          ))}
        </section>
      </div>
      <footer className="board__foot">
        <p>Emergency: Casualty, Ground Floor · Call 112 / 108 · आपातकाल: भूतल · అత్యవసరం: గ్రౌండ్ ఫ్లోర్</p>
        <Link to="/">Exit</Link>
      </footer>
    </div>
  )
}
