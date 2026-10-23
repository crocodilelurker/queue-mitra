import { useI18n } from '../../i18n/index.jsx'
import { placeIcon } from './placeIcons.js'

const W = 860
const H = 820
const COLORS = { start: '#2f9e44', end: '#c92a2a', route: '#1971c2' }

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

/** SVG floor plan: corridors, places and (optionally) the route drawn over them. */
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
  const short = (place) => placeName(place).split(' (')[0]

  return (
    <svg className="floormap" viewBox={viewBoxFor(routeNodes)} role="img" aria-label={t.mapAria}>
      <rect x="-20" y="-20" width={W + 40} height={H + 40} rx="24" fill="var(--surface)" />
      {floorEdges.map((e) => (
        <line key={`${e.from}-${e.to}`} x1={byId[e.from].x} y1={byId[e.from].y} x2={byId[e.to].x} y2={byId[e.to].y} stroke="var(--ink-soft)" strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
      ))}
      {routePairs.map(([a, b]) => (
        <line key={`r-${a.id}-${b.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS.route} strokeWidth="14" strokeLinecap="round" />
      ))}
      {onFloor.map((p) => {
        const isStart = p.id === startId
        const isEnd = p.id === endId
        const ring = isStart ? COLORS.start : isEnd ? COLORS.end : routeIds.has(p.id) ? COLORS.route : 'var(--ink)'
        return (
          <g key={p.id} className="floormap__node" tabIndex={0} role="button" aria-label={placeName(p)} onClick={() => onPick?.(p)} onKeyDown={(e) => e.key === 'Enter' && onPick?.(p)}>
            <circle cx={p.x} cy={p.y} r={isStart || isEnd ? 34 : 28} fill="var(--bg)" stroke={ring} strokeWidth={isStart || isEnd ? 8 : 5} />
            <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize="30">
              {placeIcon(p)}
            </text>
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
              {showLabel && (
                <text x={p.x} y={p.y + 64} textAnchor="middle" fontSize="24" fontWeight="600" fill="var(--ink)" stroke="var(--surface)" strokeWidth="6" paintOrder="stroke">
                  {short(p)}
                </text>
              )}
              {isStart && (
                <text x={p.x} y={p.y - 46} textAnchor="middle" fontSize="22" fontWeight="700" fill={COLORS.start} stroke="var(--surface)" strokeWidth="5" paintOrder="stroke">
                  ▶ {t.start}
                </text>
              )}
              {isEnd && (
                <text x={p.x} y={p.y - 46} textAnchor="middle" fontSize="22" fontWeight="700" fill={COLORS.end} stroke="var(--surface)" strokeWidth="5" paintOrder="stroke">
                  ⚑ {t.destination}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
