import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, FolderOpen, Link2, Loader2, ShieldCheck, Unlink } from 'lucide-react';
import { beginConnect, disconnect } from './api';
import { getSnapshot, refresh, subscribe } from './googleStore';

/**
 * Connect, disconnect, and sync, in Career Path settings.
 *
 * Renders nothing at all when the server has no Google credentials, rather
 * than showing a button that cannot work. The permissions are listed here as
 * well as in the consent screen, so a student can read what they agreed to
 * long after they agreed to it.
 */
/** What Google's redirect told us, and what to say about it. */
const landing = () =>
  typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('google') || '';

const RETURNED = {
  connected: 'Connected. Your documents and study plan can now be saved to your account.',
  denied: 'No changes made. You can connect whenever you like.',
  expired: 'That took a little too long. Please try connecting again.',
  failed: 'Something went wrong at Google. Please try again.'
};

export default function GoogleConnectionCard() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [busy, setBusy] = useState('');
  // Read straight from the URL at first render rather than set in an effect:
  // the outcome of the redirect is known before anything is painted.
  const [note, setNote] = useState(() => RETURNED[landing()] || '');

  useEffect(() => {
    refresh();
  }, []);

  // Coming back from Google's consent screen: reload the status and tidy the
  // query string away so a refresh does not repeat the message.
  useEffect(() => {
    const result = landing();
    if (!result) return;
    if (result === 'connected') refresh(true);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  if (!state.loaded || !state.available) return null;

  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await beginConnect();
      window.location.href = url;
    } catch {
      setNote('Could not reach Google. Please try again.');
      setBusy('');
    }
  };

  const unlink = async () => {
    setBusy('disconnect');
    try {
      await disconnect();
      await refresh(true);
      setNote('Disconnected. Files already in your Drive stay there; they are yours.');
    } catch {
      setNote('Could not disconnect. Please try again.');
    }
    setBusy('');
  };

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-ink-900">Your Google account</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Keep your certificates, resume and learning bio in your own Google Drive.
          </p>
        </div>
        {state.connected && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[0.68rem] font-black text-emerald-700">
            <Check className="h-3 w-3" />
            Connected
          </span>
        )}
      </div>

      {state.connected ? (
        <>
          <p className="mt-3 text-xs font-semibold text-ink-600">
            Linked to <span className="font-mono text-ink-900">{state.email || 'your Google account'}</span>
          </p>
          <dl className="mt-2 space-y-1 text-[0.7rem] text-ink-500">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" /> Files go to “{state.folderName}”
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={unlink}
              disabled={!!busy}
              className="fp-press inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-2 text-xs font-black text-ink-600 disabled:opacity-60"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          {/* The same words as the consent screen, so the promise made before
              connecting is still readable after it. */}
          <ul className="mt-3 space-y-2">
            {(state.permissions || []).map((p) => (
              <li key={p.key} className="text-[0.72rem] leading-relaxed text-ink-600">
                <span className="font-bold text-ink-900">{p.title}.</span> {p.why}{' '}
                <span className="font-semibold text-emerald-700">{p.limit}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={connect}
            disabled={!!busy}
            className="fp-press mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {busy === 'connect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Connect Google
          </button>
        </>
      )}

      {state.needsReconnect && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.7rem] font-semibold text-amber-800">
          Google has stopped accepting our access, usually because it was removed from your account
          settings. Connect again to resume saving.
        </p>
      )}
      {note && <p className="mt-3 text-[0.7rem] font-semibold text-ink-600">{note}</p>}
    </section>
  );
}
