/**
 * Revision, as a session: the questions the student got wrong, asked again,
 * each checked at once. A right answer takes it off the list; a wrong one
 * stays for next time.
 */
import { backOr } from './meta';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Timer } from 'lucide-react';
import { linguisticApi } from './api';
import { Loading, Problem, Chunky } from './ui';
import Session, { SessionFrame } from './session/Session';
import { Finish } from './session/Finish';
import { clock } from './session/logic';

const ROUND = 15;

export default function Review() {
    const navigate = useNavigate();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    const [round, setRound] = useState(0);

    const load = useCallback(() => linguisticApi.review().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const steps = useMemo(() => (data ? data.mistakes.slice(0, ROUND).map((m) => (m.question.type === 'translation'
        ? { key: m.id, part: 'review', kind: 'translate', mistake: m, item: { id: m.id, source: m.question.source }, direction: m.question.direction, language: m.question.language || 'kn', target: m.question.target || 'en', targetLocale: m.question.targetLocale || 'en-IN' }
        : { key: m.id, part: 'review', kind: 'question', mistake: m, q: m.question, language: data.language })) : []), [data]);

    const back = backOr(navigate, '/linguistic/dashboard?tab=practice');
    if (data === undefined) return <SessionFrame label="Fix your mistakes"><Loading label="Finding your mistakes…" /></SessionFrame>;
    if (!data) return <SessionFrame label="Fix your mistakes"><div className="flex flex-1 flex-col justify-center"><Problem error={error} onRetry={load} /><div className="text-center"><Chunky variant="ghost" color="blue" onClick={back}>Back</Chunky></div></div></SessionFrame>;

    if (summary) {
        const total = summary.right + summary.wrong;
        const left = data.mistakes.length - summary.right;
        return (
            <SessionFrame label="Fix your mistakes">
                <Finish tone="pass" pose={summary.wrong ? 'thumbs-up' : 'star-celebrate'} title={summary.wrong ? 'Good revision!' : 'All fixed!'}
                    text={left > 0 ? `${left} still to fix. Practise again to clear them.` : 'Your mistakes list is empty. Well done!'}
                    stats={[{ label: 'Fixed', value: `${summary.right}/${total}`, color: 'green', icon: Target }, { label: 'Time', value: clock(summary.ms), color: 'blue', icon: Timer }]}
                    primary={{ label: 'Continue', onClick: back }}
                    secondary={left > 0 ? { label: 'Practise again', onClick: () => { setSummary(null); setData(undefined); setRound((r) => r + 1); load(); } } : null} />
            </SessionFrame>
        );
    }
    if (!steps.length) {
        return <SessionFrame label="Fix your mistakes"><Finish tone="info" pose="heart-hands" title="No mistakes to fix!" text="Answers you get wrong in lessons and challenges come here, so you can practise them until you get them right." primary={{ label: 'Back', onClick: back }} /></SessionFrame>;
    }
    return (
        <SessionFrame label="Fix your mistakes">
            <Session key={round} steps={steps} label="Fix your mistakes" onQuit={back} onComplete={(s) => setSummary(s)}
                check={(step, given) => linguisticApi.answerReview(step.mistake.id, given)} />
        </SessionFrame>
    );
}
