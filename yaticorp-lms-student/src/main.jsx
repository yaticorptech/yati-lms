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
import MascotProvider from './mascot/MascotProvider.jsx'
import { initNative } from './native/platform'
import { startLiveUpdates } from './native/liveUpdate'

// Inside the iOS or Android app only; on the website this does nothing.
initNative()
// Local test builds only (VITE_LIVE_URL): pull new builds from the developer's Mac.
startLiveUpdates()

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MascotProvider>
          <App />
        </MascotProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// Hide splash screen once React has mounted
if (typeof window.hideSplash === 'function') {
  window.hideSplash()
}
