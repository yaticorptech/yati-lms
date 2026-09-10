import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import mascot, { PRIORITY } from './mascotBus';

/**
 * Reads the student's situation once and lets the character react to it.
 *
 * This is the reason no page contains mascot logic. It renders nothing. It
 * asks the two summary endpoints the section already has what today looks
 * like, picks the one thing most worth saying, and hands it to the bus. The
 * pages stay exactly as they were.
 *
 * It speaks once per session. A guide that greets you on every tab change is
 * not a companion, it is a popup.
 */
const ONCE_KEY = 'career.mascot.greeted';

const seenThisSession = () => {
  try {
    return sessionStorage.getItem(ONCE_KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(ONCE_KEY, '1');
  } catch {
    // Private mode: the greeting simply plays again next time.
  }
};

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * The one thing worth saying, most pressing first.
 *
 * Order is the whole design here. A student with no roadmap does not need to
 * hear about their streak, and someone with an exam tomorrow does not need a
 * greeting. Exactly one of these ever fires.
 */
const readSituation = (today, events) => {
  const hour = new Date().getHours();

  if (!today?.eligible || !today.phase) return { key: 'noRoadmap' };

  const tomorrow = ymd(new Date(Date.now() + 86400000));
  if (events?.some((e) => e.date === tomorrow && e.type === 'Exam')) return { key: 'examTomorrow' };

  const pending = (today.totalToday || 0) - (today.doneToday || 0);

  // Late, and there is still something open: the honest advice is to do one
  // small thing and stop, which is what the tired reaction says.
  if (hour >= 21 && pending > 0) return { key: 'lateEveningWithTasks' };

  // Evening, a streak alive, and nothing done today. It really is at risk.
  if (hour >= 18 && (today.streak || 0) > 0 && (today.doneToday || 0) === 0) return { key: 'streakAtRisk' };

  if (today.planReady && (today.totalToday || 0) === 0) return { key: 'noTasks' };

  // Nothing pressing: point at the next task rather than say nothing.
  if (today.task) {
    return {
      key: 'greeting',
      opts: {
        state: 'pointing',
        pose: 'guide',
        anchor: 'quest',
        message: `Next up: ${today.task.title}. Shall we start there?`,
        ms: 9000
      }
    };
  }
  return { key: 'greeting' };
};

export default function MascotSignals() {
  const { pathname } = useLocation();
  // Only on the section's front page. Deeper pages have their own moments
  // (a quiz result, a finished task) and do not need a briefing on arrival.
  const atOverview = pathname === '/career';

  useEffect(() => {
    if (!atOverview || seenThisSession()) return undefined;

    let cancelled = false;

    /* No delay timer. The character speaks the moment the answer arrives,
       which is also long enough for the page to have laid out its anchors.
       An artificial wait would be one more clock deciding what the mascot
       does, and this system has none. */
    (async () => {
      let today = null;
      let events = null;
      try {
        const [t, e] = await Promise.allSettled([api.get('/today'), api.get('/events')]);
        today = t.status === 'fulfilled' ? t.value.data : null;
        events = e.status === 'fulfilled' ? e.value.data : null;
      } catch {
        // Offline or signed out: the character simply stays quiet.
      }
      if (cancelled) return;

      const { key, opts } = readSituation(today, Array.isArray(events) ? events : events?.events);
      markSeen();
      mascot.enter();
      mascot.react(key, { priority: PRIORITY.guidance, ...opts });
    })();

    return () => {
      cancelled = true;
    };
  }, [atOverview]);

  return null;
}
