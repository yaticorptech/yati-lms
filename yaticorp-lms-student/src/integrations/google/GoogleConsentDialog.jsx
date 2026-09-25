import { useSyncExternalStore } from 'react';
import { ShieldCheck, FolderOpen, UserRound, X, ExternalLink } from 'lucide-react';
import { beginConnect } from './api';
import { consentRequest, getSnapshot, settleConsent, subscribe } from './googleStore';

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
const ICONS = { drive: FolderOpen, identity: UserRound };

export default function GoogleConsentDialog() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const request = useSyncExternalStore(subscribe, consentRequest, consentRequest);

  if (!request) return null;

  const close = () => settleConsent(false);

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

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-consent-title"
    >
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[88dvh]">
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-9 sm:w-9">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="google-consent-title" className="text-[15px] font-bold text-slate-900 sm:text-base">
              Connect your Google account
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500 sm:text-sm">
              {request.reason || 'So your documents from this site are kept in your own Google Drive.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <p className="mb-2.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase sm:mb-3 sm:text-xs">
            What you are agreeing to
          </p>

          <ul className="space-y-2.5 sm:space-y-3">
            {(state.permissions || []).map((p) => {
              const Icon = ICONS[p.key] || ShieldCheck;
              return (
                <li key={p.key} className="flex gap-2.5 rounded-xl bg-slate-50 p-3 sm:gap-3 sm:p-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 ring-inset sm:h-8 sm:w-8">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 sm:text-sm">{p.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-slate-600 sm:mt-1 sm:text-[0.82rem] sm:leading-relaxed">{p.why}</p>
                    {/* The limit matters as much as the purpose: a student
                        should know what stays private, not only what moves. */}
                    <p className="mt-1 text-[11.5px] leading-snug font-semibold text-emerald-700 sm:mt-1.5 sm:text-[0.78rem] sm:leading-relaxed">
                      {p.limit}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 rounded-xl border border-slate-200 p-3 sm:mt-4 sm:p-3.5">
            <p className="text-[12px] leading-snug text-slate-600 sm:text-[0.82rem] sm:leading-relaxed">
              Files go into a folder called{' '}
              <span className="font-semibold text-slate-900">{state.folderName || 'YATICORP Learning'}</span>. It is
              yours. You can move it, rename it or delete it, and you can disconnect at any time from
              Career Path settings, which also removes our access at Google.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-4 py-2 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:py-2.5 sm:text-sm"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={connect}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 sm:text-sm"
          >
            Continue to Google
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
