import { Link, useLocation } from '../../router.jsx'
import Layout from '../../components/Layout.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import './admin.css'

export default function AdminLayout({ children, title, subtitle }) {
  const { pathname } = useLocation()

  const tabs = [
    { label: 'Overview & Live OPD', to: '/admin', icon: 'activity' },
    { label: 'Patients', to: '/admin/patients', icon: 'users' },
    { label: 'Appointments & Doctors', to: '/admin/appointments', icon: 'calendar' },
    { label: 'Billing & Waivers', to: '/admin/billing', icon: 'currency-inr' },
    { label: 'Analytics & Reports', to: '/admin/reports', icon: 'chart' },
  ]

  return (
    <Layout wide hideEmergency={false} className="admin-page-root">
      {/* Top Administration Navigation Bar */}
      <nav className="admin-subnav" aria-label="Admin Navigation">
        <div className="admin-subnav__title">
          <span className="brand-crest" style={{ width: 30, height: 30 }}>
            <Icon name="hospital-building" size={16} color="#ffffff" />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>Mediflow OPD Central</strong>
              <span className="admin-badge-hospital">District Hospital</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              Integrated Smart Queue & Patient Desk
            </div>
          </div>
        </div>

        <div className="admin-subnav__tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.to || (tab.to !== '/admin' && pathname.startsWith(tab.to))
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`admin-nav-tab ${isActive ? 'admin-nav-tab--active' : ''}`}
              >
                <Icon name={tab.icon} size={15} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="admin-subnav__actions">
          <Link to="/" className="btn-kiosk-switch" title="Return to Self-Service Patient Kiosk">
            <Icon name="arrow-left" size={14} />
            <span>Patient Kiosk</span>
          </Link>
          <Link to="/doctor" className="btn-kiosk-switch" title="Open Doctor Consultation Desk">
            <Icon name="doctor" size={14} />
            <span>Doctor Desk</span>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      {children}
    </Layout>
  )
}
