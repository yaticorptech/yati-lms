import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe2, X, ArrowRight, Clock } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useStudentBusy } from './busyScreen';

// How often a page asks whether a new quiz is out (and again whenever the
// app comes back to the front).
const CHECK_MS = 60 * 1000;
// How long the notice stays when nobody answers it. It is a heads-up, not a
// question: the quiz waits on the Dashboard's Global Quiz tab regardless.
const SHOW_MS = 20 * 1000;

// What counts as busy — the pages, Yati hiding, a popup, typing — is shared
// with the daily puzzle (ContinuePanel): see busyScreen.js.

const seenKey = (userId) => `yati.gqAnnounced.${userId || 'me'}`;
const readSeen = (userId) => { try { return localStorage.getItem(seenKey(userId)) || ''; } catch { return ''; } };
const markSeen = (userId, mark) => { try { localStorage.setItem(seenKey(userId), mark); } catch { /* asked again next visit */ } };

/**
 * "A new Global Quiz is live": an on-screen notice when an administrator
 * publishes a quiz, on whatever page the student is on, website or app.
 *
 * Every page asks the server once a minute (GET /user/quizzes/global/live,
 * no questions in it). A quiz the student has not taken, still open, and not
 * announced to them before is shown once: a card at the top, with "Take the
 * quiz" and "Later".
 *
 * It never interrupts. While the student is busy — a lesson's video, notes
 * or quiz, a game, a mock interview, a form (everywhere Yati, the mascot,
 * steps aside: useLoopHidden), a popup, typing, or on the Global Quiz tab
 * already — it waits, and comes up once they are free. It does not take the
 * focus, and goes by itself after a while.
 */
export default function GlobalQuizAlert() {
    const { user, isGlobalQuizEnabled } = useContext(AuthContext);
    const userId = user?._id || user?.id;
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const [quiz, setQuiz] = useState(null);           // the live quiz worth announcing, or null
    // When this quiz's notice first came on screen, and for how long it has shown (it waits while the student is busy).
    const shownFor = useRef({ mark: '', since: 0, total: 0 });

    const markOf = (q) => `${q.id}:${q.publishedAt || ''}`;

    // Asking the server: on arrival, every minute while the page is in front, and on coming back to it.
    const check = useCallback(() => {
        if (isGlobalQuizEnabled === false || !userId || document.visibilityState !== 'visible') return;
        api.get('/user/quizzes/global/live').then(({ data }) => {
            const q = data?.quiz;
            // Days left counted here, when the answer comes, not while drawing.
            const daysLeft = q?.closesAt ? Math.ceil((new Date(q.closesAt).getTime() - Date.now()) / 86400000) : null;
            setQuiz(q && !q.attempted && !q.closed && readSeen(userId) !== markOf(q) ? { ...q, daysLeft } : null);
        }).catch(() => { /* offline for a moment: the next check will tell */ });
    }, [isGlobalQuizEnabled, userId]);
    useEffect(() => {
        check();
        const timer = setInterval(check, CHECK_MS);
        const onBack = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onBack);
        window.addEventListener('focus', onBack);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onBack); window.removeEventListener('focus', onBack); };
    }, [check]);

    // What is on screen changes without React knowing (a popup opening, a field taking the cursor): looked at twice a second while there is something to announce.
    const busy = useStudentBusy(!!quiz);

    // The Dashboard keeps its open tab in the address (?tab=), both ways.
    const onQuizTab = pathname === '/' && new URLSearchParams(search).get('tab') === 'quiz';

    // Already on the Global Quiz tab: they have found it, so it is not announced.
    useEffect(() => {
        if (!quiz || !onQuizTab) return undefined;
        markSeen(userId, markOf(quiz));
        const timer = setTimeout(() => setQuiz(null), 0);
        return () => clearTimeout(timer);
    }, [quiz, onQuizTab, userId]);

    const visible = !!quiz && !busy && !onQuizTab;
    useEffect(() => {
        if (!visible) return undefined;
        // Gone by itself once it has been on screen long enough, counting only the time it was showing.
        const seen = shownFor.current;
        if (seen.mark !== markOf(quiz)) { seen.mark = markOf(quiz); seen.total = 0; }
        seen.since = Date.now();
        const timer = setTimeout(() => { markSeen(userId, markOf(quiz)); setQuiz(null); }, Math.max(1000, SHOW_MS - seen.total));
        return () => { clearTimeout(timer); seen.total += Date.now() - seen.since; };
    }, [visible, quiz, userId]);

    if (!visible) return null;
    const close = () => { markSeen(userId, markOf(quiz)); setQuiz(null); };
    const take = () => { close(); navigate('/?tab=quiz'); };
    const { daysLeft } = quiz;
    // On My Profile the top corner is Edit Profile's: the notice sat right
    // over it (found 2026-10-22). There it comes up at the bottom instead —
    // above the phone's bottom bar, in the corner Yati leaves free on that page.
    const place = pathname === '/profile'
        ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] sidebar:bottom-6'
        : 'top-[4.75rem] sidebar:top-20';

    return (
        <div data-loop-avoid role="status" aria-live="polite"
            className={`animate-fade-in-up fixed inset-x-3 z-[120] mx-auto max-w-sm sidebar:inset-x-auto sidebar:right-6 sidebar:mx-0 sidebar:w-[22rem] ${place}`}>
            <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 shadow-2xl shadow-violet-900/15">
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-violet-100/70 blur-2xl" />
                <button type="button" onClick={close} aria-label="Dismiss"
                    className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                    <X size={16} />
                </button>
                <div className="relative flex gap-3 pr-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30">
                        <Globe2 size={22} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-600">New · Global Quiz</p>
                        <p className="mt-0.5 text-base font-black leading-snug text-slate-900">A new Global Quiz is live</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-600 first-letter:uppercase">{quiz.title}</p>
                        {daysLeft !== null && daysLeft > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <Clock size={12} aria-hidden="true" /> Open for {daysLeft === 1 ? 'one more day' : `${daysLeft} more days`}
                            </p>
                        )}
                    </div>
                </div>
                <div className="relative mt-3.5 flex items-center gap-2">
                    <button type="button" onClick={take}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/25 transition-transform hover:scale-[1.02] active:scale-95">
                        Take the quiz <ArrowRight size={15} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={close} className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}
