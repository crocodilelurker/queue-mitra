import { useState } from 'react'
import { Icon } from '../../components/common/Icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { navigate } from '../../router.jsx'

export default function AdminTopbar() {
  const { currentUser, logout, openLoginModal } = useAuth()
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/admin/patients?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const displayName = currentUser?.name || 'Asha Kulkarni'
  const displayRole = currentUser?.role === 'doctor' ? `Doctor (${currentUser.specialty || 'General'})` : 'Admin'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="mediflow-topbar">
      {/* Search Input Box */}
      <div className="mediflow-search-wrapper">
        <span className="mediflow-search-icon">
          <Icon name="search" size={17} />
        </span>
        <input
          type="text"
          className="mediflow-search-input"
          placeholder="Search patients, appointments, doctors, bills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      {/* Topbar Actions */}
      <div className="mediflow-topbar__actions">
        {/* Notification Bell */}
        <button
          type="button"
          className="btn-icon-topbar"
          title="4 new notifications"
          onClick={() => alert('Notifications:\n1. 3 new patients registered today\n2. Dr. Sunita Rao consultation completed\n3. 2 pending billing invoices\n4. Live OPD Queue running at normal load')}
        >
          <Icon name="alert" size={18} />
          <span className="notification-badge">4</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="btn-icon-topbar"
          title="Light Theme active"
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>☀️</span>
        </button>

        {/* User Profile Badge (Click to switch or see info) */}
        <div
          className="user-profile-badge"
          onClick={openLoginModal}
          title="Click to switch role or view account"
        >
          <div className="user-avatar-circle">{initials}</div>
          <div className="user-info-text">
            <span className="user-info-name">{displayName}</span>
            <span className="user-info-role">{displayRole}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          className="btn-signout"
          onClick={logout}
          title="Sign out of current account"
        >
          <Icon name="arrow-right" size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  )
}
