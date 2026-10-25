import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { Link } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import StaffShell, { useLiveRefetch, useStaffLive } from '../../components/staff/StaffShell.jsx'
import { Button, Card, EmptyState, InlineError, LANG_SHORT, PageHeader, Skeleton, Stat, formatWait } from '../../components/staff/ui.jsx'
import './admin-pages.css'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k]
  return undefined
}

function formatSeconds(s) {
  if (!s) return '—'
  if (s < 60) return `${Math.round(s)} s`
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return r ? `${m} min ${r} s` : `${m} min`
}

/** Accepts the current analytics shape and the rebuilt backend's likely variants. */
function normalise(raw, liveDepartments = []) {
  const o = raw?.overview || raw?.totals || {}
  const total = num(pick(o, 'totalPatientsToday', 'registeredToday', 'registered', 'total'))
  const completed = num(pick(o, 'completedToday', 'completed'))
  const noShow = num(pick(o, 'noShowCount', 'noShow', 'noShows'))
  const waiting = num(pick(o, 'currentlyWaiting', 'waiting'))
  const serving = num(pick(o, 'inConsultation', 'serving', 'called'))
  const assisted = num(pick(o, 'assistedCount', 'assisted'))

  const sla = raw?.emergencySLA || raw?.urgent || {}
  const urgentRaised = num(pick(sla, 'totalUrgentFlagsRaised', 'raised', 'total'))
  const urgentResolved = num(pick(sla, 'flagsResolved', 'resolved', 'seen'))
  const urgentAvg = num(pick(sla, 'averageResponseTimeSeconds', 'avgResponseSeconds', 'averageSeconds'))
  const urgentTarget = num(pick(sla, 'targetSlaSeconds', 'targetSeconds')) || 60

  const langSrc = raw?.languages || raw?.languageMix || {}
  const languages = (Array.isArray(langSrc) ? langSrc.map((l) => [l.code || l.language, l.count]) : Object.entries(langSrc))
    .map(([code, count]) => ({ code, label: LANG_SHORT[code] || (code === 'other' ? 'Other' : code), count: num(count) }))
    .sort((a, b) => b.count - a.count)

  const hourSrc = raw?.hourlyTraffic || raw?.hourly || raw?.hourlyRegistrations || {}
  const hourly = (Array.isArray(hourSrc) ? hourSrc.map((h) => [h.hour ?? h.label, h.count]) : Object.entries(hourSrc))
    .map(([hour, count]) => ({ hour: String(typeof hour === 'number' ? `${String(hour).padStart(2, '0')}:00` : hour), count: num(count) }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  const liveByCode = Object.fromEntries(liveDepartments.map((d) => [d.code, d]))
  const deptSrc = raw?.departmentHeatmap || raw?.departments || []
  const departments = deptSrc.map((d) => {
    const live = liveByCode[d.code] || {}
    return {
      code: d.code,
      name: d.name,
      completed: num(pick(d, 'completedCount', 'completed', 'throughput')),
      waiting: num(pick(d, 'waitingCount', 'waiting') ?? live.waitingCount),
      noShow: num(pick(d, 'noShowCount', 'noShow', 'noShows')),
      avgConsult: pick(d, 'avgConsultMinutes', 'averageConsultMinutes') ?? live.avgConsultMinutes,
      avgWait: pick(d, 'averageWaitMinutes', 'avgWaitMinutes', 'avgWait'),
      estWait: live.estimatedWaitMinutes,
    }
  })
  // Departments the analytics endpoint doesn't list yet but the live overview does.
  liveDepartments.forEach((l) => {
    if (!departments.some((d) => d.code === l.code))
      departments.push({ code: l.code, name: l.name, completed: 0, waiting: num(l.waitingCount), noShow: 0, avgConsult: l.avgConsultMinutes, estWait: l.estimatedWaitMinutes })
  })

  return { total, completed, noShow, waiting, serving, assisted, urgentRaised, urgentResolved, urgentAvg, urgentTarget, languages, hourly, departments }
}

function HourlyChart({ hourly }) {
  const max = Math.max(1, ...hourly.map((h) => h.count))
  const nowHour = `${String(new Date().getHours()).padStart(2, '0')}:00`
  const total = hourly.reduce((s, h) => s + h.count, 0)
  return (
    <figure style={{ margin: 0 }}>
      <div className="ap-cols" role="img" aria-label={`Registrations by hour: ${hourly.map((h) => `${h.hour} ${h.count}`).join(', ')}`}>
        {hourly.map((h) => (
          <div key={h.hour} className="ap-col">
            <span className="ap-col__value">{h.count}</span>
            <span
              className={`ap-col__bar${h.count === 0 ? ' ap-col__bar--zero' : h.hour === nowHour ? ' ap-col__bar--now' : ''}`}
              style={{ height: `${Math.max(1, (h.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="ap-cols-labels" aria-hidden="true">
        {hourly.map((h) => (
          <span key={h.hour}>{h.hour.slice(0, 2)}</span>
        ))}
      </div>
      <figcaption className="sx-small sx-muted" style={{ marginTop: 8 }}>
        {total} registration{total === 1 ? '' : 's'} today · hour of day (24-hour clock)
      </figcaption>
    </figure>
  )
}

function Bars({ rows, unit = '' }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="sx-bars">
      {rows.map((r) => (
        <div key={r.key} className="sx-bar">
          <span>{r.label}</span>
          <span className="sx-bar__track" aria-hidden="true">
            <span className="sx-bar__fill" style={{ width: `${(r.value / max) * 100}%`, display: 'block' }} />
          </span>
          <span className="sx-bar__value">
            {r.display ?? r.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

function Throughput({ departments }) {
  const max = Math.max(1, ...departments.map((d) => d.completed + d.waiting + d.noShow))
  return (
    <div className="ap-dept-rows">
      <div className="ap-legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--primary)' }} /> Seen
        </span>
        <span>
          <i style={{ background: '#e9a23b' }} /> Waiting
        </span>
        <span>
          <i style={{ background: '#b9c6c2' }} /> No-show
        </span>
      </div>
      {departments.map((d) => {
        const sum = d.completed + d.waiting + d.noShow
        return (
          <div key={d.code} className="ap-dept-row">
            <div className="ap-dept-row__head">
              <strong>{d.name}</strong>
              <span className="ap-dept-row__nums">
                {d.completed} seen · {d.waiting} waiting · {d.noShow} no-show
              </span>
            </div>
            <div className="ap-split" style={{ width: `${Math.max(2, (sum / max) * 100)}%` }} aria-hidden="true">
              {d.completed > 0 && <span className="ap-split__a" style={{ flex: d.completed }} />}
              {d.waiting > 0 && <span className="ap-split__b" style={{ flex: d.waiting }} />}
              {d.noShow > 0 && <span className="ap-split__c" style={{ flex: d.noShow }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="sx-grid" role="status" aria-label="Loading reports">
      <div className="sx-stats">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={92} style={{ borderRadius: 12 }} />
        ))}
      </div>
      <div className="sx-grid sx-grid--2">
        <Skeleton height={300} style={{ borderRadius: 12 }} />
        <Skeleton height={300} style={{ borderRadius: 12 }} />
      </div>
    </div>
  )
}

function Reports() {
  const live = useStaffLive()
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const load = useCallback(async (quiet) => {
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api.analytics()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState((s) => ({ data: quiet ? s.data : null, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    document.title = 'Reports · Queue Mitra'
    load()
  }, [load])
  useLiveRefetch(() => load(true))

  const r = state.data ? normalise(state.data, live?.overview?.departments || []) : null
  const updated = state.data?.updatedAt ? new Date(state.data.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Today’s patient flow, updated live as patients register and are seen.${updated ? ` Last calculated at ${updated}.` : ''}`}
        actions={
          <Button icon="refresh" onClick={() => load()} busy={state.loading && Boolean(state.data)}>
            Refresh
          </Button>
        }
      />
      {state.loading && !state.data && <ReportsSkeleton />}
      {state.error && !state.data && <InlineError error={state.error} onRetry={() => load()} />}
      {r && r.total === 0 && (
        <Card>
          <EmptyState
            icon="chart"
            title="No registrations yet today"
            action={
              <Link to="/admin/counter" className="sx-btn sx-btn--primary">
                <Icon name="user-plus" size={18} /> Open the registration counter
              </Link>
            }
          >
            Reports fill in as patients register — on their phones or at the counter. Throughput, waiting times, languages and urgent response times will appear here.
          </EmptyState>
        </Card>
      )}
      {r && r.total > 0 && (
        <>
          <div className="sx-stats">
            <Stat icon="users" label="Registered today" value={r.total} hint={`${r.waiting} waiting · ${r.serving} with a doctor`} />
            <Stat icon="check-circle" label="Seen by a doctor" value={r.completed} hint={`${pct(r.completed, r.total)}% of today’s patients`} />
            <Stat icon="no-show" label="No-show rate" value={`${pct(r.noShow, r.total)}%`} hint={`${r.noShow} did not come when called`} />
            <Stat icon="accessibility" label="Assisted registrations" value={`${pct(r.assisted, r.total)}%`} hint={`${r.assisted} helped by staff or family`} />
            <Stat
              icon="alert"
              label="Urgent response (average)"
              value={formatSeconds(r.urgentAvg)}
              hint={r.urgentRaised ? `${r.urgentResolved} of ${r.urgentRaised} flags seen` : 'No urgent flags today'}
              alert={r.urgentAvg > r.urgentTarget}
            />
          </div>

          <div className="sx-grid sx-grid--2">
            <Card title="Registrations by hour" icon="clock">
              {r.hourly.length ? <HourlyChart hourly={r.hourly} /> : <p className="sx-muted">No hourly data yet.</p>}
            </Card>
            <Card title="Throughput by department" icon="layers">
              {r.departments.length ? <Throughput departments={r.departments} /> : <p className="sx-muted">No departments yet.</p>}
            </Card>
          </div>

          <div className="sx-grid sx-grid--2">
            <Card title="Waiting time by department" icon="clock">
              {r.departments.length ? (
                <div className="sx-table-wrap">
                  <table className="sx-table">
                    <thead>
                      <tr>
                        <th scope="col">Department</th>
                        <th scope="col">Avg. consult</th>
                        <th scope="col">Avg. wait</th>
                        <th scope="col">Wait if joining now</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.departments.map((d) => (
                        <tr key={d.code}>
                          <td>
                            <strong>{d.name}</strong>
                          </td>
                          <td>{d.avgConsult ? `${Math.round(d.avgConsult)} min` : '—'}</td>
                          <td>{d.avgWait !== undefined && d.avgWait !== null ? formatWait(Math.round(d.avgWait)) : '—'}</td>
                          <td>{d.estWait !== undefined ? (d.estWait ? `about ${formatWait(d.estWait)}` : 'No wait') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sx-muted">No departments yet.</p>
              )}
              <p className="sx-small sx-muted" style={{ marginTop: 10 }}>
                Estimated wait = people ahead × average of the last 10 consultations in that department + any doctor delay, rounded to 5 minutes.
              </p>
            </Card>
            <div className="sx-grid">
              <Card title="Language used to register" icon="message">
                {r.languages.some((l) => l.count) ? (
                  <Bars rows={r.languages.filter((l) => l.count).map((l) => ({ key: l.code, label: l.label, value: l.count, display: `${l.count} · ${pct(l.count, r.total)}%` }))} />
                ) : (
                  <p className="sx-muted">No language data yet.</p>
                )}
              </Card>
              <Card title="Urgent help requests" icon="alert">
                <div className="ap-pair">
                  <div>
                    <span className="ap-big">{formatSeconds(r.urgentAvg)}</span>
                    <p className="sx-small sx-muted">average time until a staff member marked the flag as seen</p>
                  </div>
                  <div>
                    <span className="ap-big">{r.urgentRaised}</span>
                    <p className="sx-small sx-muted">raised today · {r.urgentResolved} seen</p>
                  </div>
                </div>
                <p className="sx-small sx-muted" style={{ marginTop: 10 }}>
                  Target: within {formatSeconds(r.urgentTarget)}.{' '}
                  {r.urgentRaised === 0 ? 'No flags raised yet.' : r.urgentAvg && r.urgentAvg <= r.urgentTarget ? 'On target.' : r.urgentAvg ? 'Slower than target — keep the queue console open at the help desk.' : 'Waiting for the first response.'}
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function AdvancedReports() {
  return (
    <StaffShell>
      <Reports />
    </StaffShell>
  )
}
