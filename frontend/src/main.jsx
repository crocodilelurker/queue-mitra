import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW registration failed', err))
  })
}
