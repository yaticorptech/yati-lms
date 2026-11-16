/**
 * What the level just played says (2026-11-13, part 2 §7), under every game's result: from the session the adaptive
 * engine recorded (adaptive.js). Young Thinkers get warm words and pictures; older students a short analysis — score,
 * accuracy, time, right and wrong, the difficulty they played at, the skills it used, the previous best, how this
 * round compares with the last three, and the next challenge to try. A stage going down is said kindly, as more
 * practice at this level. These are practice indicators for the games, never IQ scores.
 *
 * "Try it" fires `yati:game-open` ({ gameId, zone }) for the games page to open that game.
 */
import { useEffect, useState } from 'react';
import { STAGE_LABEL, statsOf } from './adaptive';
import { currentAgeBand } from './levels';
import { BANDS, GAME_ZONES, SKILLS } from './zones';
import { vsRecent, previousBest, SKILL_EMOJI } from './achievements';

const YOUNG = ['foundation', 'developing'];
const secs = (ms) => (ms ? (ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${Math.round(ms / 1000)}s`) : '—');
const KID_SKILL = { memory: 'Remembering', logic: 'Thinking it through', number: 'Numbers', pattern: 'Patterns', spatial: 'Shapes & space', verbal: 'Words', attention: 'Focus', speed: 'Quick thinking', strategy: 'Planning', critical: 'Clever ideas' };
const REASON = {
    unlocked: 'You have unlocked this game in the next zone up.',
    weaker: 'Same skill, a game with more room to grow.',
    new: 'Same skill, a game you have not tried yet.',
    related: 'Builds a skill this game also uses.'
};


const bestText = (b) => (!b ? '—' : b.score != null ? String(b.score) : b.accuracy != null ? `${b.accuracy}%` : `${Math.round((b.mark || 0) * 100)}/100`);

export default function SessionFeedback({ gameId }) {
    const [last, setLast] = useState(null);
    useEffect(() => {
        const on = (e) => {
            if (e.detail?.gameId !== gameId) return;
            // Everything read at the moment the round ended, so the card does not shift if the records move later.
            const band = currentAgeBand();
            const zone = BANDS[band]?.zone || null;
            const g = statsOf(gameId);
            setLast({
                ...e.detail, band, zone,
                compare: vsRecent(g.sessions),
                prevBest: previousBest(g, e.detail.best)
            });
        };
        window.addEventListener('yati:game-session', on);
        return () => window.removeEventListener('yati:game-session', on);
    }, [gameId]);
    if (!last) return null;
    const { session: s, stage, moved, best, band, compare, prevBest } = last;
    const young = YOUNG.includes(band);

    if (young) {
        const face = s.passed ? (s.stars === 3 ? '🌟' : '😊') : '💪';
        const words = s.passed
            ? (s.stars === 3 ? 'Wow, a perfect round! You are a super thinker.' : 'Well done! Every round makes your brain stronger.')
            : 'Good try! Every try is practice — have another go.';
        return (
            <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200" data-session-feedback="young">
                <div className="flex items-center gap-3">
                    <span aria-hidden className="text-4xl">{face}</span>
                    <div className="min-w-0">
                        <p className="text-base font-black text-amber-900">{words}</p>
                        {s.accuracy != null && <p className="mt-0.5 text-sm font-bold text-amber-800">You got {s.correct} right{s.wrong ? ` and learnt from ${s.wrong}` : ''}. ⏱️ {secs(s.ms)}</p>}
                        {compare && compare.change > 0 && <p className="mt-0.5 text-sm font-bold text-emerald-700">📈 Even better than your last tries!</p>}
                        {best && <p className="mt-0.5 text-sm font-bold text-emerald-700">🏆 Your best ever in this game!</p>}
                        {moved === 'up' && <p className="mt-0.5 text-sm font-bold text-emerald-700">🎉 You are ready for harder puzzles!</p>}
                    </div>
                </div>
            </div>
        );
    }

    const cells = [
        ['Score', s.score != null ? String(s.score) : `${s.stars}/3 ★`],
        ['Accuracy', s.accuracy != null ? `${s.accuracy}%` : '—'],
        ['Time', secs(s.ms)],
        ['Right / wrong', s.correct != null || s.wrong != null ? `${s.correct ?? 0} / ${s.wrong ?? 0}` : '—'],
        ['Difficulty', `${STAGE_LABEL[stage]}${BANDS[band] ? ` · ${BANDS[band].label}` : ''}`],
        ['Previous best', best ? `${bestText(prevBest)} → new best!` : bestText(prevBest)]
    ];
    return (
        <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-white p-3 ring-1 ring-line-200 sm:p-4" data-session-feedback="older">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cells.map(([k, v]) => (
                    <div key={k} className="min-w-0 rounded-xl bg-surface-50 px-3 py-2">
                        <dt className="text-[11px] font-bold tracking-wide text-ink-400 uppercase">{k}</dt>
                        <dd className={`truncate text-sm font-black sm:text-base ${k === 'Previous best' && best ? 'text-emerald-600' : 'text-ink-900'}`}>{v}</dd>
                    </div>
                ))}
            </dl>
            {/* No "next challenge" suggestion (2026-11-14, the user). */}
        </div>
    );
}
