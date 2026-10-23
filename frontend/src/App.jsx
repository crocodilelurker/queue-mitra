import { I18nProvider } from './i18n/index.jsx'
import Home from './pages/Home.jsx'
import NewPatient from './pages/NewPatient.jsx'

// Minimal path-based routing (no router dependency needed for two pages).
// The server/dev/preview fallback serves index.html for any path, so /new works when opened directly.
const ROUTES = { '/new': NewPatient }

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const Page = ROUTES[path] ?? Home
  return (
    <I18nProvider>
      <Page />
    </I18nProvider>
  )
}
