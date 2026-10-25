import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import Layout from '../components/Layout.jsx'
import ShowStaff from '../components/ShowStaff.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import Modal from '../components/common/Modal.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Toggle from '../components/common/Toggle.jsx'
import { Icon } from '../components/common/Icons.jsx'
import FloorPlan from '../components/map/FloorPlan.jsx'
import { findRoomPlace, placeIconName } from '../components/map/placeIcons.js'
import RouteSteps, { useRouteSentences } from '../components/map/RouteSteps.jsx'
import { useAccess } from '../context/Access.jsx'
import { useAsync } from '../hooks/useAsync.js'
import en from '../i18n/en.js'
import { useI18n } from '../i18n/index.jsx'
import { placeNameFor } from '../i18n/places.js'
import { useLocation } from '../router.jsx'

const DEFAULT_START = 'main_entrance_0'
const FLOORS = [0, 1, 2]

// Quick picks: [key in the dictionaries, test]
const GROUPS = [
  ['groupDoctors', (p) => p.category === 'opd_room'],
  ['groupToilets', (p) => p.id.startsWith('toilets') || p.id.startsWith('drinking_water')],
  ['groupMedicines', (p) => p.category === 'pharmacy'],
  ['groupTests', (p) => p.category === 'lab'],
  ['groupHelp', (p) => p.category === 'helpdesk' || p.category === 'counter'],
  ['groupWards', (p) => p.category === 'ward' || p.category === 'waiting_area'],
]

export default function NavigationMap() {
  const { t, f, lang, placeName, floorName } = useI18n()
  const { prefs, setPref } = useAccess()
  const { list: departments } = useDepartments()
  const { search } = useLocation()
  const query = useMemo(() => new URLSearchParams(search), [search])
  const sentences = useRouteSentences()

  const { data: map, error: mapError, loading, reload } = useAsync(() => api.map(), [])

  const [from, setFrom] = useState(query.get('from') || DEFAULT_START)
  const [to, setTo] = useState('')
  const [avoid, setAvoid] = useState(query.get('avoidStairs') === '1' || prefs.avoidStairs || prefs.assisted)
  const [route, setRoute] = useState(null)
  const [floor, setFloor] = useState(0)
  const [busy, setBusy] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [filter, setFilter] = useState('')
  const [group, setGroup] = useState(null)
  const [lostOpen, setLostOpen] = useState(false)
  const [lostFloor, setLostFloor] = useState(null)
  const [lost, setLost] = useState(null)
  const [lostError, setLostError] = useState(null)
  const [staffCard, setStaffCard] = useState(false)
  const planRef = useRef(null)
  const handled = useRef(null)

  const places = useMemo(() => map?.places ?? [], [map])
  const byId = useMemo(() => Object.fromEntries(places.map((p) => [p.id, p])), [places])
  const destinations = useMemo(() => places.filter((p) => p.category !== 'vertical_transport' || p.id === 'ramp_0'), [places])

  const compute = useCallback(
    async (end, { start = from, avoidStairs = avoid } = {}) => {
      if (!end) return
      setBusy(true)
      setRouteError(null)
      try {
        const result = await api.route({ from: start, to: end, avoidStairs, language: lang })
        setRoute(result)
        setFloor(result.pathNodes?.[0]?.floor ?? byId[start]?.floor ?? 0)
      } catch (err) {
        setRoute(null)
        setRouteError(err)
      } finally {
        setBusy(false)
      }
    },
    [from, avoid, lang, byId]
  )

  // Arriving with ?to=place, or ?room=Room 3&dept=CHD from a slip.
  useEffect(() => {
    if (!map || handled.current === search) return
    handled.current = search
    const target = query.get('to') || findRoomPlace(places, query.get('room'), query.get('dept'), departments)?.id
    if (target && byId[target]) {
      setTo(target)
      compute(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, search, departments.length])

  const pick = (id) => {
    setTo(id)
    compute(id)
    requestAnimationFrame(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const changeStart = (id) => {
    setFrom(id)
    if (to) compute(to, { start: id })
  }

  const toggleAvoid = (value) => {
    setAvoid(value)
    setPref('avoidStairs', value)
    if (to) compute(to, { avoidStairs: value })
  }

  const openLost = async (fl) => {
    setLostFloor(fl)
    setLost(null)
    setLostError(null)
    try {
      setLost(await api.lost({ currentFloor: fl, destinationPlaceId: to || undefined, language: lang }))
    } catch (err) {
      setLostError(err)
    }
  }

  if (loading) return <Layout><Loading /></Layout>
  if (mapError) return <Layout><ErrorNote error={mapError} onRetry={reload} /></Layout>

  const dest = byId[to]
  const routeFloors = route ? [...new Set(route.pathNodes.map((p) => p.floor))] : []
  const nextFloorAfter = (fl) => {
    const i = routeFloors.indexOf(fl)
    return i >= 0 && i < routeFloors.length - 1 ? routeFloors[i + 1] : null
  }
  const nextFloor = nextFloorAfter(floor)
  const allSteps = route ? sentences(route.steps, places) : []
  const listenAll = allSteps.map((s) => `${s.text}. ${s.landmark}`).join(' ')

  const needle = filter.trim().toLowerCase()
  const matches = destinations.filter((p) => {
    if (group !== null && !GROUPS[group][1](p)) return false
    if (!needle) return true
    return [placeName(p), placeNameFor(p, 'en'), p.name].some((s) => String(s).toLowerCase().includes(needle))
  })

  const destLabel = dest ? placeName(dest) : ''
  const destEn = dest ? placeNameFor(dest, 'en') : ''

  return (
    <Layout wide className="main--map">
      <h1 className="page-title">{t.mapTitle}</h1>

      {dest ? (
        <section className="dest-card" aria-live="polite">
          <span className="dest-card__icon" aria-hidden="true">
            <Icon name={placeIconName(dest)} size={28} />
          </span>
          <div className="dest-card__text">
            <p className="muted small">{t.goingTo}</p>
            <p className="dest-card__name">{destLabel}</p>
            <p className="muted">{floorName(dest.floor)}</p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              setTo('')
              setRoute(null)
            }}
          >
            <Icon name="edit" size={18} />
            <span>{t.change}</span>
          </button>
        </section>
      ) : (
        <section className="place-picker">
          <label className="question__label" htmlFor="place-search">
            {t.whereTo}
          </label>
          <div className="search-box">
            <Icon name="search" size={22} />
            <input id="place-search" className="field__control" type="search" value={filter} placeholder={t.searchPlaces} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="chips" role="group" aria-label={t.whereTo}>
            {GROUPS.map(([key], i) => (
              <button key={key} type="button" className="chip" aria-pressed={group === i} onClick={() => setGroup(group === i ? null : i)}>
                {t[key]}
              </button>
            ))}
          </div>
          <ul className="place-list">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" className={`place-list__btn${p.category === 'emergency' ? ' is-emergency' : ''}`} onClick={() => pick(p.id)}>
                  <Icon name={placeIconName(p)} size={24} />
                  <span className="place-list__name">{placeName(p)}</span>
                  <span className="place-list__floor">{floorName(p.floor)}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="muted">{t.noPlaces}</li>}
          </ul>
        </section>
      )}

      <div className="map-layout">
        <div className="map-main" ref={planRef}>
          <div className="floor-tabs" role="tablist" aria-label={t.floors}>
            {FLOORS.map((fl) => (
              <button key={fl} type="button" role="tab" aria-selected={floor === fl} className="floor-tabs__tab" onClick={() => setFloor(fl)}>
                <span>{floorName(fl)}</span>
                {routeFloors.includes(fl) && (
                  <span className="floor-tabs__route">
                    <Icon name="navigation" size={14} />
                    <span className="sr-only">{t.onRoute}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="plan-box">
            <FloorPlan places={places} floor={floor} route={route} startId={route?.start?.id ?? from} endId={to} nextFloor={nextFloor} onPick={(p) => pick(p.id)} />
          </div>
          {route && (
            <p className="plan-legend">
              <span className="plan-legend__item plan-legend__item--start">
                <Icon name="user" size={14} />
              </span>
              {t.legendStart}
              <span className="plan-legend__item plan-legend__item--end">
                <Icon name="flag" size={14} />
              </span>
              {t.legendEnd}
            </p>
          )}
          {nextFloor !== null && (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setFloor(nextFloor)}>
              <Icon name="arrow-right" size={22} />
              <span>{f('continueOn', { floor: floorName(nextFloor) })}</span>
            </button>
          )}
        </div>
        <div className="map-side">
          <div className="field">
            <label className="field__label" htmlFor="map-from">
              {t.youAreAt}
            </label>
            <select id="map-from" className="field__control" value={from} onChange={(e) => changeStart(e.target.value)}>
              {FLOORS.map((fl) => (
                <optgroup key={fl} label={floorName(fl)}>
                  {places
                    .filter((p) => p.floor === fl)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {placeName(p)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Toggle iconName="accessibility" label={t.avoidStairs} hint={t.avoidStairsHint} checked={avoid} onChange={toggleAvoid} />

          {busy && <Loading />}
          {routeError && (
            <p className="status status--error" role="alert">
              {routeError.status === 400 ? t.noRoute : routeError.status === 0 ? t.errNetwork : t.errGeneric}
            </p>
          )}

          {route && (
            <section className="route-panel" aria-labelledby="route-title">
              <div className="route-panel__head">
                <h2 id="route-title" className="section-title">
                  {t.directions}
                </h2>
                <p className="muted">
                  {f('routeSummary', { m: route.totalDistanceMeters, n: route.estimatedWalkMinutes })}
                  {route.avoidStairsUsed && ` · ${t.routeNoStairs}`}
                </p>
              </div>
              <ListenButton text={listenAll} label={t.listenAll} className="btn btn--secondary btn--block" />
              <RouteSteps steps={route.steps} places={places} activeFloor={floor} onPickFloor={setFloor} />
            </section>
          )}
        </div>

      </div>

      <button
        type="button"
        className="btn btn--urgent btn--block"
        onClick={() => {
          setLostOpen(true)
          setLost(null)
          setLostFloor(null)
        }}
      >
        <Icon name="help" size={24} />
        <span>{t.imLost}</span>
      </button>

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} title={t.lostTitle}>
        <p className="modal__lead">{t.lostCalm}</p>
        <p className="field__label">{t.whichFloor}</p>
        <div className="floor-pick">
          {FLOORS.map((fl) => (
            <button key={fl} type="button" className="btn btn--outline" aria-pressed={lostFloor === fl} onClick={() => openLost(fl)}>
              <Icon name="layers" size={20} />
              <span>{floorName(fl)}</span>
            </button>
          ))}
        </div>
        {lostError && <ErrorNote error={lostError} onRetry={() => openLost(lostFloor)} />}
        {lostFloor !== null && !lost && !lostError && <Loading />}
        {lost?.nearestHelpDesk && (
          <>
            <h3 className="section-title">{f('nearestHelp', { name: placeName(lost.nearestHelpDesk) })}</h3>
            {lost.routeToHelpDesk?.steps && <RouteSteps steps={lost.routeToHelpDesk.steps} places={places} />}
          </>
        )}
        <button type="button" className="btn btn--primary btn--block" onClick={() => setStaffCard(true)}>
          <Icon name="maximize" size={22} />
          <span>{t.showStaffCard}</span>
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setLostOpen(false)}>
          <Icon name="close" size={20} />
          <span>{t.close}</span>
        </button>
      </Modal>

      <ShowStaff
        open={staffCard}
        onClose={() => setStaffCard(false)}
        title={t.staffCardTitle}
        titleEn={en.staffCardTitle}
        big={dest ? destLabel : null}
        lines={[
          ...(dest ? [{ label: t.iNeedGo, value: `${destLabel}, ${floorName(dest.floor)}`, valueEn: `${destEn}, ${en[`floor${dest.floor}`] || ''}` }] : [{ label: t.iNeedGo, value: t.helpDeskPlease, valueEn: en.helpDeskPlease }]),
          { label: t.pleaseHelp, value: t.staffCardHelp, valueEn: en.staffCardHelp },
        ]}
      />
    </Layout>
  )
}
