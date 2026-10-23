/**
 * Linguistic Ability — starting out, the Duolingo way (asked 2026-10-23, and
 * put in Duolingo's order the same day): the language the student learns
 * from, the course they want (English, or any other language's course of
 * words and sentences), why they are learning, how much of it they know, a
 * daily goal, and then where to start — from scratch, or finding their level
 * with the placement test (or, for one who knows some, straight at the level
 * they said; another language's course has no placement test). Each screen
 * needs an answer: CONTINUE stays grey until one is tapped. Shown in place of
 * the section until the student has a level in their course.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Compass, Sprout, GraduationCap, Briefcase, Users, Plane, Smile, Brain, ChevronRight } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, levelOf, deviceLanguage } from './meta';
import { Bar, Chunky, Mascot } from './ui';
import { SessionFrame } from './session/Session';

const REASONS = [
    { id: 'school', label: 'School and exams', icon: GraduationCap },
    { id: 'career', label: 'Career and jobs', icon: Briefcase },
    { id: 'people', label: 'Talk with people', icon: Users },
    { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'fun', label: 'Just for fun', icon: Smile },
    { id: 'brain', label: 'Train my brain', icon: Brain }
];
// How much of the language they know, as Duolingo asks it, and the level each answer points to.
const KNOW = [
    { know: 0, label: 'I am new to', bars: 0, level: 'beginner' },
    { know: 1, label: 'I know some common words', bars: 1, level: 'beginner' },
    { know: 2, label: 'I can have basic conversations', bars: 2, level: 'intermediate' },
    { know: 3, label: 'I can talk about various topics', bars: 3, level: 'intermediate' },
    { know: 4, label: 'I can discuss most topics in detail', bars: 4, level: 'advanced' }
];
const GOALS = [
    { xp: 10, label: 'Casual', hint: 'About 5 minutes a day' },
    { xp: 20, label: 'Regular', hint: 'About 10 minutes a day' },
    { xp: 30, label: 'Serious', hint: 'About 15 minutes a day' },
    { xp: 50, label: 'Intense', hint: 'About 25 minutes a day' }
];

/** Signal bars, like Duolingo's: how many of four are lit. */
const Bars = ({ n }) => (
    <span className="flex h-7 shrink-0 items-end gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => <span key={i} className="w-1.5 rounded-sm" style={{ height: `${i * 25}%`, background: i <= n ? COLORS.blue.face : '#E5E5E5' }} />)}
    </span>
);

/** One answer to tap: picked, it turns blue. */
const Choice = ({ on, onClick, disabled = false, children, attr = {} }) => (
    <button type="button" onClick={onClick} aria-pressed={on} disabled={disabled} {...attr}
        className={`lingo-tile flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left ${disabled ? 'cursor-not-allowed opacity-50' : ''}`} style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
        {children}
        {on && <Check size={22} strokeWidth={3.5} className="ml-auto shrink-0" style={{ color: COLORS.blue.face }} />}
    </button>
);

/** The mascot asking the question. */
const Ask = ({ pose, title, text }) => (
    <div className="mb-6 flex items-end gap-3">
        <Mascot pose={pose} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
        <div className="lingo-bubble mb-3 min-w-0 px-4 py-3">
            <h1 className="text-xl font-extrabold leading-tight text-[#3c3c3c] sm:text-2xl" style={{ textWrap: 'balance' }}>{title}</h1>
            {text && <p className="mt-1 text-[15px] font-semibold text-[#777]">{text}</p>}
        </div>
    </div>
);

/**
 * @param {object}   props.dash    the dashboard (languages, language, languageChosen, courses, course, dailyGoal, goalSet)
 * @param {Function} props.onDone  once a level is set: the section opens
 */
export default function Onboarding({ dash, onDone }) {
    const navigate = useNavigate();
    const languages = dash.languages || [];
    const device = deviceLanguage(languages.map((l) => l.code));
    const [step, setStep] = useState(0);
    const [from, setFrom] = useState(dash.languageChosen ? dash.language?.code : null);
    const [course, setCourse] = useState(dash.course?.code && dash.course.code !== 'en' ? dash.course.code : null);
    const [reason, setReason] = useState(null);
    const [know, setKnow] = useState(null);
    const [goal, setGoal] = useState(dash.goalSet ? dash.dailyGoal : null);
    const [start, setStart] = useState(null);       // 'scratch' | 'find' | 'level'
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const STEPS = ['from', 'to', 'why', 'know', 'goal', 'start'];
    const at = STEPS[step];
    const answered = { from: !!from, to: !!course, why: !!reason, know: know !== null, goal: !!goal, start: !!start }[at];
    const last = step === STEPS.length - 1;
    const said = KNOW.find((k) => k.know === know);
    const courses = dash.courses?.length ? dash.courses : [{ code: 'en', name: 'English', native: 'English', full: true }];
    const english = course === 'en' || !course;
    const name = courses.find((c) => c.code === course)?.name || 'English';
    const fromList = device ? [...languages.filter((l) => l.code === device), ...languages.filter((l) => l.code !== device)] : languages;

    const finish = () => {
        setBusy(true); setError('');
        const saves = [linguisticApi.setAbout(reason, know)];
        if (goal !== (dash.goalSet ? dash.dailyGoal : null)) saves.push(linguisticApi.setGoal(goal));
        // Their language first: the course is checked against it.
        const spoken = from !== dash.language?.code || !dash.languageChosen ? linguisticApi.setLanguage(from) : Promise.resolve();
        const level = start === 'level' ? said.level : 'beginner';
        saves.push(spoken.then(() => linguisticApi.setCourse(course, english ? null : level)));
        Promise.all(saves)
            .then(() => (!english ? onDone() : start === 'find' ? navigate('/linguistic/placement') : linguisticApi.chooseLevel(level).then(onDone)))
            .catch((e) => { setError(e.message); setBusy(false); });
    };
    const next = () => { if (!answered || busy) return; if (last) finish(); else setStep((s) => s + 1); };
    const fromName = langOf(from).name;

    return (
        <SessionFrame label={`Start learning ${name}`}>
            <header className="mx-auto flex w-full max-w-[1000px] shrink-0 items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-4 sm:px-10 sm:pt-8">
                <button type="button" onClick={() => (step ? setStep((s) => s - 1) : navigate('/'))} aria-label={step ? 'Back' : 'Leave'}
                    className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><ArrowLeft size={26} strokeWidth={3} /></button>
                <Bar value={((step + (answered ? 1 : 0)) / STEPS.length) * 100} className="h-4 flex-1" label="Getting started" />
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-onboarding={at}>
                <div className="lingo-in mx-auto w-full max-w-[600px] px-4 pb-8 pt-4 sm:pt-8" key={at}>
                    {at === 'from' && (
                        <>
                            <Ask pose="wave-hi" title="Which language do you speak?" text="You will learn from this language: meanings, translations and tips will be in it." />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {fromList.map((l) => (
                                    <Choice key={l.code} on={from === l.code} onClick={() => { setFrom(l.code); if (course === l.code && l.code !== 'en') setCourse(null); }} attr={{ 'data-language': l.code }}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white" style={{ background: from === l.code ? COLORS.blue.face : '#AFAFAF' }} lang={l.code}>{langOf(l.code).mark}</span>
                                        <span className="min-w-0">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]" lang={l.code} dir="auto">{l.native}</span>
                                            <span className="block text-sm font-semibold text-[#777]">{l.name}{l.code === device ? ' · your device’s language' : ''}</span>
                                        </span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'to' && (
                        <>
                            <Ask pose="curious-question" title="What do you want to learn?" text={from === 'en' ? 'For English speakers.' : `For ${fromName} speakers.`} />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {courses.filter((c) => c.code !== from || c.code === 'en').map((c) => (
                                    <Choice key={c.code} on={course === c.code} onClick={() => { setCourse(c.code); setStart(null); }} attr={{ 'data-course': c.code }}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white" style={{ background: course === c.code ? COLORS.blue.face : COLORS.green.face }} lang={c.code}>{c.code === 'en' ? 'En' : langOf(c.code).mark}</span>
                                        <span className="min-w-0">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{c.name}</span>
                                            <span className="block text-sm font-semibold" style={{ color: COLORS.green.ink }}>{c.full ? (from === 'en' ? 'Improve your English, all in English' : `English for ${fromName} speakers`) : `Words and sentences, taught in ${fromName}`}</span>
                                        </span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'why' && (
                        <>
                            <Ask pose="thinking" title={`Why are you learning ${name}?`} />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {REASONS.map(({ id, label, icon: Icon }) => (
                                    <Choice key={id} on={reason === id} onClick={() => setReason(id)} attr={{ 'data-reason': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.purple.face }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'know' && (
                        <>
                            <Ask pose="presenting" title={`How much ${name} do you know?`} />
                            <div className="grid gap-2">
                                {KNOW.map((k) => (
                                    <Choice key={k.know} on={know === k.know} onClick={() => { setKnow(k.know); setStart(null); }} attr={{ 'data-know': k.know }}>
                                        <Bars n={k.bars} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{k.know === 0 ? `${k.label} ${name}` : k.label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'goal' && (
                        <>
                            <Ask pose="flex-determined" title="Pick a daily goal" text="How much do you want to practise each day? You can change it later." />
                            <div className="grid gap-2">
                                {GOALS.map((g) => (
                                    <Choice key={g.xp} on={goal === g.xp} onClick={() => setGoal(g.xp)} attr={{ 'data-goal': g.xp }}>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{g.label}</span>
                                            <span className="block text-sm font-semibold text-[#777]">{g.hint}</span>
                                        </span>
                                        <span className="shrink-0 text-[15px] font-extrabold tabular-nums" style={{ color: COLORS.gold.ink }}>{g.xp} XP / day</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'start' && (
                        <>
                            <Ask pose="point-right" title="Now let's find the best place to start!" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Choice on={start === 'scratch'} onClick={() => setStart('scratch')} attr={{ 'data-start': 'scratch' }}>
                                    <span className="flex min-w-0 flex-col gap-1">
                                        <Sprout size={36} strokeWidth={2.2} style={{ color: COLORS.green.face }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">Start from scratch</span>
                                        <span className="text-sm font-semibold text-[#777]">Take the easiest lesson of the {name} course.</span>
                                        {said?.know <= 1 && <span className="mt-1 self-start rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ background: COLORS.green.light, color: COLORS.green.ink }} data-recommended>Recommended</span>}
                                    </span>
                                </Choice>
                                {english ? (
                                    <Choice on={start === 'find'} onClick={() => setStart('find')} attr={{ 'data-start': 'find' }}>
                                        <span className="flex min-w-0 flex-col gap-1">
                                            <Compass size={36} strokeWidth={2.2} style={{ color: COLORS.blue.face }} />
                                            <span className="text-[17px] font-extrabold text-[#3c3c3c]">Find my level</span>
                                            <span className="text-sm font-semibold text-[#777]">A 15-question placement test shows where you should start.</span>
                                            {said?.know >= 2 && <span className="mt-1 self-start rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ background: COLORS.blue.light, color: COLORS.blue.ink }} data-recommended>Recommended</span>}
                                        </span>
                                    </Choice>
                                ) : said && said.level !== 'beginner' && (
                                    // Another language's course has no placement test: start at the level they said.
                                    <Choice on={start === 'level'} onClick={() => setStart('level')} attr={{ 'data-start': 'level' }}>
                                        <span className="flex min-w-0 flex-col gap-1">
                                            <Compass size={36} strokeWidth={2.2} style={{ color: COLORS.blue.face }} />
                                            <span className="text-[17px] font-extrabold text-[#3c3c3c]">Start at {levelOf(said.level).label}</span>
                                            <span className="text-sm font-semibold text-[#777]">The level you told us. You can go back to easier lessons any time.</span>
                                            <span className="mt-1 self-start rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ background: COLORS.blue.light, color: COLORS.blue.ink }} data-recommended>Recommended</span>
                                        </span>
                                    </Choice>
                                )}
                            </div>
                            {/* One who knows some English may also start at the level they said, without the test. */}
                            {english && said && said.level !== 'beginner' && (
                                <button type="button" onClick={() => setStart('level')} aria-pressed={start === 'level'} data-start="level"
                                    className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-[15px] font-extrabold hover:bg-[#F7F7F7]" style={{ color: start === 'level' ? COLORS.blue.face : COLORS.blue.ink }}>
                                    {start === 'level' && <Check size={18} strokeWidth={3.5} />} Or start at {levelOf(said.level).label}, the level you told us <ChevronRight size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </main>

            {error && <p className="mx-auto w-full max-w-[1000px] shrink-0 px-4 pb-2 text-center text-[15px] font-bold sm:px-10" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
            <footer className="shrink-0 border-t-2 border-[#E5E5E5]">
                <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                    {!answered && <p className="hidden flex-1 text-[15px] font-bold text-[#AFAFAF] sm:block" data-choose-first>Choose an answer to continue.</p>}
                    <span className={answered ? 'hidden flex-1 sm:block' : 'hidden'} />
                    <Chunky color="green" onClick={next} disabled={!answered || busy} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>
                        {busy ? 'Saving…' : last && start === 'find' ? 'Start the test' : last && start ? 'Start learning' : 'Continue'}
                    </Chunky>
                </div>
            </footer>
        </SessionFrame>
    );
}
