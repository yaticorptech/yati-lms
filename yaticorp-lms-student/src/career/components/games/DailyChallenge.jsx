/**
 * The daily brain challenge (2026-11-13): three games a day for the student's zone, the same all day, mixing skills
 * (achievements.js dailyPicks). A game is ticked once a session for it is recorded today; the streak counts days in a
 * row with all three done. Props: { zone, band, onPlay(gameId) }.
 */
import { useEffect, useState } from 'react';
import { allStats } from './adaptive';
import { currentStudentId } from './gameStorage';
import { GAME_ZONES, SKILLS } from './zones';
import { dailyPicks, dailyProgress, dailyStreak, dayKeyOf, gameName, SKILL_EMOJI } from './achievements';

export default function DailyChallenge({ zone, band, onPlay }) {
    // The time of the last refresh: read again whenever a round ends, so the day rolls over with play.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const bump = () => setNow(Date.now());
        window.addEventListener('yati:game-session', bump);
        window.addEventListener('yati:games-synced', bump);
        return () => { window.removeEventListener('yati:game-session', bump); window.removeEventListener('yati:games-synced', bump); };
    }, []);
    if (!zone) return null;
    const all = allStats();
    const studentId = currentStudentId() || 'guest';
    const date = dayKeyOf(now);
    const picks = dailyPicks({ zone, band, studentId, date });
    const progress = dailyProgress(picks, all, date);
    const done = progress.filter((p) => p.done).length;
    const streak = dailyStreak(all, { zone, band, studentId, now });

    return (
        <section className="rounded-2xl bg-white p-3 ring-1 ring-line-200 sm:p-4" data-daily-challenge>
            <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden className="text-xl">📅</span>
                <h2 className="min-w-0 flex-1 text-sm font-black text-ink-900">Daily brain challenge</h2>
                <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-black text-ink-600">{done}/{picks.length} done</span>
                {streak > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-700" title="Days in a row with the whole challenge done">🔥 {streak} day{streak === 1 ? '' : 's'}</span>}
            </div>
            <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {progress.map(({ gameId, done: ok }) => {
                    const skill = GAME_ZONES[gameId]?.skill;
                    return (
                        <li key={gameId}>
                            <button type="button" onClick={() => onPlay?.(gameId)} data-daily-game={gameId}
                                className={`fp-press flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 transition-colors ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-surface-50 ring-line-200 hover:ring-violet-300'}`}>
                                <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${ok ? 'bg-emerald-500 text-white' : 'bg-white text-ink-400 ring-1 ring-line-200'}`}>{ok ? '✓' : SKILL_EMOJI[skill] || '•'}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-black text-ink-900">{gameName(gameId)}</span>
                                    <span className="block truncate text-[11px] font-semibold text-ink-500">{SKILLS[skill]}</span>
                                </span>
                                {ok && <span className="sr-only">done</span>}
                            </button>
                        </li>
                    );
                })}
            </ol>
            {done === picks.length && picks.length > 0 && <p className="mt-2 text-xs font-bold text-emerald-700">All done for today — great practice! New games tomorrow.</p>}
        </section>
    );
}
