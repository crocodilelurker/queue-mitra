import { Link, useLocation } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'

export default function AdminSidebar() {
  const { pathname } = useLocation()

  const navItems = [
    { label: 'Dashboard', to: '/admin', icon: 'activity' },
    { label: 'Patients', to: '/admin/patients', icon: 'users' },
    { label: 'Appointments', to: '/admin/appointments', icon: 'calendar' },
    { label: 'OPD Queue', to: '/board', icon: 'queue' },
    { label: 'Doctors', to: '/admin/doctors', icon: 'doctor' },
    { label: 'Consultations', to: '/doctor', icon: 'records' },
    { label: 'Prescriptions', to: '/admin/prescriptions', icon: 'med' },
    { label: 'Billing', to: '/admin/billing', icon: 'currency-inr' },
    { label: 'Follow-ups', to: '/admin/follow-ups', icon: 'clock' },
    { label: 'Reports', to: '/admin/reports', icon: 'chart' },
    { label: 'Super Admin', to: '/admin/super', icon: 'sparkles' },
  ]

  return (
    <aside className="mediflow-sidebar" aria-label="MediFlow Navigation">
      {/* Brand Header */}
      <Link to="/admin" className="mediflow-sidebar__brand">
        <div className="mediflow-brand-icon">
          <Icon name="med" size={22} color="#ffffff" />
        </div>
        <div className="mediflow-brand-text">
          <span className="mediflow-brand-title">MediFlow</span>
          <span className="mediflow-brand-subtitle">MediFlow Demo Clinic</span>
        </div>
      </Link>

      {/* Navigation Menu */}
      <nav className="mediflow-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.to ||
            (item.to !== '/admin' && pathname.startsWith(item.to))

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`mediflow-nav__item ${
                isActive ? 'mediflow-nav__item--active' : ''
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Footer Card */}
      <div className="mediflow-sidebar__footer">
        <div className="mediflow-demo-card">
          <Icon name="warning" size={14} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>Demo mode. Fictional sample data only.</span>
        </div>

        <Link to="/" className="mediflow-kiosk-btn" title="Return to Self-Service Patient Kiosk">
          <Icon name="arrow-left" size={13} />
          <span>Patient Kiosk</span>
        </Link>
      </div>
    </aside>
  )
}
