import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useSocket } from '../api/socket.js'
import { useHospital } from '../context/Hospital.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { canSpeak, speak, stopSpeaking } from '../utils/speech.js'
import '../components/staff/board.css'

// Interface words on the board, in every language it alternates between.
const WORDS = {
  en: {
    hall: 'OPD waiting hall',
    now: 'Now serving',
    next: 'Next',
    none: 'Please wait',
    noNext: 'No one waiting',
    room: 'Room',
    floor: 'Floor',
    breakUntil: (t) => `Doctor on break until ${t}`,
    onBreak: 'Doctor on break',
    late: (m) => `Doctor running ${m} min late`,
    off: 'Doctor not available',
    calling: 'Calling',
    goTo: 'please go to',
  },
  hi: {
    hall: 'ओपीडी प्रतीक्षा कक्ष',
    now: 'अभी बुलाया गया',
    next: 'अगले',
    none: 'कृपया प्रतीक्षा करें',
    noNext: 'कोई प्रतीक्षा में नहीं',
    room: 'कमरा',
    floor: 'मंज़िल',
    breakUntil: (t) => `डॉक्टर ${t} तक ब्रेक पर`,
    onBreak: 'डॉक्टर ब्रेक पर',
    late: (m) => `डॉक्टर ${m} मिनट देरी से`,
    off: 'डॉक्टर उपलब्ध नहीं',
    calling: 'बुलाया जा रहा है',
    goTo: 'कृपया जाएं',
  },
  te: {
    hall: 'ఓపీడీ నిరీక్షణ హాల్',
    now: 'ఇప్పుడు పిలుస్తున్నారు',
    next: 'తదుపరి',
    none: 'దయచేసి వేచి ఉండండి',
    noNext: 'ఎవరూ వేచి లేరు',
    room: 'గది',
    floor: 'అంతస్తు',
    breakUntil: (t) => `డాక్టర్ ${t} వరకు విరామంలో`,
    onBreak: 'డాక్టర్ విరామంలో',
    late: (m) => `డాక్టర్ ${m} నిమి ఆలస్యం`,
    off: 'డాక్టర్ అందుబాటులో లేరు',
    calling: 'పిలుస్తున్నారు',
    goTo: 'దయచేసి వెళ్ళండి',
  },
}
const LANG_NAME = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' }
const ROTATE_MS = 8000
const FLASH_MS = 8000

const timeOf = (v) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '')
const roomNumber = (room = '') => room.replace(/^room\s*/i, '')
const roomIn = (room, lang) => (/^room\s*/i.test(room || '') ? `${WORDS[lang].room} ${roomNumber(room)}` : room)

/** Spoken form of a token: "MED-042" → "M E D 42", so speech engines read letters and a plain number. */
function spokenToken(token = '') {
  const m = token.match(/^([A-Za-z]+)-?0*(\d+)$/)
  return m ? `${m[1].toUpperCase().split('').join(' ')} ${m[2]}` : token
}

/** Accepts the board's `rooms` list, or a `departments` list with nested rooms (defensive while the backend changes). */
function normalise(data) {
  if (!data) return []
  if (Array.isArray(data.rooms)) {
    return data.rooms.map((r) => ({
      ...r,
      nowServing: Array.isArray(r.nowServing) ? (r.nowServing[0]?.tokenNumber ?? r.nowServing[0] ?? null) : (r.nowServing ?? null),
      nextTokens: (r.nextTokens || []).map((t) => (typeof t === 'string' ? t : t.tokenNumber)).slice(0, 3),
      translations: r.departmentTranslations || r.translations || {},
      until: r.doctorUntil || r.until || r.doctorStatus?.until || null,
    }))
  }
  if (Array.isArray(data.departments)) {
    return data.departments.flatMap((d) =>
      (d.rooms?.length ? d.rooms : ['']).map((room) => {
        const serving = (d.nowServing || []).find((s) => !s.room || s.room === room)
        const doc = (d.doctors || []).find((x) => x.room === room)
        return {
          departmentCode: d.code,
          departmentName: d.name,
          translations: d.translations || {},
          floor: d.floor,
          room,
          doctorName: doc?.name,
          doctorState: doc?.status?.state ?? doc?.state,
          delayMinutes: doc?.status?.delayMinutes ?? doc?.delayMinutes ?? 0,
          until: doc?.status?.until ?? doc?.until ?? null,
          nowServing: serving ? (serving.tokenNumber ?? serving) : null,
          nextTokens: (d.nextTokens || d.waiting || []).map((t) => (typeof t === 'string' ? t : t.tokenNumber)).slice(0, 3),
        }
      }),
    )
  }
  return []
}

function statusLine(room, w) {
  if (room.doctorState === 'running_late' && room.delayMinutes > 0) return { tone: 'late', text: w.late(room.delayMinutes), icon: 'clock' }
  if (room.doctorState === 'on_break') return { tone: 'late', text: room.until ? w.breakUntil(timeOf(room.until)) : w.onBreak, icon: 'coffee' }
  if (room.doctorState === 'offline' || room.doctorState === 'unassigned') return { tone: 'off', text: w.off, icon: 'alert' }
  return null
}

function RoomCard({ room, lang, flash }) {
  const w = WORDS[lang]
  const deptName = (lang !== 'en' && room.translations?.[lang]?.name) || room.departmentName
  const status = statusLine(room, w)
  return (
    <article className={`tvb-room${flash ? ' tvb-room--flash' : ''}`} aria-label={`${room.room}, ${room.departmentName}`}>
      <header className="tvb-room__head">
        <div>
          <h2 className="tvb-room__room">{roomIn(room.room, lang)}</h2>
          <p className="tvb-room__dept">{deptName}</p>
        </div>
        {room.floor !== undefined && room.floor !== null && (
          <span className="tvb-room__floor">
            {w.floor} {room.floor}
          </span>
        )}
      </header>
      <div>
        <p className="tvb-label">{w.now}</p>
        {room.nowServing ? (
          <p className="tvb-room__token" key={room.nowServing}>
            {room.nowServing}
          </p>
        ) : (
          <p className="tvb-room__token tvb-room__token--none">{w.none}</p>
        )}
      </div>
      <div>
        <p className="tvb-label">{w.next}</p>
        <div className="tvb-room__next">
          {room.nextTokens.length ? (
            room.nextTokens.map((t) => (
              <span key={t} className="tvb-next">
                {t}
              </span>
            ))
          ) : (
            <span className="tvb-next--none">{w.noNext}</span>
          )}
        </div>
      </div>
      {status && (
        <p className={`tvb-status tvb-status--${status.tone}`}>
          <Icon name={status.icon} size={20} /> {status.text}
        </p>
      )}
      {room.doctorName && <p className="tvb-room__doctor">{room.doctorName}</p>}
    </article>
  )
}

export default function WaitingBoard() {
  const { hospital } = useHospital()
  const code = hospital?.code
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [soundOn, setSoundOn] = useState(false)
  const [flash, setFlash] = useState(null) // { key, call }
  const [clock, setClock] = useState(() => new Date())
  const [langIdx, setLangIdx] = useState(0)
  const soundRef = useRef(false)
  const timer = useRef(null)
  const flashTimer = useRef(null)
  const roomsRef = useRef([])
  soundRef.current = soundOn

  const load = useCallback(async () => {
    if (!code) return
    try {
      setData(await api.board())
      setError(null)
    } catch (e) {
      setError(e)
    }
  }, [code])

  const refresh = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(load, 250)
  }, [load])

  useEffect(() => {
    load()
    const poll = setInterval(load, 30000)
    return () => {
      clearInterval(poll)
      clearTimeout(timer.current)
    }
  }, [load])

  useEffect(() => {
    document.title = `${hospital?.name || 'Queue Mitra'} · Waiting-room board`
  }, [hospital])

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => {
      clearInterval(t)
      clearTimeout(flashTimer.current)
      stopSpeaking()
    }
  }, [])

  const rooms = useMemo(() => normalise(data), [data])
  roomsRef.current = rooms
  // Languages to alternate: English and Hindi always, Telugu when the departments have Telugu names.
  const langs = useMemo(() => (rooms.some((r) => r.translations?.te?.name) ? ['en', 'hi', 'te'] : ['en', 'hi']), [rooms])
  useEffect(() => {
    const t = setInterval(() => setLangIdx((i) => i + 1), ROTATE_MS)
    return () => clearInterval(t)
  }, [])
  const lang = langs[langIdx % langs.length]
  const w = WORDS[lang]

  const announce = useCallback((call) => {
    const room = call.room || ''
    const token = spokenToken(call.tokenNumber)
    const info = roomsRef.current.find((r) => r.room === room)
    const en = `Token ${token}, please go to ${room}${call.floor !== undefined && call.floor !== null ? `, floor ${call.floor}` : ''}.`
    const hi = `टोकन ${token}, कृपया ${roomIn(room, 'hi')} में जाएं।`
    const te = info?.translations?.te?.name ? `టోకెన్ ${token}, దయచేసి ${roomIn(room, 'te')} కి వెళ్ళండి.` : null
    speak(en, 'en', { onEnd: () => speak(hi, 'hi', te ? { onEnd: () => speak(te, 'te') } : undefined) })
  }, [])

  const onCalled = useCallback(
    (call) => {
      if (!call?.tokenNumber) return refresh()
      setFlash({ key: `${call.department || ''}|${call.room || ''}`, room: call.room, call })
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS)
      if (soundRef.current) announce(call)
      refresh()
    },
    [announce, refresh],
  )

  const connected = useSocket({
    join: hospital?._id || data?.hospital?._id ? [['board:join', hospital?._id || data.hospital._id]] : [],
    on: { 'queue:updated': refresh, 'hospital:updated': refresh, 'token:called': onCalled, connect: refresh },
  })

  const turnOn = () => {
    setSoundOn(true)
    speak('Announcements are on.', 'en')
  }

  const isFlash = (r) =>
    flash && (flash.key === `${r.departmentName}|${r.room}` || (flash.room && flash.room === r.room && flash.call.tokenNumber === r.nowServing))

  return (
    <div className="tvb" lang={lang === 'en' ? 'en' : lang}>
      <header className="tvb-head">
        <div className="tvb-head__brand">
          <span className="tvb-head__mark" aria-hidden="true">
            <Icon name="queue" size={28} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1>{data?.hospital?.name || hospital?.name || 'Queue Mitra'}</h1>
            <p>{w.hall}</p>
          </div>
        </div>
        <div className="tvb-head__right">
          <span className={`tvb-live${connected ? '' : ' tvb-live--off'}`} role="status">
            <span className="tvb-live__dot" aria-hidden="true" />
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
          <time className="tvb-clock" dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </header>

      <div className="tvb-bar">
        <span className="tvb-bar__lang" aria-hidden="true">
          {langs.map((l) => LANG_NAME[l]).join(' · ')}
        </span>
        {canSpeak &&
          (soundOn ? (
            <button
              type="button"
              className="tvb-btn tvb-btn--quiet"
              onClick={() => {
                setSoundOn(false)
                stopSpeaking()
              }}
            >
              <Icon name="volume-off" size={22} /> Turn off announcements
            </button>
          ) : (
            <button type="button" className="tvb-btn" onClick={turnOn}>
              <Icon name="volume" size={22} /> Tap to turn on announcements
            </button>
          ))}
      </div>

      {flash?.call && (
        <div className="tvb-call" role="status" aria-live="assertive">
          <Icon name="megaphone" size={32} />
          <span>
            {w.calling}: <strong>{flash.call.tokenNumber}</strong> → {roomIn(flash.call.room, lang)}
          </span>
        </div>
      )}

      {error && data && <p className="tvb-error">Connection problem — showing the last update. Retrying…</p>}

      <main className="tvb-main">
        {!data && !error && (
          <div className="tvb-grid" aria-busy="true" aria-label="Loading">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="tvb-skel" />
            ))}
          </div>
        )}
        {!data && error && (
          <div className="tvb-empty" role="alert">
            <Icon name="wifi" size={56} />
            <h2>Cannot reach the queue server</h2>
            <p>The board will update by itself as soon as the connection is back.</p>
          </div>
        )}
        {data && rooms.length === 0 && (
          <div className="tvb-empty">
            <Icon name="tv" size={64} />
            <h2>Queue display will appear here once OPD departments are set up</h2>
            <p>प्रतीक्षा सूची यहाँ दिखेगी जब ओपीडी विभाग जोड़ दिए जाएंगे।</p>
          </div>
        )}
        {rooms.length > 0 && (
          <div className="tvb-grid">
            {rooms.map((r) => (
              <RoomCard key={`${r.departmentCode}|${r.room}`} room={r} lang={lang} flash={isFlash(r)} />
            ))}
          </div>
        )}
      </main>

      <footer className="tvb-foot">
        <span className="tvb-foot__msg">
          <Icon name="emergency" size={26} />
          <span>Emergency? Go to Casualty, Ground Floor — no token needed · Call 112 / Ambulance 108</span>
          <span className="tvb-foot__sep" aria-hidden="true">
            |
          </span>
          <span lang="hi">आपातकाल? भूतल पर कैजुअल्टी जाएं — टोकन की ज़रूरत नहीं · 112 / एम्बुलेंस 108</span>
        </span>
      </footer>
    </div>
  )
}
