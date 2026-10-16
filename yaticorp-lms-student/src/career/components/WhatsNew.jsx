import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

/**
 * ✨ "New in Career Path" — the releases this browser has not seen yet.
 *
 * The bell already carries one notification per release per student (the
 * server writes those). This is the same list shown where the features
 * actually are, so a student who ignores the bell still finds out on arrival.
 *
 * Seen-state lives in localStorage on purpose: it is a convenience, not a
 * record, and the server-side notification remains the copy that counts.
 * Dismissing marks every currently listed release as seen; a later release
 * with a newer key shows the card again.
 *
 * Kept per student. It was one key for the whole device, so on a shared
 * computer — a family laptop, a college lab — the first student to dismiss
 * the card hid it from everyone who signed in after them.
 */
const SEEN_PREFIX = 'career.whatsNew.seen';
// The old device-wide key. Nobody's in particular, so it is not carried over
// to anyone (the card shows once more at most); it is cleared on dismiss.
const LEGACY_KEY = SEEN_PREFIX;

const readSeen = (key) => {
  if (!key) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
};

export default function WhatsNew() {
  const { user } = useContext(AuthContext) || {};
  const userId = user?._id || user?.id || null;
  const storageKey = userId ? `${SEEN_PREFIX}:${userId}` : null;
  const [releases, setReleases] = useState([]);
  const [seenState, setSeenState] = useState(() => ({ key: storageKey, set: readSeen(storageKey) }));
  // Another student signed in (or the student arrived after the first
  // render): read their own list. Adjusted during render so no frame shows
  // the previous student's.
  if (seenState.key !== storageKey) setSeenState({ key: storageKey, set: readSeen(storageKey) });
  const seen = seenState.set;

  useEffect(() => {
    api
      .get('/notifications/features')
      .then(({ data }) => setReleases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Nothing until we know whose list to read.
  if (!storageKey) return null;
  const fresh = releases.filter((r) => !seen.has(r.key));
  if (fresh.length === 0) return null;

  const dismiss = () => {
    const next = new Set([...seen, ...releases.map((r) => r.key)]);
    setSeenState({ key: storageKey, set: next });
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Storage unavailable: the card simply shows again next visit.
    }
  };

  return (
    <section
      aria-label="What's new in Career Path"
      className="animate-fade-in-up relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-pink-50 p-5 shadow-card ring-1 ring-journey-100 ring-inset"
    >
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-journey-200/40 blur-3xl"
      />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss what's new"
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface hover:text-ink-700"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex items-start gap-3.5 pr-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-md shadow-journey-500/30">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-black tracking-[0.16em] text-journey-600 uppercase">
            New in Career Path
          </p>
          <h2 className="mt-0.5 text-lg font-black text-ink-900">
            {fresh.length === 1 ? 'One new thing to try' : `${fresh.length} new things to try`}
          </h2>

          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {fresh.map((r) => (
              <li
                key={r.key}
                className="flex flex-col rounded-2xl bg-surface/90 p-3.5 ring-1 ring-line-200/80 ring-inset backdrop-blur"
              >
                <p className="text-sm font-black text-ink-900">{r.title}</p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-500">{r.message}</p>
                {r.path && (
                  <Link
                    to={r.path}
                    onClick={dismiss}
                    className="group mt-2.5 inline-flex items-center gap-1 self-start text-xs font-black text-journey-700 hover:underline"
                  >
                    Take a look
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={dismiss}
            className="fp-press mt-3 inline-flex items-center rounded-xl bg-surface px-3.5 py-1.5 text-xs font-black text-ink-700 ring-1 ring-line-200 ring-inset transition-colors hover:bg-surface-50"
          >
            Got it
          </button>
        </div>
      </div>
    </section>
  );
}
