/**
 * One lesson as a session, one screen at a time (asked 2026-10-22; redesigned
 * the same day to work like Duolingo): learn the concept → practise with the
 * answer after each → the quiz, with hearts → the result, the answers to look
 * back on, and the next lesson open on the path. Where the student is (learn,
 * practice, quiz) is saved; one who has reached the quiz before can skip to it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Zap, Target, Timer, Award, Download } from 'lucide-react';
import { saveBlob } from '../native/saveFile';
import { linguisticApi, announceRewards } from './api';
import { COLORS, levelOf } from './meta';
import { Chunky, Loading, Problem } from './ui';
import Session, { SessionFrame } from './session/Session';
import { Finish } from './session/Finish';
import { buildLesson, heartsFor, clock, xpIn } from './session/logic';

/** The certificate earned with this lesson, to download at once. */
function CertificateBanner({ certificate, courseName = 'English' }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const label = levelOf(certificate.level).label;
    const download = () => {
        setBusy(true); setError('');
        linguisticApi.certificatePdf(certificate.level).then((blob) => saveBlob(blob, `${courseName}_${label}_Certificate.pdf`, { title: 'Certificate' }))
            .catch((e) => setError(e.message)).finally(() => setBusy(false));
    };
    return (
        <div className="lingo-pop flex w-full flex-col items-center gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:text-left" style={{ borderColor: COLORS.gold.face, background: COLORS.gold.light }} data-certificate-earned>
            <Award size={40} className="shrink-0" style={{ color: COLORS.gold.edge }} />
            <p className="flex-1 text-[16px] font-extrabold text-[#4b4b4b]">You finished {label} and earned its certificate!{error && <span className="block text-sm" style={{ color: COLORS.red.ink }}>{error}</span>}</p>
            <Chunky color="gold" onClick={download} disabled={busy} className="!min-h-11 shrink-0"><Download size={17} /> {busy ? 'Preparing…' : 'Download'}</Chunky>
        </div>
    );
}

function LessonPage() {
    const { module, lessonId } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(undefined);
    const [error, setError] = useState(null);
    const [run, setRun] = useState({ n: 0, from: 'start' });
    const [done, setDone] = useState(null);           // { r, summary }

    const load = useCallback(() => linguisticApi.lesson(lessonId).then((l) => { setLesson(l); setError(null); }).catch((e) => { setError(e); setLesson(null); }), [lessonId]);
    useEffect(() => { load(); }, [load]);

    const steps = useMemo(() => (lesson ? buildLesson(lesson) : []), [lesson]);
    const toPath = () => navigate('/linguistic');

    if (lesson === undefined) return <SessionFrame label="Lesson"><Loading label="Opening your lesson…" /></SessionFrame>;
    if (!lesson) {
        const locked = error?.code === 'LESSON_LOCKED';
        return (
            <SessionFrame label="Lesson">
                {locked
                    ? <Finish tone="info" pose="worried" title="This lesson is locked" text={error.message} primary={{ label: 'Back to the path', onClick: () => navigate(`/linguistic?unit=${module}`) }} />
                    : <div className="flex flex-1 flex-col justify-center"><Problem error={error} onRetry={load} /><div className="text-center"><Chunky variant="ghost" color="blue" onClick={toPath}>Back to the path</Chunky></div></div>}
            </SessionFrame>
        );
    }

    const id = lesson.id;
    const quizFrom = steps.findIndex((s) => s.part === 'quiz');
    const runSteps = run.from === 'quiz' && quizFrom > 0 ? steps.slice(quizFrom) : steps;
    const retry = () => { setDone(null); setRun((r) => ({ n: r.n + 1, from: 'quiz' })); linguisticApi.step(id, 'quiz').catch(() => {}); };

    const check = (step, given, value) => {
        if (step.kind === 'question') return step.section === 'quiz' ? linguisticApi.quizCheck(id, step.q.id, given) : linguisticApi.check(id, step.section, step.q.id, given);
        if (step.kind === 'translate') {
            return step.section === 'quiz' ? linguisticApi.quizCheck(id, step.item.id, given)
                : linguisticApi.check(id, 'items', step.item.id, given).then((r) => { announceRewards(r.events); return r; });
        }
        if (step.kind === 'write') return linguisticApi.writing(id, step.task.id, given);
        if (step.kind === 'speak') return linguisticApi.speaking(id, value.ticks, value.recorded);
        return Promise.resolve({ correct: true });
    };
    const complete = (summary) => linguisticApi.quiz(id, summary.answers).then((r) => { announceRewards(r.events); setDone({ r, summary }); });

    if (done) {
        const { r, summary } = done;
        const xp = summary.xp + xpIn(r.events);
        const time = { label: 'Time', value: clock(summary.ms), color: 'blue', icon: Timer };
        return (
            <SessionFrame label={lesson.title}>
                {r.passed ? (
                    <Finish tone="pass" pose={r.percent === 100 ? 'confetti-cheer' : 'star-celebrate'} title={r.percent === 100 ? 'Perfect lesson!' : 'Lesson complete!'}
                        text={r.next ? `Next up: ${r.next.title}` : null}
                        stats={[{ label: 'Total XP', value: xp, color: 'gold', icon: Zap }, { label: r.percent === 100 ? 'Amazing' : 'Score', value: `${r.percent}%`, color: 'green', icon: Target }, time]}
                        banner={r.certificate ? <CertificateBanner certificate={r.certificate} courseName={lesson.targetName} /> : null}
                        results={r.results} primary={{ label: 'Continue', onClick: toPath }} secondary={{ label: 'Retake quiz', onClick: retry }} />
                ) : (
                    <Finish tone="fail" pose={summary.outOfHearts ? 'sad-slump' : 'sad'}
                        title={summary.outOfHearts ? 'Out of hearts!' : r.percent >= r.passingScore - 20 ? 'So close!' : 'Keep practising!'}
                        text={`You scored ${r.percent}%. You need ${r.passingScore}% to finish this lesson. Look at the answers, then try the quiz again.`}
                        stats={[{ label: 'Score', value: `${r.percent}%`, color: 'red', icon: Target }, time]}
                        results={r.results} primary={{ label: 'Try again', onClick: retry }} secondary={{ label: 'Back to the path', onClick: toPath }} />
                )}
            </SessionFrame>
        );
    }

    const reached = lesson.progress.status === 'completed' || lesson.progress.step === 'quiz';
    return (
        <SessionFrame label={lesson.title}>
            <Session key={run.n} steps={runSteps} hearts={lesson.quiz?.length ? heartsFor(lesson.quiz.length, lesson.passingScore) : null} check={check} onComplete={complete} onQuit={toPath}
                onEnterPart={(part) => { if (part === 'practice' || part === 'quiz') linguisticApi.step(id, part).catch(() => {}); }}
                canSkipToQuiz={reached} label={lesson.title} />
        </SessionFrame>
    );
}

/** Each lesson its own page: the next one opens fresh. */
export default function LessonRoute() {
    const { lessonId } = useParams();
    return <LessonPage key={lessonId} />;
}
