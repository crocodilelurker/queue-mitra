import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { useSocket } from '../../api/socket.js'
import { useAuth, isAdminRole } from '../../context/AuthContext.jsx'
import { useHospital } from '../../context/Hospital.jsx'
import { Link, navigate, useLocation } from '../../router.jsx'
import { Icon } from '../common/Icons.jsx'
import UrgentFlags from './UrgentFlags.jsx'
import { Button, ROLE_LABEL, Skeleton, StaffUIProvider, initials, useNow } from './ui.jsx'

/* ---------------------------------------------------------------------------
   Live data shared by every staff page: GET /api/staff/overview, refetched whenever the server
   says something changed (socket events on the staff room) and every 30 s as a safety net.
   --------------------------------------------------------------------------- */

const LIVE_EVENTS = ['hospital:updated', 'queue:updated', 'token:called', 'urgent:raised', 'urgent:seen', 'doctor:status', 'departments:updated', 'doctors:updated', 'staff:updated', 'queue:reset']
const LiveContext = createContext(null)

export const useStaffLive = () => useContext(LiveContext)

/** Calls `fn` (debounced) every time live data changes. Use it to refetch page-specific data. */
export function useLiveRefetch(fn) {
  const live = useStaffLive()
  const fnRef = useRef(fn)
  fnRef.current = fn
  const tick = live?.tick ?? 0
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    fnRef.current?.()
  }, [tick])
}

function useLiveOverview(enabled, onUnauthorized, onSystemReset) {
  const [state, setState] = useState({ overview: null, error: null, loading: true, lastUpdated: null })
  const [tick, setTick] = useState(0)
  const timer = useRef(null)
  const unauthorized = useRef(onUnauthorized)
  unauthorized.current = onUnauthorized

  const load = useCallback(async () => {
    try {
      const overview = await api.staffOverview()
      setState({ overview, error: null, loading: false, lastUpdated: Date.now() })
    } catch (error) {
      if (error.status === 401) unauthorized.current?.()
      setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  const refresh = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      load()
      setTick((t) => t + 1)
    }, 250)
  }, [load])

  useEffect(() => {
    if (!enabled) return
    load()
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 30000)
    return () => {
      clearInterval(poll)
      clearTimeout(timer.current)
    }
  }, [enabled, load, refresh])

  const on = {}
  LIVE_EVENTS.forEach((e) => {
    on[e] = refresh
  })
  on.connect = refresh
  on['system:reset'] = onSystemReset
  const connected = useSocket({ on: enabled ? on : {} })

  return { ...state, connected, refresh, tick }
}

/* ---------------------------------------------------------------------------
   Navigation
   --------------------------------------------------------------------------- */

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'dashboard', roles: ['admin', 'superadmin'] },
  { to: '/admin/queues', label: 'Queue console', icon: 'queue', roles: ['admin', 'superadmin', 'staff'], match: ['/staff'] },
  { to: '/admin/counter', label: 'Registration counter', icon: 'user-plus', roles: ['admin', 'superadmin', 'staff'] },
  { section: 'Hospital', roles: ['admin', 'superadmin'] },
  { to: '/admin/departments', label: 'Departments', icon: 'layers', roles: ['admin', 'superadmin'] },
  { to: '/admin/people', label: 'People', icon: 'users', roles: ['admin', 'superadmin'] },
  { to: '/admin/patients', label: 'Patients today', icon: 'clipboard', roles: ['admin', 'superadmin'] },
  { to: '/admin/reports', label: 'Reports', icon: 'chart', roles: ['admin', 'superadmin'] },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', roles: ['admin', 'superadmin'] },
]

function LiveIndicator({ connected, lastUpdated }) {
  const now = useNow(1000)
  const secs = lastUpdated ? Math.max(0, Math.round((now - lastUpdated) / 1000)) : null
  const ago = secs === null ? 'connecting…' : secs < 5 ? 'just now' : secs < 60 ? `${secs}s ago` : `${Math.round(secs / 60)} min ago`
  return (
    <span className={`sx-live${connected ? '' : ' sx-live--off'}`} role="status" aria-live="off" title={connected ? 'Live updates are on' : 'Reconnecting to live updates'}>
      <span className="sx-live__dot" aria-hidden="true" />
      <strong>{connected ? 'Live' : 'Reconnecting'}</strong>
      <span className="sx-live__text">· updated {ago}</span>
    </span>
  )
}

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div className="sx-user" ref={ref}>
      <button type="button" className="sx-user__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="sx-avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="sx-user__meta">
          <span className="sx-user__name">{user.name}</span>
          <span className="sx-user__role">{ROLE_LABEL[user.role] || user.role}</span>
        </span>
        <Icon name="chevron-right" size={14} style={{ transform: 'rotate(90deg)' }} />
        <span className="sx-visually-hidden">Account menu</span>
      </button>
      {open && (
        <div className="sx-user__pop" role="menu">
          <p>
            <strong>{user.name}</strong>
            {ROLE_LABEL[user.role] || user.role}
            {user.email ? ` · ${user.email}` : ''}
            {user.room ? ` · ${user.room}` : ''}
          </p>
          <Button variant="ghost" icon="logout" role="menuitem" onClick={onSignOut} style={{ justifyContent: 'flex-start' }}>
            Sign out
          </Button>
        </div>
      )}
    </div>
  )
}

function Brand({ hospital }) {
  return (
    <div className="sx-brand">
      <span className="sx-brand__mark" aria-hidden="true">
        <Icon name="queue" size={20} />
      </span>
      <span className="sx-brand__text">
        <span className="sx-brand__name">Queue Mitra</span>
        <span className="sx-brand__hospital">{hospital?.name || 'Staff console'}</span>
      </span>
    </div>
  )
}

function ShellSkeleton() {
  return (
    <div className="sx" aria-busy="true">
      <div className="sx-content" style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 40 }}>
        <Skeleton height={34} width="40%" />
        <Skeleton height={18} width="60%" />
        <div className="sx-stats">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={92} style={{ borderRadius: 12 }} />
          ))}
        </div>
        <Skeleton height={260} style={{ borderRadius: 12 }} />
        <span className="sx-visually-hidden" role="status">
          Loading
        </span>
      </div>
    </div>
  )
}

/**
 * One layout for every staff page.
 * roles: who may open this page. Others are sent to their own home (doctor → /doctor, staff → counter).
 * variant "doctor": no sidebar (the doctor's room console is a single screen).
 */
export default function StaffShell({ roles = ['admin', 'superadmin'], variant, children }) {
  const { currentUser: user, ready, logout } = useAuth()
  const { hospital } = useHospital()
  const { pathname, search } = useLocation()
  const [drawer, setDrawer] = useState(false)

  const role = user?.role
  const allowed = Boolean(user && roles.includes(role))

  useEffect(() => {
    if (!ready) return
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname + search)}`, { replace: true })
    } else if (!roles.includes(role)) {
      const home = role === 'doctor' ? '/doctor' : role === 'staff' ? '/admin/counter' : isAdminRole(role) ? '/admin' : '/login'
      navigate(home, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, role, roles.join(','), pathname, search])

  const signOut = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout])

  const { refresh: refreshHospital } = useHospital()
  // After a factory reset the database is empty: sign out and let the app return to /setup.
  const onSystemReset = useCallback(async () => {
    await logout()
    await refreshHospital()
  }, [logout, refreshHospital])
  const live = useLiveOverview(allowed, signOut, onSystemReset)

  useEffect(() => {
    setDrawer(false)
  }, [pathname])

  if (!ready || !allowed) return <ShellSkeleton />

  const items = NAV.filter((n) => n.roles.includes(role))
  const urgentCount = live.overview?.urgent?.length || 0
  const bare = variant === 'doctor'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <StaffUIProvider>
      <LiveContext.Provider value={live}>
        <div className="sx">
          <a href="#sx-main" className="sx-visually-hidden">
            Skip to content
          </a>
          <div className={`sx-shell${bare ? ' sx-shell--bare' : ''}`}>
            {!bare && (
              <>
                {drawer && <div className="sx-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
                <aside className={`sx-side${drawer ? ' sx-side--open' : ''}`} aria-label="Staff navigation">
                  <div className="sx-between" style={{ flexWrap: 'nowrap' }}>
                    <Brand hospital={hospital} />
                    {drawer && <Button variant="ghost" icon="close" aria-label="Close menu" onClick={() => setDrawer(false)} />}
                  </div>
                  <nav className="sx-nav">
                    {items.map((n) =>
                      n.section ? (
                        <span key={n.section} className="sx-nav__label">
                          {n.section}
                        </span>
                      ) : (
                        <Link key={n.to} to={n.to} className="sx-nav__link" aria-current={pathname === n.to || n.match?.includes(pathname) ? 'page' : undefined}>
                          <Icon name={n.icon} size={18} />
                          {n.label}
                          {n.to === '/admin/queues' && urgentCount > 0 && <span className="sx-nav__count">{urgentCount} urgent</span>}
                        </Link>
                      )
                    )}
                  </nav>
                  <div className="sx-side__foot">
                    <div className="sx-side__links">
                      <a className="sx-nav__link" href="/board" target="_blank" rel="noreferrer">
                        <Icon name="tv" size={18} /> TV board <Icon name="external" size={14} style={{ marginLeft: 'auto' }} />
                      </a>
                      <a className="sx-nav__link" href="/" target="_blank" rel="noreferrer">
                        <Icon name="phone" size={18} /> Patient app <Icon name="external" size={14} style={{ marginLeft: 'auto' }} />
                      </a>
                    </div>
                  </div>
                </aside>
              </>
            )}

            <div className="sx-main">
              <div className="sx-sticky">
                <UrgentFlags flags={live.overview?.urgent || []} onChanged={live.refresh} />
                <header className="sx-topbar">
                  {!bare && <Button variant="ghost" className="sx-topbar__menu" icon="menu" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} />}
                  <span className="sx-topbar__brand" style={bare ? { display: 'flex' } : undefined}>
                    <span className="sx-brand__mark" aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8 }}>
                      <Icon name="queue" size={17} />
                    </span>
                    <span>{hospital?.name || 'Queue Mitra'}</span>
                  </span>
                  {!bare && <span className="sx-muted sx-small sx-topbar__date">{today}</span>}
                  <span className="sx-topbar__spacer" />
                  <LiveIndicator connected={live.connected} lastUpdated={live.lastUpdated} />
                  <UserMenu user={user} onSignOut={signOut} />
                </header>
              </div>
              <main id="sx-main" className="sx-content" tabIndex={-1}>
                {children}
              </main>
            </div>
          </div>
        </div>
      </LiveContext.Provider>
    </StaffUIProvider>
  )
}
