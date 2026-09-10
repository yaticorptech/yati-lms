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
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-consent-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="google-consent-title" className="text-base font-bold text-slate-900">
              Connect your Google account
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
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

        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-slate-400 uppercase">
            What you are agreeing to
          </p>

          <ul className="space-y-3">
            {(state.permissions || []).map((p) => {
              const Icon = ICONS[p.key] || ShieldCheck;
              return (
                <li key={p.key} className="flex gap-3 rounded-xl bg-slate-50 p-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 ring-inset">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{p.title}</p>
                    <p className="mt-1 text-[0.82rem] leading-relaxed text-slate-600">{p.why}</p>
                    {/* The limit matters as much as the purpose: a student
                        should know what stays private, not only what moves. */}
                    <p className="mt-1.5 text-[0.78rem] leading-relaxed font-semibold text-emerald-700">
                      {p.limit}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-xl border border-slate-200 p-3.5">
            <p className="text-[0.82rem] leading-relaxed text-slate-600">
              Files go into a folder called{' '}
              <span className="font-semibold text-slate-900">{state.folderName || 'YATICORP Learning'}</span>. It is
              yours. You can move it, rename it or delete it, and you can disconnect at any time from
              Career Path settings, which also removes our access at Google.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={connect}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Continue to Google
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
