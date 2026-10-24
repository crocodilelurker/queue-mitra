import { useEffect } from 'react'
import { AccessProvider } from './context/Access.jsx'
import { EmergencyProvider } from './context/Emergency.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { I18nProvider } from './i18n/index.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import PatientManager from './pages/admin/PatientManager.jsx'
import DoctorAppointmentManager from './pages/admin/DoctorAppointmentManager.jsx'
import BillingManager from './pages/admin/BillingManager.jsx'
import SuperAdminManager from './pages/admin/SuperAdminManager.jsx'
import AdvancedReports from './pages/admin/AdvancedReports.jsx'
import FollowUpManager from './pages/admin/FollowUpManager.jsx'
import AnalyticsDashboard from './pages/AnalyticsDashboard.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import Home from './pages/Home.jsx'
import MyTurn from './pages/MyTurn.jsx'
import NavigationMap from './pages/NavigationMap.jsx'
import NewPatient from './pages/NewPatient.jsx'
import NotFound from './pages/NotFound.jsx'
import OpdSlip from './pages/OpdSlip.jsx'
import WaitingBoard from './pages/WaitingBoard.jsx'
import { matchRoute, useLocation } from './router.jsx'

// Path-based routing (History API). The host must serve index.html for every path.
const ROUTES = [
  { path: '/', component: Home },
  { path: '/new', component: NewPatient },
  { path: '/register', component: NewPatient },
  { path: '/slip/:publicId', component: OpdSlip },
  { path: '/my-turn/:publicId', component: MyTurn },
  { path: '/map', component: NavigationMap },
  { path: '/doctor', component: DoctorDashboard },
  { path: '/staff', component: DoctorDashboard },
  { path: '/board', component: WaitingBoard },
  { path: '/analytics', component: AnalyticsDashboard },
  // MediFlow Hospital OPD Management Suite
  { path: '/admin', component: AdminDashboard },
  { path: '/admin/patients', component: PatientManager },
  { path: '/admin/appointments', component: DoctorAppointmentManager },
  { path: '/admin/queue', component: WaitingBoard },
  { path: '/admin/doctors', component: DoctorAppointmentManager },
  { path: '/admin/consultations', component: DoctorDashboard },
  { path: '/admin/prescriptions', component: DoctorAppointmentManager },
  { path: '/admin/billing', component: BillingManager },
  { path: '/admin/follow-ups', component: FollowUpManager },
  { path: '/admin/reports', component: AdvancedReports },
  { path: '/admin/settings', component: AdvancedReports },
  { path: '/admin/super', component: SuperAdminManager },
  { path: '/super-admin', component: SuperAdminManager },
]

export default function App() {
  const { pathname } = useLocation()
  const match = matchRoute(ROUTES, pathname)
  const Page = match?.component ?? NotFound

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <AuthProvider>
      <AccessProvider>
        <I18nProvider>
          <EmergencyProvider>
            {/* key remounts the page when the path changes, so form and queue state never leak between screens */}
            <Page key={pathname} {...(match?.params ?? {})} />
          </EmergencyProvider>
        </I18nProvider>
      </AccessProvider>
    </AuthProvider>
  )
}

