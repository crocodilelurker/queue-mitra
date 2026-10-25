import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { Link } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import StaffShell, { useLiveRefetch, useStaffLive } from '../../components/staff/StaffShell.jsx'
import { Button, Card, Chip, EmptyState, GENDER_LABEL, InlineError, LANG_SHORT, PageHeader, Skeleton, clockTime } from '../../components/staff/ui.jsx'
import './admin-pages.css'

const STATUS = {
  waiting: { label: 'Waiting', tone: 'amber' },
  called: { label: 'Being seen', tone: 'teal' },
  completed: { label: 'Completed', tone: 'green' },
  no_show: { label: 'No-show', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: undefined },
}
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'called', label: 'Being seen' },
  { key: 'completed', label: 'Completed' },
  { key: 'no_show', label: 'No-show' },
]

function maskMobile(m) {
  if (!m) return ''
  const s = String(m)
  return /X/.test(s) ? s : s.length > 4 ? `${s.slice(0, 2)}${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-2)}` : s
}

/** One row per ticket, whatever shape the endpoint returns. Returns null when it isn't a ticket list. */
function normaliseList(res) {
  const list = Array.isArray(res) ? res : res?.patients || res?.tickets || res?.registrations || res?.items || null
  if (!Array.isArray(list)) return null
  if (list.length && !list.some((t) => t.tokenNumber)) return null // e.g. a patient-records list, not today's tickets
  return list.map((t) => {
    const p = t.patient || {}
    const dept = typeof t.department === 'object' && t.department ? t.department : {}
    return {
      key: t.publicId || t._id || t.id || t.tokenNumber,
      publicId: t.publicId,
      tokenNumber: t.tokenNumber,
      firstName: p.firstName || t.firstName || t.name || 'Patient',
      age: p.age ?? t.age,
      gender: p.gender || t.gender,
      mobile: p.mobile || t.mobile,
      department: dept.name || t.departmentName || (typeof t.department === 'string' ? t.department : '') || t.departmentCode || '',
      status: t.status || 'waiting',
      createdAt: t.createdAt,
      language: t.language,
      assisted: Boolean(t.isAssisted ?? t.assisted),
      urgent: Boolean(t.urgent?.raised ?? t.urgent === true),
      room: t.room,
    }
  })
}

function fromOverview(overview) {
  const rows = []
  for (const d of overview?.departments || []) {
    for (const s of d.nowServing || [])
      rows.push({ key: s.publicId || s.ticketId, publicId: s.publicId, tokenNumber: s.tokenNumber, firstName: s.firstName || 'Patient', department: d.name, status: 'called', createdAt: s.calledAt, room: s.room })
    for (const w of d.waiting || [])
      rows.push({
        key: w.publicId || w.ticketId,
        publicId: w.publicId,
        tokenNumber: w.tokenNumber,
        firstName: w.firstName || 'Patient',
        age: w.age,
        gender: w.gender,
        language: w.language,
        assisted: w.assisted,
        urgent: w.urgent,
        department: d.name,
        status: 'waiting',
        createdAt: w.createdAt,
      })
  }
  return rows
}

function matches(row, q) {
  if (!q) return true
  const s = q.toLowerCase().replace(/\s+/g, '')
  return [row.tokenNumber, row.firstName, row.mobile].some((v) => v && String(v).toLowerCase().replace(/\s+/g, '').includes(s))
}

function Badges({ row }) {
  return (
    <>
      {row.urgent && (
        <Chip tone="red" icon="alert">
          Urgent
        </Chip>
      )}
      {row.assisted && (
        <Chip icon="accessibility">Assisted</Chip>
      )}
    </>
  )
}

function StatusChip({ status }) {
  const s = STATUS[status] || { label: status }
  return (
    <Chip tone={s.tone} dot>
      {s.label}
    </Chip>
  )
}

function SlipLink({ row }) {
  if (!row.publicId) return null
  return (
    <a className="sx-btn sx-btn--sm" href={`/slip/${encodeURIComponent(row.publicId)}`} target="_blank" rel="noreferrer" aria-label={`Open slip for ${row.tokenNumber}`}>
      <Icon name="ticket" size={15} /> Slip
    </a>
  )
}

function Patients() {
  const live = useStaffLive()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState('all')
  const [state, setState] = useState({ rows: null, error: null, loading: true, fallback: false })
  const req = useRef(0)

  useEffect(() => {
    document.title = 'Patients today · Queue Mitra'
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async (q, quiet) => {
    const id = ++req.current
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await api.patients(q)
      if (id !== req.current) return
      const rows = normaliseList(res)
      setState(rows ? { rows, error: null, loading: false, fallback: false } : { rows: null, error: null, loading: false, fallback: true })
    } catch (error) {
      if (id !== req.current) return
      if (error.status === 404 || error.status === 403) setState({ rows: null, error: null, loading: false, fallback: true })
      else setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    load(debounced)
  }, [debounced, load])
  useLiveRefetch(() => !state.fallback && load(debounced, true))

  const all = useMemo(() => {
    const base = state.fallback ? fromOverview(live?.overview) : state.rows || []
    // The server already searches; filtering again keeps the fallback list (and any lag) consistent.
    return base.filter((r) => matches(r, debounced)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [state, live?.overview, debounced])

  const counts = useMemo(() => {
    const c = { all: all.length }
    all.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1))
    return c
  }, [all])
  const rows = filter === 'all' ? all : all.filter((r) => r.status === filter)
  const loading = (state.loading && !state.rows && !state.fallback) || (state.fallback && !live?.overview)
  const nothingToday = !loading && !debounced && all.length === 0

  return (
    <>
      <PageHeader
        title="Patients today"
        subtitle="Everyone who registered today — on their phone or at the counter. Only the first name, age and token are kept."
        actions={
          <Link to="/admin/counter" className="sx-btn sx-btn--primary">
            <Icon name="user-plus" size={18} /> Register a patient
          </Link>
        }
      />

      {state.error && <InlineError error={state.error} onRetry={() => load(debounced)} />}

      {nothingToday ? (
        <Card>
          <EmptyState
            icon="clipboard"
            title="No patients registered today"
            action={
              <div className="sx-row" style={{ justifyContent: 'center' }}>
                <Link to="/admin/counter" className="sx-btn sx-btn--primary">
                  <Icon name="user-plus" size={18} /> Registration counter
                </Link>
                <a href="/" target="_blank" rel="noreferrer" className="sx-btn">
                  <Icon name="phone" size={18} /> Open the patient app
                </a>
              </div>
            }
          >
            Patients appear here the moment they register. Register someone at the counter, or open the patient app and register on a phone.
          </EmptyState>
        </Card>
      ) : (
        <Card bodyClass={null}>
          <div className="sx-card__head">
            <div className="ap-toolbar" style={{ width: '100%' }}>
              <label className="ap-search">
                <span className="sx-visually-hidden">Search by token, name or mobile</span>
                <Icon name="search" size={18} />
                <input className="sx-input" type="search" placeholder="Search token, name or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <div className="ap-filters" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <button key={f.key} type="button" className="ap-filter" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                    {f.label} <span className="ap-filter__count">{counts[f.key] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {state.fallback && (
            <p className="sx-small sx-muted" style={{ padding: '10px 18px 0' }}>
              Showing patients who are waiting or with a doctor right now. Completed visits appear in Reports.
            </p>
          )}
          {loading ? (
            <div className="sx-card__body sx-grid" role="status" aria-label="Loading patients">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={36} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState compact icon="search" title={debounced ? `No patient matches “${debounced}”` : 'Nobody in this list'}>
              {debounced ? 'Check the token number (for example MED-004) or try the first name.' : 'Try another filter.'}
            </EmptyState>
          ) : (
            <>
              <div className="sx-table-wrap ap-table">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th scope="col">Token</th>
                      <th scope="col">Patient</th>
                      <th scope="col">Department</th>
                      <th scope="col">Registered</th>
                      <th scope="col">Language</th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="sx-visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <span className="sx-token">{r.tokenNumber}</span>
                        </td>
                        <td>
                          <div className="sx-row" style={{ gap: 6 }}>
                            <strong>{r.firstName}</strong>
                            <span className="sx-muted sx-small">
                              {[r.age !== undefined && r.age !== null ? `${r.age} y` : null, GENDER_LABEL[r.gender]].filter(Boolean).join(' · ')}
                            </span>
                            <Badges row={r} />
                          </div>
                          {r.mobile && <span className="sx-small sx-muted">{maskMobile(r.mobile)}</span>}
                        </td>
                        <td>
                          {r.department}
                          {r.status === 'called' && r.room ? <span className="sx-muted sx-small"> · {r.room}</span> : null}
                        </td>
                        <td>{clockTime(r.createdAt) || '—'}</td>
                        <td>{LANG_SHORT[r.language] || r.language || '—'}</td>
                        <td>
                          <StatusChip status={r.status} />
                        </td>
                        <td className="sx-table__actions">
                          <SlipLink row={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="ap-cards">
                {rows.map((r) => (
                  <li key={r.key} className="ap-pcard">
                    <div className="sx-between">
                      <span className="sx-token" style={{ fontSize: '1.1rem' }}>
                        {r.tokenNumber}
                      </span>
                      <StatusChip status={r.status} />
                    </div>
                    <div className="sx-row" style={{ gap: 6 }}>
                      <strong>{r.firstName}</strong>
                      <span className="sx-muted sx-small">
                        {[r.age !== undefined && r.age !== null ? `${r.age} y` : null, GENDER_LABEL[r.gender], r.department].filter(Boolean).join(' · ')}
                      </span>
                      <Badges row={r} />
                    </div>
                    <div className="sx-between">
                      <span className="sx-small sx-muted">
                        {r.createdAt ? `Registered ${clockTime(r.createdAt)}` : ''}
                        {r.language ? ` · ${LANG_SHORT[r.language] || r.language}` : ''}
                      </span>
                      <SlipLink row={r} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
      {!nothingToday && !loading && (
        <div className="sx-row sx-small sx-muted">
          <Button variant="ghost" size="sm" icon="refresh" onClick={() => load(debounced)}>
            Refresh list
          </Button>
          Showing {rows.length} of {all.length}
        </div>
      )}
    </>
  )
}

export default function PatientManager() {
  return (
    <StaffShell>
      <Patients />
    </StaffShell>
  )
}
