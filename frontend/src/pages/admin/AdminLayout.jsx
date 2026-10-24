import AdminSidebar from './AdminSidebar.jsx'
import AdminTopbar from './AdminTopbar.jsx'
import AuthLoginModal from '../../components/common/AuthLoginModal.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import './admin.css'

export default function AdminLayout({ children }) {
  return (
    <div className="mediflow-shell">
      {/* 1. Proper Left Sidebar */}
      <AdminSidebar />

      {/* 2. Main Content Wrapper */}
      <div className="mediflow-main-wrapper">
        {/* Topbar with Search, Profile, and Sign Out */}
        <AdminTopbar />

        {/* Yellow Disclaimer Banner */}
        <div className="mediflow-disclaimer-banner" role="alert">
          <Icon name="warning" size={17} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Demo mode with fictional data.</strong> Before using real patient information, your clinic must review privacy, security, access controls, backups and clinical workflows. MediFlow is not certified for any healthcare regulation.
          </div>
        </div>

        {/* Page Content Body */}
        <main className="mediflow-body">
          {children}
        </main>
      </div>

      {/* Role Switcher & Login/Logout Modal */}
      <AuthLoginModal />
    </div>
  )
}
