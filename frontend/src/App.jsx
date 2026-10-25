import { useEffect } from 'react'
import { AccessProvider } from './context/Access.jsx'
import { EmergencyProvider } from './context/Emergency.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { HospitalProvider, useHospital } from './context/Hospital.jsx'
import { I18nProvider } from './i18n/index.jsx'
// Patient screens
import Home from './pages/Home.jsx'
import NewPatient from './pages/NewPatient.jsx'
import OpdSlip from './pages/OpdSlip.jsx'
import MyTurn from './pages/MyTurn.jsx'
import SlipFinder from './pages/SlipFinder.jsx'
import NavigationMap from './pages/NavigationMap.jsx'
import EmergencyPage from './pages/EmergencyPage.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'
// Staff screens
import Setup from './pages/setup/Setup.jsx'
import Login from './pages/staff/Login.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import QueueConsole from './pages/admin/QueueConsole.jsx'
import CounterDesk from './pages/admin/CounterDesk.jsx'
import Departments from './pages/admin/Departments.jsx'
import People from './pages/admin/People.jsx'
import PatientManager from './pages/admin/PatientManager.jsx'
import AdvancedReports from './pages/admin/AdvancedReports.jsx'
import HospitalSettings from './pages/admin/HospitalSettings.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import WaitingBoard from './pages/WaitingBoard.jsx'
import { matchRoute, navigate, useLocation } from './router.jsx'

// Path-based routing (History API). The host must serve index.html for every path.
const ROUTES = [
  // Patients (no login)
  { path: '/', component: Home },
  { path: '/register', component: NewPatient },
  { path: '/new', component: NewPatient },
  { path: '/slip/:publicId', component: OpdSlip },
  { path: '/my-turn/:publicId', component: MyTurn },
  { path: '/my-slip', component: SlipFinder },
  { path: '/map', component: NavigationMap },
  { path: '/emergency', component: EmergencyPage },
  { path: '/settings', component: Settings },
  // Public display
  { path: '/board', component: WaitingBoard },
  // Staff (login required inside each page)
  { path: '/setup', component: Setup },
  { path: '/login', component: Login },
  { path: '/admin', component: AdminDashboard },
  { path: '/admin/queues', component: QueueConsole },
  { path: '/staff', component: QueueConsole },
  { path: '/admin/counter', component: CounterDesk },
  { path: '/admin/departments', component: Departments },
  { path: '/admin/people', component: People },
  { path: '/admin/patients', component: PatientManager },
  { path: '/admin/reports', component: AdvancedReports },
  { path: '/admin/settings', component: HospitalSettings },
  { path: '/doctor', component: DoctorDashboard },
]

function Splash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <span className="app-splash__dot" aria-hidden="true" />
      <span>Queue Mitra</span>
    </div>
  )
}

function Routes() {
  const { pathname } = useLocation()
  const { loading, configured, hospital } = useHospital()

  // A fresh install has no hospital yet: everything leads to the setup wizard until it is done.
  const needsSetup = !loading && !configured && pathname !== '/setup'
  const setupDone = configured && pathname === '/setup'

  useEffect(() => {
    if (needsSetup) navigate('/setup', { replace: true })
    else if (setupDone) navigate('/login', { replace: true })
  }, [needsSetup, setupDone])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if ((loading && !hospital) || needsSetup || setupDone) return <Splash />

  const match = matchRoute(ROUTES, pathname)
  const Page = match?.component ?? NotFound
  // key remounts the page when the path changes, so form and queue state never leak between screens
  return <Page key={pathname} {...(match?.params ?? {})} />
}

export default function App() {
  return (
    <HospitalProvider>
      <AuthProvider>
        <AccessProvider>
          <I18nProvider>
            <EmergencyProvider>
              <Routes />
            </EmergencyProvider>
          </I18nProvider>
        </AccessProvider>
      </AuthProvider>
    </HospitalProvider>
  )
}
