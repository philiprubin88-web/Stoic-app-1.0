import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker — auto-update on new deploy
registerSW({
  onNeedRefresh() {
    // New content available — silently reload (or prompt user if preferred)
    window.location.reload()
  },
  onOfflineReady() {
    console.log('[STOIC] App ready for offline use.')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
