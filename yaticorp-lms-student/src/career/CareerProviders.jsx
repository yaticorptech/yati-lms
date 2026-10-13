/**
 * @description Everything the ported Career Path screens assume is above them.
 *
 * Two route trees need this — the section proper (CareerShell) and the
 * onboarding wizard, which runs without the tab strip — so it lives on its own
 * rather than being duplicated.
 *
 * The `.futurepath` class is not decoration: it is the scope career.css is
 * written against. Rendered without it, every screen in the section falls back
 * to the LMS's font and neutral palette. The negative margins cancel
 * StudentLayout's content padding so the section can run edge-to-edge and then
 * re-apply its own — on the same `sidebar` breakpoint StudentLayout switches
 * its padding at. Keyed to `md` instead, every width between the two pulled
 * the page 16px past each side and the section scrolled sideways.
 *
 * `embedded` is for a Career Path screen shown inside another section's page
 * (Brain Boosters, under Games & Competitions): the providers and the scope,
 * but none of the page framing — no edge-to-edge margins and no canvas, so it
 * sits on the host page's own background.
 */
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { CelebrationProvider } from './components/ui/Celebration';

export default function CareerProviders({ children, embedded = false }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <CelebrationProvider>
            {embedded ? (
              <div className="futurepath" style={{ background: 'none' }}>{children}</div>
            ) : (
              <div className="futurepath -m-4 flex min-h-full flex-col p-4 sidebar:-m-8 sidebar:p-8">
                {children}
              </div>
            )}
          </CelebrationProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
