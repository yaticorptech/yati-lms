import { createContext, useContext, useEffect } from 'react';

/**
 * The daily play-time clock, shared between the Brain Boosters hub and the
 * game in front of the student.
 *
 * The clock counts play, not time with a game open: the briefing before
 * "Start level" and the result after it are reading, and a student deciding
 * whether to start should not watch their allowance run down. GameShell is
 * the one place that knows which of the three screens is up, so it reports
 * here, and the hub (pages/dashboard/Games.jsx) provides `{ report, left }`:
 * the setter its clock listens to, and the seconds left today (null when
 * there is no limit), which GameShell shows beside the board during play.
 * Outside the hub there is no provider: reporting does nothing and there is
 * no clock to show.
 */
export const PlayClockContext = createContext(null);

/** 754 → "12:34". */
// An hour or more (2026-11-02, 2-hour group allowances) reads 1:59:30, not 119:30.
export const clock = (seconds) => (seconds >= 3600
    ? `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
    : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`);
/** A day's allowance in words: "30 minutes", "2 hours". */
export const limitWords = (sec) => (!sec ? '30 minutes' : sec % 3600 === 0 ? `${sec / 3600} hour${sec === 3600 ? '' : 's'}` : `${Math.round(sec / 60)} minutes`);

/** Tells the hub's clock that a level is (or is no longer) in play. */
export function useReportPlaying(playing) {
  const report = useContext(PlayClockContext)?.report;
  useEffect(() => {
    if (!report) return undefined;
    report(playing);
    return () => report(false);
  }, [report, playing]);
}

/** Seconds of play left today, or null when there is no limit or no hub. */
export const usePlayLeft = () => useContext(PlayClockContext)?.left ?? null;
