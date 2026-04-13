import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Register our hand-written service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        console.log('[STOIC] SW registered:', reg.scope)
        // When a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available — reload to get it
              window.location.reload()
            }
          })
        })
      })
      .catch(err => console.warn('[STOIC] SW registration failed:', err))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
