import { I18nProvider } from './i18n/index.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <I18nProvider>
      <Home />
    </I18nProvider>
  )
}
