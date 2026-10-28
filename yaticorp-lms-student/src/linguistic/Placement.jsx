/**
 * The placement test, as a session: 15 questions across the three levels, one
 * at a time, judged together at the end. The result is the level to start
 * at, which opens that level's lessons on the path.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { linguisticApi, announceRewards } from './api';
import { LEVELS, levelOf } from './meta';
import { tr, line } from './say';
import { Loading, Problem, Chunky } from './ui';
import Session, { SessionFrame } from './session/Session';
import { Finish } from './session/Finish';

const BAND_COLOR = { beginner: 'green', intermediate: 'gold', advanced: 'red' };
const BLURB = {
    beginner: 'We will start with everyday words, simple sentences and short conversations.',
    intermediate: 'Beginner is open for revision, and Intermediate is ready for you.',
    advanced: 'Every level is open. Start with Advanced, or revise anything below it.'
};

export default function Placement() {
    const navigate = useNavigate();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const load = useCallback(() => linguisticApi.placement().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const steps = useMemo(() => (data ? [
        { key: 'intro', part: 'intro', kind: 'intro', mascot: 'curious-question', title: tr(data.language)(data.last ? 'Retake the placement test' : 'Let’s find your English level'),
            text: line(data.language, 'placementIntro', data.questions.length),
            facts: data.last ? [`Last time: ${levelOf(data.last.level).label}, ${data.last.score}/${data.last.total}`] : ['About 5 minutes'] },
        ...data.questions.map((q) => ({ key: q.id, part: 'quiz', kind: 'question', q, collect: q.id }))
        // Each screen in the student's language (say.js).
    ].map((st) => ({ language: data.language, ...st })) : []), [data]);

    const toPath = () => navigate('/linguistic');
    if (data === undefined) return <SessionFrame label="Placement test"><Loading label="Getting the questions ready…" /></SessionFrame>;
    if (!data) return <SessionFrame label="Placement test"><div className="flex flex-1 flex-col justify-center"><Problem error={error} onRetry={load} /><div className="text-center"><Chunky variant="ghost" color="blue" onClick={toPath}>Back</Chunky></div></div></SessionFrame>;

    if (result) {
        const label = levelOf(result.level).label;
        return (
            <SessionFrame label="Placement test">
                {/* Taken again once lessons are begun (2026-10-28): the level shown, but the student stays where they are. */}
                <Finish tone="pass" pose="cheer-jump" title={`Your level: ${label}`} text={result.kept ? `Well done! You keep going from ${levelOf(result.kept).label}: finish each unit and section to move on.` : BLURB[result.level]}
                    stats={LEVELS.map((l) => ({ label: l.label, value: `${result.bands[l.id]?.score ?? 0}/${result.bands[l.id]?.total ?? 0}`, color: BAND_COLOR[l.id] }))}
                    results={result.results} primary={{ label: result.kept ? 'Keep learning' : 'Start learning', onClick: toPath }}>
                    <p className="sr-only" data-placed-level={result.level}>{label}</p>
                </Finish>
            </SessionFrame>
        );
    }
    return (
        <SessionFrame label="Placement test">
            <Session steps={steps} mode="end" label="Placement test" onQuit={toPath}
                onComplete={(s) => linguisticApi.submitPlacement(s.answers).then((r) => { announceRewards(r.events); setResult(r); })} />
        </SessionFrame>
    );
}
