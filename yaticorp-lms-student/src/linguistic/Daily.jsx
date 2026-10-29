/**
 * Today's vocabulary challenge, as a session: a few word questions at the
 * student's level, new every day, judged at the end. Once a day; done, it
 * shows today's result.
 */
import { backOr } from './meta';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Target } from 'lucide-react';
import { linguisticApi, announceRewards } from './api';
import { tr, line } from './say';
import { Loading, Problem, Chunky } from './ui';
import Session, { SessionFrame } from './session/Session';
import { Finish } from './session/Finish';
import { xpIn } from './session/logic';

export default function Daily() {
    const navigate = useNavigate();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const load = useCallback(() => linguisticApi.daily().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const steps = useMemo(() => (data?.questions?.length ? [
        { key: 'intro', part: 'intro', kind: 'intro', mascot: 'flex-content', title: tr(data.language)('Daily challenge'), text: line(data.language, 'dailyIntro', data.questions.length) },
        ...data.questions.map((q) => ({ key: q.id, part: 'quiz', kind: 'question', q, collect: q.id }))
        // Each screen in the student's language (say.js).
    ].map((st) => ({ language: data.language, ...st })) : []), [data]);

    const back = backOr(navigate, '/linguistic/dashboard?tab=practice');
    if (data === undefined) return <SessionFrame label="Daily challenge"><Loading label="Picking today’s words…" /></SessionFrame>;
    if (!data) return <SessionFrame label="Daily challenge"><div className="flex flex-1 flex-col justify-center"><Problem error={error} onRetry={load} /><div className="text-center"><Chunky variant="ghost" color="blue" onClick={back}>Back</Chunky></div></div></SessionFrame>;

    const shown = result || (data.done ? { score: data.done.score, total: data.done.total, results: data.done.results, events: [], already: true } : null);
    if (shown) {
        const perfect = shown.total && shown.score === shown.total;
        return (
            <SessionFrame label="Daily challenge">
                <Finish tone="pass" pose={perfect ? 'confetti-cheer' : 'thumbs-up'} title={shown.already ? 'Done for today!' : perfect ? 'Perfect!' : 'Challenge complete!'}
                    text={shown.already ? 'You have done today’s challenge. Come back tomorrow for new words.' : 'Come back tomorrow for new words.'}
                    stats={[{ label: 'Score', value: `${shown.score}/${shown.total}`, color: 'green', icon: Target }, ...(xpIn(shown.events) ? [{ label: 'Total XP', value: xpIn(shown.events), color: 'gold', icon: Zap }] : [])]}
                    results={shown.results} primary={{ label: 'Continue', onClick: back }} />
            </SessionFrame>
        );
    }
    if (!steps.length) {
        return <SessionFrame label="Daily challenge"><Finish tone="info" pose="thinking" title="No words yet" text="There are no vocabulary lessons for the challenge yet. Check back soon." primary={{ label: 'Back', onClick: back }} /></SessionFrame>;
    }
    return (
        <SessionFrame label="Daily challenge">
            <Session steps={steps} mode="end" label="Daily challenge" onQuit={back}
                onComplete={(s) => linguisticApi.submitDaily(s.answers).then((r) => { announceRewards(r.events); setResult(r); })} />
        </SessionFrame>
    );
}
