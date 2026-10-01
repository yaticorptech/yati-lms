/**
 * @author Preethesh Kulal
 * @description React app entry point, mounts App with router and auth context
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { initNative } from './native/platform'

// Inside the iOS or Android app only; on the website this does nothing.
initNative()

// Inside the app the admin lives under /admin/ of one shared bundle, and is
// opened by its index.html; the router takes over from there.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
if (window.location.pathname.endsWith('/index.html')) {
  window.history.replaceState(null, '', `${BASE}/`)
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter basename={BASE}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// Hide splash screen once React has mounted
if (typeof window.hideSplash === 'function') {
  window.hideSplash()
}
