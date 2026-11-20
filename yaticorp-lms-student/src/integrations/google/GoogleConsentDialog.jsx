import { useSyncExternalStore } from 'react';
import { ShieldCheck, Check, X, ExternalLink, Award, Medal, FileText, ArrowRight, BookOpen, Camera } from 'lucide-react';

/** What a linked Drive keeps, shown on the app-open prompt. */
const SAVED = [[Award, 'Certificates'], [Medal, 'Badges'], [FileText, 'Resume'], [BookOpen, 'Learning bio'], [Camera, 'Activity proofs'], [FileText, 'Course PDFs']];

/** Google Drive's triangle, drawn in its three colours. */
const DriveMark = ({ small = false }) => (
  <svg viewBox="0 0 87.3 78" className={small ? 'h-3.5 w-3.5' : 'h-7 w-7'} aria-hidden="true">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);
import { beginConnect } from './api';
import { consentRequest, getSnapshot, rememberDeclined, settleConsent, subscribe } from './googleStore';

/**
 * The permission screen, shown before anything is ever sent to a student's
 * Google account.
 *
 * The whole point of this component is the middle of it. A student is told,
 * before they agree, exactly what will be written, why it is worth writing,
 * and what this site still cannot see afterwards. The wording comes from the
 * server's own permission table, which is the same table the scopes are built
 * from, so what is described and what is requested cannot drift apart.
 *
 * Mounted once, in StudentLayout. Any download anywhere can raise it.
 */

export default function GoogleConsentDialog() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const request = useSyncExternalStore(subscribe, consentRequest, consentRequest);

  if (!request) return null;

  // Not now, ×, Escape or a tap outside: no.
  const close = () => { rememberDeclined(); settleConsent(false); };

  const connect = async () => {
    try {
      const { url } = await beginConnect();
      // Google's consent screen is a full navigation, by their design: it must
      // be unmistakably Google's page and not something this site can dress up.
      window.location.href = url;
    } catch {
      settleConsent(false);
    }
  };

  const reconnect = state.connected && state.needsReconnect;
  const title = reconnect ? 'Reconnect your Google Drive'
    : request.intro ? 'Keep your achievements safe in Google Drive'
    : request.required ? 'Link your Google Drive' : 'Connect your Google account';
  const lead = request.reason
    || (request.intro
      ? 'Link Drive once and everything you earn here is saved to your own Google account — yours forever, even after you leave.'
      : 'So your documents from this site are kept in your own Google Drive.');

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-consent-title"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* The picture: their work flowing into their own Drive. */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-5 pb-5 pt-6">
          <span aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-sky-200/50 blur-3xl" />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center justify-center gap-2 sm:gap-3" aria-hidden="true">
            {[Award, Medal, FileText].map((I, i) => (
              <span key={i} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 sm:h-10 sm:w-10 shadow-sm ring-1 ring-slate-200" style={{ transform: `rotate(${(i - 1) * 6}deg)` }}><I className="h-5 w-5" /></span>
            ))}
            <ArrowRight className="mx-1 h-4 w-4 text-slate-300" />
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200"><DriveMark /></span>
          </div>
          <h2 id="google-consent-title" className="relative mt-5 text-center text-lg font-black leading-snug tracking-tight text-slate-900">{title}</h2>
          <p className="relative mx-auto mt-1.5 max-w-sm text-center text-sm leading-relaxed text-slate-600">
            {lead}
            {request.required && !request.intro && ' Link it once, then try again.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {request.intro && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Saved automatically</p>
              <ul className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SAVED.map(([I, label]) => (
                  <li key={label} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-[12px] leading-tight sm:text-[13px] font-semibold text-slate-700 ring-1 ring-slate-100">
                    <I className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(state.permissions || []).length > 0 && (
            <ul className="space-y-2">
              {state.permissions.map((p) => (
                <li key={p.key} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{p.title}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50/70 px-3 py-2.5 text-[13px] leading-snug text-slate-600 ring-1 ring-emerald-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Files go into one folder, <span className="font-semibold text-slate-800">{state.folderName || 'YATICORPX3 Learning'}</span>. We only see what this site puts there; the rest of your Google account stays private. Disconnect any time.</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-5 sm:flex-row-reverse sm:items-center sm:justify-start pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={connect}
            autoFocus
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 sm:flex-1 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 active:scale-[0.99]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white"><DriveMark small /></span>
            {reconnect ? 'Reconnect Google Drive' : 'Link Google Drive'}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </button>
          <button
            type="button"
            onClick={close}
            className="h-10 rounded-xl px-4 text-[13px] sm:h-12 font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {request.intro ? 'Maybe later' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
