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
import { startScrollCalm } from './utils/scrollCalm'

// In development, no service worker (2026-11-12): one left on localhost by a production build (vite preview) kept
// serving the old app's files, so code changes never showed. It is removed with its caches, and the page loaded
// once more, fresh. The audio clips' own cache (lingo-voice-*) is kept.
if (import.meta.env.DEV && typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then(async (regs) => {
    if (!regs.length) return
    await Promise.all(regs.map((r) => r.unregister()))
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.startsWith('lingo-voice') && !k.startsWith('kokoro')).map((k) => caches.delete(k)))
    }
    // Reloaded once only (2026-11-13): never a loop, even if a worker keeps coming back.
    try { if (sessionStorage.getItem('dev-sw-cleared')) return; sessionStorage.setItem('dev-sw-cleared', '1') } catch { return }
    window.location.reload()
  }).catch(() => {})
}

// Inside the iOS or Android app only; on the website this does nothing.
initNative()
// Local test builds only (VITE_LIVE_URL): pull new builds from the developer's Mac.
startLiveUpdates()
// Looping decorations hold still while the page scrolls, so it scrolls smoothly on a phone.
startScrollCalm()

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    {/* React Router 7's behaviour now, which also silences its two "future flag" console warnings. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
