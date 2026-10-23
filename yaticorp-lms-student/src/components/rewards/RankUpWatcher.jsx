/**
 * The leaderboard climb, on whatever page the student is on (asked
 * 2026-10-15: "when user get rank up...popup the leaderboard in users current
 * page and show moving down to upwards of particular card"). Mounted once in
 * StudentLayout.
 *
 * It looks at the student's place on this week's board when the app opens,
 * whenever XP changes anywhere ('yati:progress-changed': a lesson, a quiz, a
 * Career Path task, a game), after every save on any page ('yati:saved',
 * utils/saveSignal: the server pays XP for a forum post, a profile picture, a
 * job application… without the page saying so — those climbs were only found
 * when the dashboard next opened), and when the app comes back to the front
 * (at most once a minute). The place last seen, and the best place
 * celebrated, are kept per student and per week (`rw:rank:<user>:<weekKey>`,
 * rankPlaces.js). The climb plays (LeaderboardRankUp) only for a place better
 * than any already celebrated this week: the student's card rising from the
 * old place past the students it has overtaken. Two students trading places
 * (#2, #1, #2, #1…) see it once, not at every swap (asked 2026-10-23: "why is
 * this coming again and again").
 *
 * It shows on the page the student is on (asked again 2026-10-16: "display in
 * same page where user is there in current ... dont give popup msg only in
 * dashboard"), lesson pages included: finishing a lesson or a quiz is a
 * pause, so it shows there and then unless a video is playing. Otherwise it
 * waits while a popup is open (a level-up celebration first), while the
 * student types, while a game, the mock interview or the Global Quiz is under
 * way (they hide Yati), and on the game, mock interview and Career Path
 * set-up pages, then shows on the page they are on by then.
 */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useRewards } from '../../context/useRewards';
import { useLoopHidden } from '../loopVisibility';
import { busyOnScreen } from '../busyScreen';
import LeaderboardRankUp from './LeaderboardRankUp';
import { rankUpSince, climbedSince } from './rankPlaces';

const PERIOD = 'weekly';
// Pages that are themselves the thing being done, to the end: the climb waits
// until the student leaves. Lesson pages are not among them (see busyNow).
const BUSY_ROUTES = /^\/(interview\/mock\/|competitions\/play\/|career\/onboarding)/;
const LESSON_PAGE = /^\/learn\//;
const RESUME_GAP = 60000;
// How long after a save to look: the server pays XP once its answer has gone.
const AFTER_SAVE_MS = 1500;
// One action can pay XP in several answers (a quiz: the quiz, the pass, the
// course finished, the certificate), each with celebrations of its own that
// keep arriving for a second or two. The climb waits until all of that has
// been still for QUIET_MS and the screen has been free for FREE_MS, so it is
// the last thing shown, not one that a late badge lands on top of.
const QUIET_MS = 2500;
const FREE_MS = 1200;
// Saves that never pay XP, made over and over while a page is open.
const NOT_XP = /\/playback\b|\/rewards\/|notifications|\/read$|\/announcements\/clear|generate-otp/;

const videoPlaying = () => Array.from(document.querySelectorAll('video')).some((v) => !v.paused && !v.ended);

// The course player keeps Yati off its whole page (useHideLoop), so there
// that is no sign of being busy; a video actually playing is.
const busyNow = (learning) => {
    const path = window.location.pathname;
    const lesson = LESSON_PAGE.test(path);
    return (learning && !lesson)
        || (lesson && videoPlaying())
        || document.visibilityState !== 'visible'
        || BUSY_ROUTES.test(path)
        || busyOnScreen();
};

export default function RankUpWatcher() {
    const auth = useContext(AuthContext);
    const userId = auth?.user?._id || auth?.user?.id || null;
    const { enabled } = useRewards();
    const learning = useLoopHidden();
    const learningRef = useRef(learning);
    useEffect(() => { learningRef.current = learning; }, [learning]);

    const [climb, setClimb] = useState(null);
    const [shown, setShown] = useState(false);
    const lastCheck = useRef(0);
    const lastActivity = useRef(0);
    const inFlight = useRef(false);
    const again = useRef(false);

    // A quick look first: the ranking is worked out in full either way, but
    // only three names are looked up. The whole board (the students passed,
    // for the climb) only when the place has gone up.
    const check = useCallback(() => {
        if (!userId || !enabled) return;
        if (inFlight.current) { again.current = true; return; }
        const board = (limit) => api.get('/rewards/leaderboard', { params: { period: PERIOD, scope: 'global', limit } }).then((r) => r.data);
        const look = () => {
            inFlight.current = true;
            lastCheck.current = Date.now();
            board(3)
                .then((quick) => (climbedSince(userId, quick?.periodKey, quick?.me?.rank) ? board(500) : quick))
                .then((data) => {
                    const move = rankUpSince(userId, data?.periodKey, data?.me?.rank);
                    // A second climb before the first was closed is the same
                    // moment: one popup, from the place before either.
                    if (move) setClimb((prev) => (prev ? { from: prev.from, to: move.to, entries: data.entries, n: prev.n + 1 } : { ...move, entries: data.entries, n: 1 }));
                })
                .catch(() => { /* no board just now: the next change looks again */ })
                .finally(() => {
                    inFlight.current = false;
                    // A save that landed while this look was out is looked at too.
                    if (again.current) { again.current = false; look(); }
                });
        };
        look();
    }, [userId, enabled]);

    // On opening, and each time XP moves (a moment later, so the server has
    // the new total), and on coming back to the app.
    useEffect(() => {
        if (!userId || !enabled) return undefined;
        let soon = 0;
        const later = () => { lastActivity.current = Date.now(); clearTimeout(soon); soon = setTimeout(check, AFTER_SAVE_MS); };
        const saved = (e) => { if (!NOT_XP.test(e.detail?.url || '')) later(); };
        const rewarded = () => { lastActivity.current = Date.now(); };
        const back = () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > RESUME_GAP) check(); };
        const first = setTimeout(check, 2500);
        window.addEventListener('yati:progress-changed', later);
        window.addEventListener('yati:saved', saved);
        window.addEventListener('yati:rewards', rewarded);
        window.addEventListener('app:resume', back);
        document.addEventListener('visibilitychange', back);
        return () => {
            clearTimeout(first); clearTimeout(soon);
            window.removeEventListener('yati:progress-changed', later);
            window.removeEventListener('yati:saved', saved);
            window.removeEventListener('yati:rewards', rewarded);
            window.removeEventListener('app:resume', back);
            document.removeEventListener('visibilitychange', back);
        };
    }, [userId, enabled, check]);

    // Shown once the student is free and everything has gone quiet.
    useEffect(() => {
        if (!climb || shown) return undefined;
        let freeSince = 0;
        const timer = setInterval(() => {
            const now = Date.now();
            if (busyNow(learningRef.current) || inFlight.current) { freeSince = 0; return; }
            if (!freeSince) freeSince = now;
            if (now - freeSince >= FREE_MS && now - lastActivity.current >= QUIET_MS) { clearInterval(timer); setShown(true); }
        }, 300);
        return () => clearInterval(timer);
    }, [climb, shown]);

    const close = useCallback(() => { setClimb(null); setShown(false); }, []);
    if (!climb || !shown) return null;
    // Re-keyed when a further climb joins one already on screen: it climbs again from the first place.
    return <LeaderboardRankUp key={climb.n} from={climb.from} to={climb.to} entries={climb.entries} period={PERIOD} onClose={close} />;
}
