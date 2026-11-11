/**
 * One lesson as a session, one screen at a time (asked 2026-10-22; redesigned
 * the same day to work like Duolingo): learn the concept → practise with the
 * answer after each → the quiz, with hearts → the result, the answers to look
 * back on, and the next lesson open on the path. Where the student is (learn,
 * practice, quiz) is saved (2026-10-28: no skipping to the quiz — every question is answered).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Zap, Target, Timer, Award, Download, MessageSquareText } from 'lucide-react';
import { ensureDriveLinked, downloadWithDrive } from '../integrations/google/driveGate';
const CERT_DRIVE_REASON = 'So the certificates you earn here are kept in your own Google Drive.';
import { linguisticApi, announceRewards } from './api';
import { COLORS, levelOf, backToPath, rememberLesson, setVoiceCourse } from './meta';
import { Chunky, Loading, Problem } from './ui';
import Session, { SessionFrame } from './session/Session';
import { Finish, XpParts } from './session/Finish';
import { buildLesson, heartsFor, clock, xpIn, xpBy } from './session/logic';
import { tr, trf } from './say';
import AudioPack, { needsPack } from './AudioPack';

/** The certificate earned with this lesson, to download at once. */
function CertificateBanner({ certificate, courseName = 'English', lang }) {
    const T = tr(lang);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const label = levelOf(certificate.level).label;
    const download = async () => {
        if (!(await ensureDriveLinked(CERT_DRIVE_REASON))) return;
        setBusy(true); setError('');
        linguisticApi.certificatePdf(certificate.level).then((blob) => downloadWithDrive(blob, `${courseName}_${label}_Certificate.pdf`, { title: 'Certificate', reason: CERT_DRIVE_REASON }))
            .catch((e) => setError(e.message)).finally(() => setBusy(false));
    };
    return (
        <div className="lingo-pop flex w-full flex-col items-center gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:text-left" style={{ borderColor: COLORS.gold.face, background: COLORS.gold.light }} data-certificate-earned>
            <Award size={40} className="shrink-0" style={{ color: COLORS.gold.edge }} />
            <p className="flex-1 text-[16px] font-extrabold text-[#4b4b4b]">{trf(lang)('You finished {0} and earned its certificate!', label)}{error && <span className="block text-sm" style={{ color: COLORS.red.ink }}>{error}</span>}</p>
            <Chunky color="gold" onClick={download} disabled={busy} className="!min-h-11 shrink-0"><Download size={17} /> {busy ? T('Preparing…') : T('Download')}</Chunky>
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
    const talked = useRef(null);                      // a talk's last result (Speak on a topic)
    const [packed, setPacked] = useState(() => !needsPack(lessonId)); // the unit's audio is on the device

    const load = useCallback(() => linguisticApi.lesson(lessonId).then((l) => { setLesson(l); setError(null); }).catch((e) => { setError(e); setLesson(null); }), [lessonId]);
    useEffect(() => { load(); }, [load]);
    // The lesson the student is in: the path opens at its unit when they leave it (2026-11-05).
    useEffect(() => { if (lesson?.id) rememberLesson(lesson.id); }, [lesson]);

    const steps = useMemo(() => (lesson ? buildLesson(lesson) : []), [lesson]);
    setVoiceCourse(lesson?.target); // only the course's language is read aloud
    // Out of the lesson — Continue, Back, the ✕ and its End session — the learning path at this lesson's unit, or the next
    // once the unit is finished (2026-11-05: "not Section 1, Unit 1"; 2026-10-31, "not the dashboard"). Opened from
    // another page (the roadmap, the notes), back there.
    const toPath = backToPath(navigate, lessonId);
    const endSession = () => navigate(`/linguistic?from=${encodeURIComponent(lessonId)}`);

    if (lesson === undefined) return <SessionFrame label="Lesson"><Loading label="Opening your lesson…" /></SessionFrame>;
    // A lesson not in the course they are on (another course's, or one their plan leaves out, 2026-10-27):
    // straight to their own lessons, not an error.
    if (!lesson && error?.code === 'NOT_IN_COURSE') return <Navigate to="/linguistic" replace />;
    if (!lesson) {
        const locked = error?.code === 'LESSON_LOCKED';
        return (
            <SessionFrame label="Lesson">
                {locked
                    ? <Finish tone="info" pose="worried" title="This lesson is locked" text={error.message} primary={{ label: 'Back to the path', onClick: () => navigate(`/linguistic?unit=${module}`) }} />
                    : <div className="flex flex-1 flex-col justify-center"><Problem error={error} onRetry={load} /><div className="text-center"><Chunky variant="ghost" color="blue" onClick={toPath}>Back</Chunky></div></div>}
            </SessionFrame>
        );
    }

    // The unit's audio first (2026-11-06): downloaded once, then every lesson in the unit opens straight away.
    if (!packed) return <SessionFrame label={lesson.title}><AudioPack lessonId={lessonId} onReady={() => setPacked(true)} onCancel={endSession} /></SessionFrame>;

    const id = lesson.id;
    // The result's words in the student's language too (2026-11-05, "like Duolingo"): Kannada for a Kannada speaker.
    const lang = lesson.language;
    const T = tr(lang), F = trf(lang);
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
        if (step.kind === 'speak') return linguisticApi.speaking(id, value.said, value.seconds, value.recorded);
        if (step.kind === 'talk') return linguisticApi.talk(id, given).then((r) => { talked.current = r; return r; });
        return Promise.resolve({ correct: true });
    };
    // A talk is saved when it is checked; its sentences are the answers to look back on.
    const complete = (summary) => (lesson.talk
        ? Promise.resolve(talked.current).then((r) => {
            announceRewards(r.events);
            setDone({ r: { ...r, talk: true, results: r.sentences.map((s, i) => ({ id: `s${i}`, prompt: F('Sentence {0}', i + 1), given: s.text, correct: !s.mistakes.length, answer: s.corrected, explanation: [...new Set(s.mistakes.map((m) => m.why))].join(' ') })) }, summary });
        })
        : linguisticApi.quiz(id, summary.answers).then((r) => { announceRewards(r.events); setDone({ r, summary }); }));

    if (done) {
        const { r, summary } = done;
        const xp = summary.xp + xpIn(r.events);
        // Points earned, not a percentage (2026-11-06, the user read "ಒಟ್ಟು XP 51" as 51%): "+51" under "XP earned", and what for.
        // None new (2026-11-07, the user's "+0 XP"): no XP card; only, when passed before, that its XP was earned then.
        const earned = xp > 0 ? [{ label: T('XP earned'), value: `+${xp}`, color: 'gold', icon: Zap }] : [];
        const parts = <XpParts by={xpBy(r.events, { ...summary.xpBy })} before={r.xpBefore} lang={lang} />;
        const time = { label: T('Time'), value: clock(summary.ms), color: 'blue', icon: Timer };
        // Continue: the next lesson (the result's `next`), its START showing (2026-11-07). No "Next up: …" line on the result
        // (2026-11-07, the user: "better you don't put the Next up").
        const onward = backToPath(navigate, lessonId, r.next?.id);
        if (r.talk) {
            const words = { label: T('Words'), value: r.words, color: 'blue', icon: MessageSquareText };
            return (
                <SessionFrame label={lesson.title}>
                    {r.passed ? (
                        <Finish tone="pass" pose={r.percent === 100 ? 'confetti-cheer' : 'star-celebrate'} title={T('Well spoken!')}
                            stats={[...earned, { label: T('Sentences right'), value: `${r.percent}%`, color: 'green', icon: Target }, words]}
                            banner={r.certificate ? <CertificateBanner certificate={r.certificate} courseName={lesson.targetName} lang={lang} /> : null}
                            results={r.results} primary={{ label: T('Continue'), onClick: onward }} secondary={{ label: T('Speak again'), onClick: retry }} lang={lang}>{parts}</Finish>
                    ) : (
                        <Finish tone="fail" pose="sad" title={r.short ? T('Say a little more') : T('Fix these, then speak again')}
                            text={r.short ? F('You said {0} words. Speak for at least {1} words to finish this lesson.', r.words, r.minWords) : F('{0} of {1} sentences had no mistakes ({2}%). You need {3}%. Look at the corrections, then speak again.', r.clean, r.total, r.percent, r.passingScore)}
                            stats={[{ label: T('Sentences right'), value: `${r.percent}%`, color: 'red', icon: Target }, words]}
                            results={r.results} primary={{ label: T('Speak again'), onClick: retry }} secondary={{ label: T('Back'), onClick: toPath }} lang={lang} />
                    )}
                </SessionFrame>
            );
        }
        // An entry test (2026-10-31): passed, straight to the section it opens; not, the start of the one before — no second try.
        if (r.jump) {
            const [from, to] = [levelOf(r.jump.from).label, levelOf(r.jump.to).label];
            // How each half went: the section before, and the section's own.
            const halves = (r.jump.halves || []).map((h) => ({ label: levelOf(h.level).label, value: `${h.percent}%`, color: h.percent >= r.passingScore ? 'green' : 'red', icon: Target }));
            return (
                <SessionFrame label={lesson.title}>
                    {r.jump.passed ? (
                        <Finish tone="pass" pose="confetti-cheer" title={F('You can go straight to {0}!', to)} text={F('You scored {0}% on the {1} entry test, with half of each part right: {1} is open.', r.percent, to)}
                            stats={halves.length ? [...halves, time] : [{ label: T('Score'), value: `${r.percent}%`, color: 'green', icon: Target }, time]}
                            results={r.results} primary={{ label: F('Go to {0}', to), onClick: () => navigate(`/linguistic?section=${r.jump.to}`) }} lang={lang} />
                    ) : (
                        <Finish tone="fail" pose="sad" title={F('Not yet: you start from {0}', from)}
                            text={F('You scored {0}%. To go straight to {1} you needed {2}% or more on both {3} and {1}. You learn from the start of {3}: finish it and pass its assessment to open {1}.', r.percent, to, r.passingScore, from)}
                            stats={halves.length ? [...halves, time] : [{ label: T('Score'), value: `${r.percent}%`, color: 'red', icon: Target }, time]}
                            results={r.results} primary={{ label: F('Start {0}', from), onClick: () => navigate(`/linguistic?section=${r.jump.from}`) }} lang={lang} />
                    )}
                </SessionFrame>
            );
        }
        return (
            <SessionFrame label={lesson.title}>
                {r.passed ? (
                    <Finish tone="pass" pose={r.percent === 100 ? 'confetti-cheer' : 'star-celebrate'} title={r.percent === 100 ? T('Perfect lesson!') : T('Lesson complete!')}
                        stats={[...earned, { label: r.percent === 100 ? T('Amazing') : T('Score'), value: `${r.percent}%`, color: 'green', icon: Target }, time]}
                        banner={r.certificate ? <CertificateBanner certificate={r.certificate} courseName={lesson.targetName} lang={lang} /> : null}
                        results={r.results} practice={summary.practice} primary={{ label: T('Continue'), onClick: onward }} secondary={{ label: T('Retake quiz'), onClick: retry }} lang={lang}>{parts}</Finish>
                ) : (
                    <Finish tone="fail" pose={summary.outOfHearts ? 'sad-slump' : 'sad'}
                        title={summary.outOfHearts ? T('Out of hearts!') : r.percent >= r.passingScore - 20 ? T('So close!') : T('Keep practising!')}
                        text={F('You scored {0}%. You need {1}% to finish this lesson. Look at the answers, then try the quiz again.', r.percent, r.passingScore)}
                        stats={[{ label: T('Score'), value: `${r.percent}%`, color: 'red', icon: Target }, time]}
                        results={r.results} practice={summary.practice} primary={{ label: T('Try again'), onClick: retry }} secondary={{ label: T('Back'), onClick: toPath }} lang={lang} />
                )}
            </SessionFrame>
        );
    }

    return (
        <SessionFrame label={lesson.title}>
            <Session key={run.n} steps={runSteps} hearts={lesson.quiz?.length ? heartsFor(lesson.quiz.length, lesson.passingScore) : null} check={check} onComplete={complete} onQuit={endSession}
                onEnterPart={(part) => { if (part === 'practice' || part === 'quiz') linguisticApi.step(id, part).catch(() => {}); }}
                label={lesson.title} />
        </SessionFrame>
    );
}

/** Each lesson its own page: the next one opens fresh. */
export default function LessonRoute() {
    const { lessonId } = useParams();
    return <LessonPage key={lessonId} />;
}
