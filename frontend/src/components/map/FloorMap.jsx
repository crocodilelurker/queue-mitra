import { useI18n } from '../../i18n/index.jsx'
import { Icon } from '../common/Icons.jsx'
import { placeIconName } from './placeIcons.js'

const W = 860
const H = 820

function viewBoxFor(routeNodes) {
  if (routeNodes.length === 0) return `0 0 ${W} ${H}`
  const xs = routeNodes.map((p) => p.x)
  const ys = routeNodes.map((p) => p.y)
  let minX = Math.min(...xs) - 120
  let maxX = Math.max(...xs) + 120
  let minY = Math.min(...ys) - 120
  let maxY = Math.max(...ys) + 120
  // Keep a minimum window so a short route does not zoom in too far.
  const w = Math.max(maxX - minX, 460)
  const h = Math.max(maxY - minY, 360)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  minX = Math.max(-20, cx - w / 2)
  minY = Math.max(-20, cy - h / 2)
  return `${minX} ${minY} ${w} ${h}`
}

// Width of a label pill for `text` (the font is about 11px per character at this size).
const pillWidth = (text) => Math.max(56, text.length * 11.5 + 24)

/** A rounded label that stays readable on top of corridors and neighbouring icons. */
function Pill({ x, y, text, tone = 'label' }) {
  const w = pillWidth(text)
  return (
    <g className={`floormap__pill floormap__pill--${tone}`}>
      <rect x={x - w / 2} y={y - 16} width={w} height={32} rx={16} />
      <text x={x} y={y + 7} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** SVG floor plan: corridors, places and (optionally) the route drawn over them. Styled in pages.css. */
export default function FloorMap({ places, edges, floor, route, startId, endId, onPick }) {
  const { t, placeName } = useI18n()
  const byId = Object.fromEntries(places.map((p) => [p.id, p]))
  const onFloor = places.filter((p) => p.floor === floor)
  const routeNodes = route ? route.pathNodes.filter((p) => p.floor === floor) : []
  const routeIds = new Set(routeNodes.map((p) => p.id))
  const floorEdges = edges.filter((e) => byId[e.from]?.floor === floor && byId[e.to]?.floor === floor)
  const routePairs = route
    ? route.pathNodes.slice(1).map((p, i) => [route.pathNodes[i], p]).filter(([a, b]) => a.floor === floor && b.floor === floor)
    : []
  // Long names such as "Help Desk / May I Help You" are shortened to their first part on the map itself.
  const short = (place) => placeName(place).split(' (')[0].split(' / ')[0]

  return (
    <svg className="floormap" viewBox={viewBoxFor(routeNodes)} role="img" aria-label={t.mapAria}>
      <defs>
        <pattern id="floormap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path className="floormap__grid-line" d="M 40 0 L 0 0 0 40" />
        </pattern>
      </defs>
      <rect className="floormap__plate" x="-20" y="-20" width={W + 40} height={H + 40} rx="28" />
      <rect x="-20" y="-20" width={W + 40} height={H + 40} rx="28" fill="url(#floormap-grid)" />

      {floorEdges.map((e) => (
        <line key={`${e.from}-${e.to}`} className="floormap__edge" x1={byId[e.from].x} y1={byId[e.from].y} x2={byId[e.to].x} y2={byId[e.to].y} />
      ))}
      {routePairs.map(([a, b]) => (
        <g key={`r-${a.id}-${b.id}`}>
          <line className="floormap__route-glow" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          <line className="floormap__route" x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth="14" />
          <line className="floormap__flow" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        </g>
      ))}

      {onFloor.map((p) => {
        const isStart = p.id === startId
        const isEnd = p.id === endId
        const state = isStart ? 'is-start' : isEnd ? 'is-end' : routeIds.has(p.id) ? 'on-route' : ''
        const r = isStart || isEnd ? 34 : 28
        return (
          <g
            key={p.id}
            className={`floormap__node ${state}`.trim()}
            tabIndex={0}
            role="button"
            aria-label={placeName(p)}
            onClick={() => onPick?.(p)}
            onKeyDown={(e) => e.key === 'Enter' && onPick?.(p)}
          >
            {(isStart || isEnd) && <circle className="floormap__halo" cx={p.x} cy={p.y} r={r + 8} />}
            <circle className="floormap__ring" cx={p.x} cy={p.y} r={r} />
            <Icon name={placeIconName(p)} size={isStart || isEnd ? 34 : 28} x={p.x - (isStart || isEnd ? 17 : 14)} y={p.y - (isStart || isEnd ? 17 : 14)} />
          </g>
        )
      })}

      {/* Labels are drawn last so no icon can cover them. Stairs are only named when they are on the route. */}
      <g pointerEvents="none">
        {onFloor.map((p) => {
          const isStart = p.id === startId
          const isEnd = p.id === endId
          const onRoute = routeIds.has(p.id) || isStart || isEnd
          const showLabel = route ? onRoute : !p.id.startsWith('stairs_')
          return (
            <g key={p.id}>
              {showLabel && <Pill x={p.x} y={p.y + (isStart || isEnd ? 66 : 60)} text={short(p)} />}
              {isStart && <Pill x={p.x} y={p.y - 54} text={t.start} tone="start" />}
              {isEnd && <Pill x={p.x} y={p.y - 54} text={t.destination} tone="end" />}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
