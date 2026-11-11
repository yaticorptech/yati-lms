/**
 * Linguistic Ability — starting out, the way language apps ask it (asked
 * 2026-10-23; Duolingo, Babbel and Busuu's questions 2026-10-26; and
 * Talkpal's, the same day: "first get them started, then ask these"). A
 * welcome to Get started; the language to learn (searched in a grid);
 * their reason; the language they know — translations and tips
 * are in it (searched in a list); where a little every day takes them; the languages they speak, write and read;
 * then, last (2026-11-04), Beginner or Advanced — Advanced takes the Advanced entry test straight away. The time is
 * not asked (2026-11-04, "set it automatically, don't give the learning days to choose"): the roadmap is made for
 * 90 days, or 60 of the Advanced lessons once the test is passed (server service.js, autoPlan). Everyone starts at
 * Section 1, Unit 1 (2026-10-28; before then: from scratch, or finding
 * their level with the placement test (or, for one who knows some, straight
 * at the level they said).
 * The two languages can be changed later in the dropdowns by the level
 * (LanguagePicker.jsx). Each question needs an answer: CONTINUE stays grey
 * until one is tapped. Shown in place of the section until the student has a
 * level in their course.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, GraduationCap, Briefcase, Users, Plane, Smile, Brain, Search, FlaskConical, Globe, Sparkles, Compass } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, deviceLanguage } from './meta';
import { Bar, Chunky, Mascot } from './ui';
import { SessionFrame } from './session/Session';
import KnowsPick from './parts/KnowsPick';
import { tr, trf } from './say';

/** A language's name in another ("en" in Kannada: ಇಂಗ್ಲಿಷ್), by the browser's own list; null where it has none. */
const nameIn = (code, lang) => { try { const n = new Intl.DisplayNames([lang], { type: 'language' }).of(code); return n && n !== code ? n : null; } catch { return null; } };

const REASONS = [
    { id: 'research', label: 'Academia and research', icon: FlaskConical },
    { id: 'school', label: 'School, university and exams', icon: GraduationCap },
    { id: 'travel', label: 'Travel and tourism', icon: Plane },
    { id: 'career', label: 'Job and career', icon: Briefcase },
    { id: 'abroad', label: 'Living abroad', icon: Globe },
    { id: 'people', label: 'Talking with friends and people', icon: Users },
    { id: 'fun', label: 'Just for fun', icon: Smile },
    { id: 'brain', label: 'Train my brain', icon: Brain },
    { id: 'other', label: 'Other', icon: Sparkles }
];
// What they want to achieve, how they like to learn, their age, and the minutes a day (2026-10-26, as Talkpal asks).
// What they want to get better at, the topics they like, and when they like to learn (more than one may be chosen of the first two).
// Their level, the last question (2026-11-04: two answers; before, five, from "I am new to" to "I can discuss most
// topics in detail"). `know`: the answer kept with their reason (0 new … 4 knows it well); `cefr`, shown beside it.
const LEVELS = [
    { level: 'beginner', label: 'Beginner', text: (name) => `Start from the first lesson: the letters, words and short sentences of ${name}.`, bars: 1, cefr: 'A1–A2', know: 0 },
    { level: 'advanced', label: 'Advanced', text: (name) => `I know ${name} well. Start from scratch, or take a short test to start at Advanced.`, bars: 4, cefr: 'B2+', know: 4 }
];
/** The days of a Beginner's roadmap (set by the server, service.js AUTO_DAYS): the weeks on the chart. */
const BEGINNER_DAYS = 90;

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

/** The search above a list of languages. */
const SearchBox = ({ value, onChange, label }) => (
    <label className="relative mb-4 block">
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#AFAFAF]" aria-hidden="true" />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search languages" aria-label={label} data-language-search
            className="w-full rounded-2xl border-2 border-[#E5E5E5] bg-white py-3 pl-12 pr-4 text-[17px] font-semibold text-[#4b4b4b] placeholder:text-[#AFAFAF] focus:border-[#84D8FF] focus:outline-none" />
    </label>
);
const matches = (q, ...names) => !q.trim() || names.some((n) => String(n || '').toLowerCase().includes(q.trim().toLowerCase()));

/** A screen with no question: the mascot, a title and a line (Get started; Let's get you started). */
const Message = ({ pose, title, text, children }) => (
    <div className="flex flex-col items-center gap-4 pt-4 text-center sm:pt-8">
        <Mascot pose={pose} className="h-40 w-40 sm:h-48 sm:w-48" />
        <h1 className="text-2xl font-extrabold leading-tight text-[#3c3c3c] sm:text-3xl" style={{ textWrap: 'balance' }}>{title}</h1>
        {text && <p className="max-w-md text-[17px] font-semibold leading-relaxed text-[#777]">{text}</p>}
        {children}
    </div>
);

/**
 * Where the roadmap takes them (2026-10-26, Talkpal's "Reach your learning
 * goals faster"): their level now, and by the last week of their plan — a
 * little every day against now and then. A picture of the idea, not a
 * measurement.
 */
const GoalChart = ({ weeks }) => (
    <svg viewBox="0 0 330 210" className="mx-auto w-full max-w-md" role="img" aria-label={`From your level now to week ${weeks}: practising every day climbs higher than now and then.`} data-goal-chart={weeks}>
        {[60, 130, 200, 270].map((x) => <line key={x} x1={x} y1="30" x2={x} y2="170" stroke="#E5E5E5" strokeWidth="2" strokeDasharray="5 6" />)}
        <path d="M20 160 C 90 160, 120 150, 160 115 S 240 45, 305 40" fill="none" stroke={COLORS.blue.face} strokeWidth="5" strokeLinecap="round" />
        <path d="M20 160 C 100 160, 150 152, 200 132 S 260 108, 305 106" fill="none" stroke="#C4C4C4" strokeWidth="5" strokeLinecap="round" />
        <circle cx="60" cy="158" r="8" fill="#fff" stroke={COLORS.green.face} strokeWidth="5" />
        <circle cx="270" cy="43" r="8" fill="#fff" stroke={COLORS.blue.face} strokeWidth="5" />
        <circle cx="270" cy="110" r="8" fill="#fff" stroke="#AFAFAF" strokeWidth="5" />
        <rect x="22" y="118" width="76" height="24" rx="12" fill={COLORS.green.face} />
        <text x="60" y="134" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">Your level</text>
        <rect x="226" y="6" width="88" height="24" rx="12" fill={COLORS.blue.face} />
        <text x="270" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">Every day</text>
        <rect x="222" y="72" width="96" height="24" rx="12" fill="#AFAFAF" />
        <text x="270" y="88" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">Now and then</text>
        <text x="60" y="194" textAnchor="middle" fontSize="14" fontWeight="800" fill={COLORS.green.ink}>Now</text>
        <text x="270" y="194" textAnchor="middle" fontSize="14" fontWeight="800" fill={COLORS.blue.ink}>Week {weeks}</text>
    </svg>
);

/*
 * Where a student left the start screens (asked 2026-10-26: asked once, from
 * Get started; never again once answered): one who leaves half-way comes
 * back to the same question with their answers, on this device. Forgotten
 * once the answers are saved.
 */
/**
 * The screens, in turn (2026-10-27: the aim, "Let's get you started", learning style, skills, topics, age,
 * minutes a day and time of day were taken out, at the user's word; 2026-10-28: "where to start" too — every
 * student starts at Section 1, Unit 1, and opens each unit and section by finishing the one before); then, last
 * (asked the same day), the languages they speak, write and read — shown on the section's dashboard.
 */
// 'start' (2026-11-07, the user's Duolingo picture "Now, let's find the best place to start!"): only after Advanced —
// from scratch, or the Advanced entry test to find their level; in the language they know.
const STEPS = ['welcome', 'learn', 'why', 'translate', 'chart', 'speak', 'write', 'read', 'level', 'start'];
/** The screens before then: a place kept by its number in this list is read by its name (the level and the time were asked here). */
const OLD_STEPS = ['welcome', 'learn', 'know', 'aim', 'started', 'why', 'style', 'focus', 'topics', 'age', 'translate', 'practice', 'when', 'time', 'chart', 'start'];
/** Where one who left half-way comes back to: the screen they were on, or the last one still asked before it. */
const placeOf = (saved) => {
    const name = saved.at || OLD_STEPS[saved.step] || 'welcome';
    if (STEPS.includes(name)) return STEPS.indexOf(name);
    for (let i = OLD_STEPS.indexOf(name); i >= 0; i--) if (STEPS.includes(OLD_STEPS[i])) return STEPS.indexOf(OLD_STEPS[i]);
    return 0;
};
const startKey = () => { try { return `lingo:start:${JSON.parse(localStorage.getItem('studentData') || '{}')._id || 'me'}`; } catch { return 'lingo:start:me'; } };
const readStart = () => { try { return JSON.parse(localStorage.getItem(startKey()) || 'null') || {}; } catch { return {}; } };
const forgetStart = () => { try { localStorage.removeItem(startKey()); } catch { /* storage off */ } };

/**
 * @param {object}   props.dash    the dashboard (language, course: the dropdowns')
 * @param {Function} props.onDone  once a level is set: the section opens
 */
export default function Onboarding({ dash, onDone }) {
    const navigate = useNavigate();
    // The two languages: the course they are on (English to begin) and the one they know — one they chose before, else they
    // pick it (their device's language first in the list). Both can be changed later in the dropdowns (LanguagePicker.jsx).
    const languages = dash.languages || [];
    const courses = dash.courses?.length ? dash.courses : [{ code: 'en', name: 'English', native: 'English', full: true }];
    const [saved] = useState(readStart);
    const [course, setCourse] = useState(saved.course || dash.course?.code || 'en');
    const [from, setFrom] = useState(saved.from || (dash.languageChosen ? dash.language?.code : null));
    const device = deviceLanguage(languages.map((l) => l.code));
    const known = device ? [...languages.filter((l) => l.code === device), ...languages.filter((l) => l.code !== device)] : languages;
    const [findCourse, setFindCourse] = useState('');
    const [findLanguage, setFindLanguage] = useState('');
    const [step, setStep] = useState(() => placeOf(saved));
    const [reason, setReason] = useState(saved.reason ?? null);
    // Beginner or Advanced (an answer kept from the five-answer question: the top one was Advanced).
    const [level, setLevel] = useState(saved.level || (saved.know == null ? null : saved.know === 4 ? 'advanced' : 'beginner'));
    const [speak, setSpeak] = useState(saved.speak || []);
    const [write, setWrite] = useState(saved.write || []);
    const [read, setRead] = useState(saved.read || []);
    // An Advanced learner's start (2026-11-07): 'scratch' (the first lesson) or 'test' (the Advanced entry test).
    const [begin, setBegin] = useState(saved.begin ?? null);
    // Kept as they go, to come back to the same question.
    useEffect(() => {
        try { localStorage.setItem(startKey(), JSON.stringify({ step, at: STEPS[step], course, from, reason, level, speak, write, read, begin })); } catch { /* storage off */ }
    }, [step, course, from, reason, level, speak, write, read, begin]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const at = STEPS[Math.min(step, STEPS.length - 1)];
    // One cannot learn the language one speaks (English for English speakers is a course of its own).
    const clash = !!from && course !== 'en' && from === course;
    const answered = { welcome: true, learn: !!course, why: !!reason, translate: !!from && !clash, chart: true, speak: speak.length > 0, write: write.length > 0, read: read.length > 0, level: !!level, start: !!begin }[at];
    const english = course === 'en';
    const name = courses.find((c) => c.code === course)?.name || 'English';
    const toAdvanced = level === 'advanced';
    // A Beginner is done at their level; an Advanced learner then chooses where to start.
    const last = at === 'start' || (at === 'level' && !toAdvanced);
    const toTest = toAdvanced && begin === 'test';
    // The start screen in the language they know (Kannada for a Kannada speaker), the course named in it.
    const S = at === 'start' ? tr(from) : (t) => t;

    const finish = () => {
        setBusy(true); setError('');
        const saves = [linguisticApi.setAbout(reason, LEVELS.find((l) => l.level === level).know), linguisticApi.setKnows({ speak, write, read })];
        // Their language first (the course is checked against it — the course they had steps aside to English if it is the one they
        // speak); then the course at its starting level; then the plan in it, its days set by itself (it sets the daily goal to
        // match). Everyone starts at the first unit of the first section (2026-10-28).
        const start = 'beginner';
        const was = dash.course?.code || 'en';
        const steps = [];
        if (from !== dash.language?.code || !dash.languageChosen) {
            if (from === was && was !== 'en') steps.push(() => linguisticApi.setCourse('en'));
            steps.push(() => linguisticApi.setLanguage(from));
        }
        if (course !== was || !english) steps.push(() => linguisticApi.setCourse(course, english ? null : start));
        steps.push(() => linguisticApi.setPlan());
        saves.push(steps.reduce((p, f) => p.then(f), Promise.resolve()));
        // One who says Advanced takes the Advanced entry test now (2026-10-31: "when the user goes directly to the advanced
        // level, show the beginning test; without it, no Advanced"): passed, Advanced opens, and their roadmap becomes 60 days
        // of it; not taken or not passed, they start at Beginner like everyone, on the 90 days.
        Promise.all(saves)
            // "Find my level" starts them at Beginner first, so leaving the test half-way never brings these questions back.
            .then(() => (!english ? null : linguisticApi.chooseLevel(start)))
            // Advanced, from scratch (2026-11-07): the first lesson like a Beginner; finding their level: the test.
            .then(() => (toTest ? linguisticApi.jump('advanced').catch(() => null) : null))
            .then((jump) => { forgetStart(); if (jump?.lesson) navigate(`/linguistic/${jump.module}/${jump.lesson}`, { replace: true }); else onDone(); })
            .catch((e) => { setError(e.message); setBusy(false); });
    };
    const next = () => {
        if (!answered || busy) return;
        if (last) { finish(); return; }
        // The language they know best is one they speak, write and read: ticked to begin with, to change.
        if (at === 'chart' && from) { if (!speak.length) setSpeak([from]); if (!write.length) setWrite([from]); if (!read.length) setRead([from]); }
        setStep((s) => s + 1);
    };

    return (
        <SessionFrame label={`Start learning ${name}`}>
            <header className="mx-auto flex w-full max-w-[1000px] shrink-0 items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-4 sm:px-10 sm:pt-8">
                <button type="button" onClick={() => (step ? setStep((s) => s - 1) : navigate('/'))} aria-label={step ? 'Back' : 'Leave'}
                    className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><ArrowLeft size={26} strokeWidth={3} /></button>
                <Bar value={((step + (answered ? 1 : 0)) / STEPS.length) * 100} className="h-4 flex-1" label="Getting started" />
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-onboarding={at}>
                <div className="lingo-in mx-auto w-full max-w-[600px] px-4 pb-8 pt-4 sm:pt-8" key={at}>
                    {at === 'welcome' && (
                        <Message pose="wave-hi" title="Welcome to Language Learning!" text="Learn a language in short lessons every day: words, speaking, listening, reading and writing. Answer a few questions, and we will make your roadmap." />
                    )}

                    {at === 'learn' && (
                        <>
                            <Ask pose="curious-question" title="Which language do you want to learn?" />
                            <SearchBox value={findCourse} onChange={setFindCourse} label="Search the languages to learn" />
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {courses.filter((c) => matches(findCourse, c.name, c.native)).map((c) => {
                                    const on = course === c.code;
                                    return (
                                        <button key={c.code} type="button" onClick={() => setCourse(c.code)} aria-pressed={on} data-course={c.code}
                                            className="lingo-tile flex min-h-[7.5rem] flex-col items-center justify-center gap-2 px-2 py-3 text-center" style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: on ? COLORS.blue.face : COLORS.green.face }} lang={c.code}>{c.code === 'en' ? 'En' : langOf(c.code).mark}</span>
                                            <span className="w-full truncate text-[15px] font-extrabold text-[#3c3c3c]">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}



                    {at === 'why' && (
                        <>
                            <Ask pose="thinking" title={`What is your main reason for learning ${name}?`} />
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

                    {at === 'translate' && (
                        <>
                            <Ask pose="thinking" title="Choose your translation language" text={`The language you know best: word meanings, translations and tips are shown in it.${clash ? ` You are learning ${name}, so choose another.` : ''}`} />
                            <SearchBox value={findLanguage} onChange={setFindLanguage} label="Search your languages" />
                            <div className="grid gap-2">
                                {known.filter((l) => matches(findLanguage, l.name, l.native)).map((l) => (
                                    <Choice key={l.code} on={from === l.code} onClick={() => setFrom(l.code)} disabled={course !== 'en' && l.code === course} attr={{ 'data-language': l.code }}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white" style={{ background: from === l.code ? COLORS.blue.face : '#AFAFAF' }} lang={l.code}>{langOf(l.code).mark}</span>
                                        <span className="min-w-0">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]" lang={l.code} dir="auto">{l.native}</span>
                                            <span className="block text-sm font-semibold text-[#777]">{l.name}{l.code === device ? ' · your device’s language' : ''}{course !== 'en' && l.code === course ? ' · the language you are learning' : ''}</span>
                                        </span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}



                    {at === 'chart' && (
                        <>
                            <Ask pose="star-celebrate" title="Reach your learning goals faster!" text="A little every day takes you further than a lot now and then." />
                            <GoalChart weeks={Math.ceil(BEGINNER_DAYS / 7)} />
                        </>
                    )}

                    {/* The languages they already know (2026-10-28): to speak, to write, to read — one or more of each. */}
                    {at === 'speak' && (
                        <>
                            <Ask pose="wave-hi" title="Which languages do you speak?" text="Choose every language you can speak." />
                            <KnowsPick languages={languages} picked={speak} onChange={setSpeak} kind="speak" />
                        </>
                    )}
                    {at === 'write' && (
                        <>
                            <Ask pose="presenting" title="Which languages can you write?" text="Choose every language you can write." />
                            <KnowsPick languages={languages} picked={write} onChange={setWrite} kind="write" />
                        </>
                    )}
                    {at === 'read' && (
                        <>
                            <Ask pose="curious-question" title="Which languages can you read?" text="Choose every language you can read." />
                            <KnowsPick languages={languages} picked={read} onChange={setRead} kind="read" />
                        </>
                    )}

                    {/* Last (2026-11-04): Beginner, or Advanced through its test. */}
                    {at === 'level' && (
                        <>
                            <Ask pose="presenting" title={`Are you a Beginner or an Advanced ${name} learner?`} text="We will fit your lessons and your roadmap to it." />
                            <div className="grid gap-2">
                                {LEVELS.map((l) => (
                                    <Choice key={l.level} on={level === l.level} onClick={() => setLevel(l.level)} attr={{ 'data-level': l.level }}>
                                        <Bars n={l.bars} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{l.label}</span>
                                            <span className="block text-sm font-semibold text-[#777]">{l.text(name)}</span>
                                        </span>
                                        <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-[#AFAFAF]" data-cefr>{l.cefr}</span>
                                    </Choice>
                                ))}
                            </div>
                            {/* Advanced only through its test (2026-10-31). */}
                            {toAdvanced && (
                                <p className="mt-3 rounded-2xl border-2 px-4 py-3 text-[15px] font-semibold text-[#4b4b4b]" style={{ borderColor: COLORS.purple.light, background: '#FBF7FF' }} role="status" data-advanced-test-note>
                                    To start at Advanced, you first take the Advanced entry test: how much do you know? 20 questions, 10 on Beginner and 10 on Advanced. Get half of each right and Advanced opens. Below that, you start from Beginner. You have one try.
                                </p>
                            )}
                        </>
                    )}

                    {/* An Advanced learner's start (2026-11-07, as Duolingo asks it): from scratch, or find their level. */}
                    {at === 'start' && (
                        <>
                            <Ask pose="presenting" title={<span dir="auto" lang={from}>{S("Now, let's find the best place to start!")}</span>} />
                            <div className="grid gap-3" lang={from} dir="auto">
                                <Choice on={begin === 'scratch'} onClick={() => setBegin('scratch')} attr={{ 'data-begin': 'scratch' }}>
                                    <span className="relative flex h-16 w-12 shrink-0 items-center justify-center rounded-r-md rounded-l-sm text-2xl font-black" style={{ background: '#F8C94B', color: '#C47F17', boxShadow: 'inset -5px 0 0 #fff, inset -7px 0 0 #E5A72A' }} aria-hidden="true">
                                        <span className="absolute left-2 top-0 h-3 w-2.5 rounded-b-sm" style={{ background: COLORS.red.face }} />1
                                    </span>
                                    <span className="min-w-0 flex-1 py-2">
                                        <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{S('Start from scratch')}</span>
                                        <span className="block text-[15px] font-semibold text-[#777]">{trf(from)('Take the easiest lesson of the {0} course', nameIn(course, from) || name)}</span>
                                    </span>
                                </Choice>
                                <Choice on={begin === 'test'} onClick={() => setBegin('test')} attr={{ 'data-begin': 'test' }}>
                                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] bg-white" style={{ borderColor: COLORS.blue.face }} aria-hidden="true">
                                        <Compass size={30} strokeWidth={2.4} style={{ color: COLORS.red.face }} />
                                    </span>
                                    <span className="min-w-0 flex-1 py-2">
                                        <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{S('Find my level')}</span>
                                        <span className="block text-[15px] font-semibold text-[#777]">{S('Take a short test, and we will show you where to start')}</span>
                                    </span>
                                </Choice>
                            </div>
                        </>
                    )}

                </div>
            </main>

            {error && <p className="mx-auto w-full max-w-[1000px] shrink-0 px-4 pb-2 text-center text-[15px] font-bold sm:px-10" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
            <footer className="shrink-0 border-t-2 border-[#E5E5E5]">
                <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                    {!answered && <p className="hidden flex-1 text-[15px] font-bold text-[#AFAFAF] sm:block" data-choose-first>{S('Choose an answer to continue.')}</p>}
                    <span className={answered ? 'hidden flex-1 sm:block' : 'hidden'} />
                    <Chunky color="green" onClick={next} disabled={!answered || busy} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>
                        {busy ? S('Saving…') : at === 'welcome' ? 'Get started' : last ? S(toTest ? 'Start the test' : 'Start learning') : 'Continue'}
                    </Chunky>
                </div>
            </footer>
        </SessionFrame>
    );
}
