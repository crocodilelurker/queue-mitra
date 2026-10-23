import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import ListenButton from '../components/common/ListenButton.jsx'
import Modal from '../components/common/Modal.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Toggle from '../components/common/Toggle.jsx'
import Layout from '../components/Layout.jsx'
import FloorMap from '../components/map/FloorMap.jsx'
import { findRoomPlace } from '../components/map/placeIcons.js'
import RouteSteps, { useStepText } from '../components/map/RouteSteps.jsx'
import { useAccess } from '../context/Access.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useI18n } from '../i18n/index.jsx'

const DEFAULT_START = 'main_entrance_0'
const FLOORS = [0, 1, 2]

export default function NavigationMap() {
  const { t, f, lang, pick, placeName, checkpointName } = useI18n()
  const { prefs, setPref } = useAccess()
  useDepartments()
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const stepText = useStepText()

  const { data: map, error: mapError, loading, reload } = useAsync(() => api.map(), [])
  const { data: cps } = useAsync(() => api.checkpoints(), [])

  const [from, setFrom] = useState(query.get('from') || DEFAULT_START)
  const [to, setTo] = useState('')
  const [avoid, setAvoid] = useState(query.get('avoidStairs') === '1' || prefs.avoidStairs)
  const [route, setRoute] = useState(null)
  const [floor, setFloor] = useState(0)
  const [busy, setBusy] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [cpId, setCpId] = useState('')
  const [lostOpen, setLostOpen] = useState(false)
  const [lostFloor, setLostFloor] = useState(0)
  const [lost, setLost] = useState(null)
  const [lostError, setLostError] = useState(null)
  const startedRef = useRef(false)

  const places = map?.places ?? []
  const destinations = useMemo(() => places.filter((p) => p.category !== 'vertical_transport'), [places])

  const compute = useCallback(
    async ({ start = from, end = to, avoidStairs = avoid, checkpoint } = {}) => {
      if (!end) return setRouteError({ status: 400, message: 'destination' })
      setBusy(true)
      setRouteError(null)
      try {
        const result = checkpoint
          ? await api.fromCheckpoint({ checkpointId: checkpoint, to: end, avoidStairs, language: lang })
          : await api.route({ from: start, to: end, avoidStairs, language: lang })
        setRoute(result)
        setFloor(result.start.floor)
        if (checkpoint) setFrom(result.start.id)
      } catch (err) {
        setRoute(null)
        setRouteError(err)
      } finally {
        setBusy(false)
      }
    },
    [from, to, avoid, lang]
  )

  // Open with a destination already chosen (from a slip, the emergency modal or a link).
  useEffect(() => {
    if (!map || startedRef.current) return
    startedRef.current = true
    const target = query.get('to') || findRoomPlace(map.places, query.get('room'), query.get('dept'))?.id
    if (target) {
      setTo(target)
      compute({ start: from, end: target })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Directions are fetched in the chosen language, so refresh them when the language changes.
  const firstLang = useRef(lang)
  useEffect(() => {
    if (firstLang.current === lang) return
    firstLang.current = lang
    if (route && to) compute({ start: route.start.id, end: to })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const openLost = async (nextFloor = floor) => {
    setLostOpen(true)
    setLostFloor(nextFloor)
    setLost(null)
    setLostError(null)
    try {
      setLost(await api.lost({ currentFloor: nextFloor, destinationPlaceId: to || undefined, language: lang }))
    } catch (err) {
      setLostError(err)
    }
  }

  const toggleAvoid = (value) => {
    setAvoid(value)
    setPref('avoidStairs', value)
    if (route && to) compute({ start: route.start.id, end: to, avoidStairs: value })
  }

  if (loading) return <Layout><Loading /></Layout>
  if (mapError) return <Layout><ErrorNote error={mapError} onRetry={reload} /></Layout>

  const startPlace = places.find((p) => p.id === (route?.start.id ?? from))
  const listenText = route ? route.steps.map((s, i) => `${stepText(s, route.steps[i - 1], places)}. ${s.landmark}`).join(' ') : ''
  const routeFloors = route ? new Set(route.pathNodes.map((p) => p.floor)) : new Set()

  const byFloor = (list) =>
    FLOORS.map((fl) => (
      <optgroup key={fl} label={f('floorN', { n: fl })}>
        {list.filter((p) => p.floor === fl).map((p) => (
          <option key={p.id} value={p.id}>
            {placeName(p)}
          </option>
        ))}
      </optgroup>
    ))

  return (
    <Layout wide className="main--map">
      <h1 className="hero hero--sm">{t.mapTitle}</h1>

      <div className="map-layout">
        <section className="box panel map-controls">
          <label className="field__label" htmlFor="map-from">
            {t.from}
          </label>
          <select id="map-from" className="field__control" value={from} onChange={(e) => setFrom(e.target.value)}>
            {byFloor(places)}
          </select>
          <label className="field__label" htmlFor="map-to">
            {t.to}
          </label>
          <select id="map-to" className="field__control" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t.chooseDest}</option>
            {byFloor(destinations)}
          </select>
          <Toggle icon="♿" label={t.avoidStairs} hint={t.avoidStairsHint} checked={avoid} onChange={toggleAvoid} />
          <button type="button" className="btn btn--primary" disabled={busy || !to} onClick={() => compute()}>
            <span aria-hidden="true">🧭</span> {busy ? t.loading : t.showWay}
          </button>
          {routeError && (
            <div className="status status--error" role="alert">
              <p>{routeError.status === 400 ? (routeError.message === 'destination' ? t.chooseDestFirst : t.noRoute) : routeError.status === 0 ? t.errNetwork : t.errGeneric}</p>
            </div>
          )}

          <h2 className="form__subtitle">{t.checkpointTitle}</h2>
          <p className="field__hint">{t.checkpointHint}</p>
          <select className="field__control" aria-label={t.checkpointTitle} value={cpId} onChange={(e) => setCpId(e.target.value)}>
            <option value="">{t.chooseCheckpoint}</option>
            {cps?.checkpoints.map((c) => (
              <option key={c.id} value={c.id}>
                {checkpointName(c)}
              </option>
            ))}
          </select>
          <button type="button" className="btn" disabled={busy || !cpId || !to} onClick={() => compute({ checkpoint: cpId })}>
            <span aria-hidden="true">📷</span> {t.scanPoster}
          </button>

          <button type="button" className="btn btn--danger" onClick={() => openLost()}>
            <span aria-hidden="true">🆘</span> {t.imLost}
          </button>
        </section>

        <section className="map-view">
          <div className="floor-tabs" role="tablist" aria-label={t.floors}>
            {FLOORS.map((fl) => (
              <button key={fl} type="button" role="tab" aria-selected={floor === fl} className="floor-tabs__tab" onClick={() => setFloor(fl)}>
                {f('floorN', { n: fl })}
                {routeFloors.has(fl) && <span className="floor-tabs__dot" aria-label={t.onRoute} />}
              </button>
            ))}
          </div>
          <div className="box map-box">
            <FloorMap places={places} edges={map.edges} floor={floor} route={route} startId={startPlace?.id} endId={to} onPick={(p) => setTo(p.id)} />
          </div>

          {route && (
            <div className="box panel">
              <h2 className="form__title">{t.directions}</h2>
              <p>{f('routeSummary', { m: route.totalDistanceMeters, n: route.estimatedWalkMinutes })}</p>
              {route.avoidStairsUsed && <p className="badge badge--ok">♿ {t.routeNoStairs}</p>}
              <RouteSteps steps={route.steps} places={places} />
              <ListenButton text={listenText} />
            </div>
          )}
        </section>
      </div>

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} title={t.lostTitle} variant="lost">
        <p className="field__label">{t.whichFloor}</p>
        <div className="floor-tabs">
          {FLOORS.map((fl) => (
            <button key={fl} type="button" className="floor-tabs__tab" aria-pressed={lostFloor === fl} onClick={() => openLost(fl)}>
              {f('floorN', { n: fl })}
            </button>
          ))}
        </div>
        {lostError && <ErrorNote error={lostError} onRetry={() => openLost(lostFloor)} />}
        {!lost && !lostError && <Loading />}
        {lost && (
          <>
            <section className="staff-card" aria-label={t.staffCardTitle}>
              <p className="staff-card__title">{t.staffCardTitle}</p>
              <p className="staff-card__dest">
                {t.iNeedGo}: {(() => {
                  const dest = places.find((p) => p.id === to)
                  return dest ? placeName(dest) : lost.staffCard.destinationNameEn
                })()}
              </p>
              <p className="staff-card__dest staff-card__dest--en">I need to go to: {lost.staffCard.destinationNameEn} · Floor {lost.staffCard.destinationFloor}</p>
              <p>{pick(lost.staffCard.instructions)}</p>
              {lang !== 'en' && <p lang="en">{lost.staffCard.instructions.en}</p>}
            </section>
            {lost.nearestHelpDesk && (
              <>
                <h3 className="modal__sub">{f('nearestHelp', { name: placeName(lost.nearestHelpDesk) })}</h3>
                <RouteSteps steps={lost.routeToHelpDesk.steps} places={places} />
              </>
            )}
          </>
        )}
        <button type="button" className="btn modal__close" onClick={() => setLostOpen(false)}>
          <span aria-hidden="true">✕</span> {t.close}
        </button>
      </Modal>
    </Layout>
  )
}
