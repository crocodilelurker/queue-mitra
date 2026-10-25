import { useI18n } from '../../i18n/index.jsx'
import { placeNameFor } from '../../i18n/places.js'
import { departmentForRoom } from '../../api/departments.js'
import { Icon } from '../common/Icons.jsx'
import { floorPlan, routeLine } from './floorPlans.js'
import { placeIconName } from './placeIcons.js'

const FONT = "'Inter Variable', Inter, 'Noto Sans', system-ui, sans-serif"
let measureCtx = null
function textWidth(text, size, weight = 600) {
  measureCtx ||= document.createElement('canvas').getContext('2d')
  measureCtx.font = `${weight} ${size}px ${FONT}`
  return measureCtx.measureText(text).width
}

/** Splits text into lines that fit `maxW`, shrinking the font a little if a single word is too long. */
function fitLines(text, maxW, maxLines, size, weight) {
  for (let s = size; s >= 10; s -= 1) {
    const words = String(text).split(/\s+/).filter(Boolean)
    const lines = []
    let line = ''
    let tooWide = false
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (textWidth(test, s, weight) <= maxW) line = test
      else {
        if (line) lines.push(line)
        line = word
        if (textWidth(word, s, weight) > maxW) tooWide = true
      }
    }
    if (line) lines.push(line)
    if (!tooWide && lines.length <= maxLines) return { lines, size: s }
  }
  // Last resort: keep the first lines; the SVG squeezes them to fit (textLength).
  const words = String(text).split(/\s+/)
  const per = Math.ceil(words.length / maxLines)
  return { lines: Array.from({ length: maxLines }, (_, i) => words.slice(i * per, (i + 1) * per).join(' ')).filter(Boolean), size: 10, squeeze: true }
}

function RoomLabel({ room, title, subtitle, icon, iconColor }) {
  const maxW = room.w - 12
  const t1 = fitLines(title, maxW, subtitle ? 2 : 3, 17, 700)
  const t2 = subtitle ? fitLines(subtitle, maxW, room.h > 70 ? 3 : 2, 14, 500) : null
  const lineH1 = t1.size * 1.2
  const lineH2 = t2 ? t2.size * 1.2 : 0
  const textH = t1.lines.length * lineH1 + (t2 ? t2.lines.length * lineH2 + 2 : 0)
  const showIcon = icon && room.h - textH >= 28
  const blockH = textH + (showIcon ? 24 : 0)
  let y = room.y + (room.h - blockH) / 2
  const cx = room.x + room.w / 2
  const out = []
  if (showIcon) {
    out.push(<Icon key="i" name={icon} size={20} x={cx - 10} y={y} color={iconColor} />)
    y += 24
  }
  t1.lines.forEach((line, i) => {
    y += lineH1
    out.push(
      <text key={`a${i}`} x={cx} y={y - lineH1 * 0.22} className="plan__label" fontSize={t1.size} textAnchor="middle" {...(t1.squeeze && textWidth(line, t1.size, 700) > maxW ? { textLength: maxW, lengthAdjust: 'spacingAndGlyphs' } : {})}>
        {line}
      </text>
    )
  })
  if (t2) {
    y += 2
    t2.lines.forEach((line, i) => {
      y += lineH2
      out.push(
        <text key={`b${i}`} x={cx} y={y - lineH2 * 0.22} className="plan__sublabel" fontSize={t2.size} textAnchor="middle" {...(t2.squeeze && textWidth(line, t2.size, 500) > maxW ? { textLength: maxW, lengthAdjust: 'spacingAndGlyphs' } : {})}>
          {line}
        </text>
      )
    })
  }
  return out
}

function Marker({ at, kind, icon }) {
  return (
    <g className={`plan__marker plan__marker--${kind}`} aria-hidden="true">
      <circle cx={at[0]} cy={at[1]} r="15" />
      <Icon name={icon} size={18} x={at[0] - 9} y={at[1] - 9} color="#fff" />
    </g>
  )
}

function Callout({ room, text }) {
  const w = room.w - 8
  const fit = fitLines(text, w - 12, 1, 12.5, 700)
  return (
    <g className="plan__callout" aria-hidden="true">
      <rect x={room.x + 4} y={room.y + room.h - 28} width={w} height="24" rx="12" />
      <text x={room.x + room.w / 2} y={room.y + room.h - 11.5} textAnchor="middle" fontSize={fit.size} {...(textWidth(fit.lines[0], fit.size, 700) > w - 12 ? { textLength: w - 12, lengthAdjust: 'spacingAndGlyphs' } : {})}>
        {fit.lines.join(' ')}
      </text>
    </g>
  )
}

const KIND = {
  emergency: 'emergency',
  opd_room: 'opd',
  vertical_transport: 'move',
  facility: 'facility',
  helpdesk: 'help',
  entrance: 'entrance',
  waiting_area: 'waiting',
}

/**
 * One floor of the building as a clean SVG plan. The route is a thick line along the corridor with a
 * start marker and an end marker; rooms are tappable to pick a destination.
 */
export default function FloorPlan({ places, floor, route, startId, endId, nextFloor, onPick }) {
  const { t, f, lang, placeName, floorName, deptName } = useI18n()
  const plan = floorPlan(floor)
  if (!plan) return null
  const byId = Object.fromEntries(places.map((p) => [p.id, p]))
  const segment = route ? route.pathNodes.filter((n) => n.floor === floor) : []
  const onRoute = new Set(segment.map((n) => n.id))
  const line = routeLine(plan, segment)
  const first = segment[0] && plan.rooms[segment[0].id]
  const last = segment.length > 1 && plan.rooms[segment[segment.length - 1].id]
  const lastIsEnd = segment.length && segment[segment.length - 1].id === endId
  const firstIsStart = segment.length && segment[0].id === startId

  return (
    <svg className="plan" viewBox={`0 0 ${plan.width} ${plan.height}`} role="img" aria-label={`${t.mapAria}: ${floorName(floor)}`} lang={lang}>
      <rect className="plan__floor" x="0" y="0" width={plan.width} height={plan.height} rx="12" />
      <rect className="plan__corridor" x={plan.corridor.x} y={plan.corridor.y} width={plan.corridor.w} height={plan.corridor.h} rx="6" />
      <text className="plan__corridor-label" x={plan.corridor.x + plan.corridor.w / 2} y={plan.corridor.y + plan.corridor.h / 2} textAnchor="middle" transform={`rotate(-90 ${plan.corridor.x + plan.corridor.w / 2} ${plan.corridor.y + plan.corridor.h / 2})`}>
        {t.corridor}
      </text>

      {Object.values(plan.rooms).map((room) => {
        const place = byId[room.id]
        if (!place) return null
        const isEnd = room.id === endId
        const isStart = room.id === startId
        const kind = KIND[place.category] || 'other'
        const opdDept = place.category === 'opd_room' ? departmentForRoom(`Room ${room.id.replace('room_', '')}`) : null
        const title = place.category === 'opd_room' ? placeNameFor(place, lang, t, { short: true }) : placeName(place)
        const subtitle = opdDept ? deptName(opdDept) : null
        const cls = ['plan__room', `plan__room--${kind}`, onRoute.has(room.id) && 'is-route', isEnd && 'is-end', isStart && 'is-start', place.category === 'opd_room' && !opdDept && 'is-idle'].filter(Boolean).join(' ')
        return (
          <g
            key={room.id}
            className={cls}
            role="button"
            tabIndex={0}
            aria-label={placeName(place)}
            aria-pressed={isEnd}
            onClick={() => onPick?.(place)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick?.(place))}
          >
            <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="8" />
            <RoomLabel room={room} title={title} subtitle={subtitle} icon={placeIconName(place)} />
          </g>
        )
      })}

      {line.length > 1 && (
        <g className="plan__route" aria-hidden="true">
          <polyline className="plan__route-casing" points={line.map((p) => p.join(',')).join(' ')} />
          <polyline className="plan__route-line" points={line.map((p) => p.join(',')).join(' ')} />
        </g>
      )}

      {first && (
        <Marker at={first.door} kind={firstIsStart ? 'start' : 'change'} icon={firstIsStart ? 'user' : placeIconName(byId[first.id] || {})} />
      )}
      {last && <Marker at={last.door} kind={lastIsEnd ? 'end' : 'change'} icon={lastIsEnd ? 'flag' : placeIconName(byId[last.id] || {})} />}
      {last && !lastIsEnd && nextFloor !== undefined && nextFloor !== null && <Callout room={last} text={f('toFloor', { floor: floorName(nextFloor) })} />}
    </svg>
  )
}
