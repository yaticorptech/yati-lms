/**
 * Linguistic Ability — starting out, the way language apps ask it (asked
 * 2026-10-23; Duolingo, Babbel and Busuu's questions 2026-10-26; and
 * Talkpal's, the same day: "first get them started, then ask these"). A
 * welcome to Get started; the language to learn (searched in a grid) and
 * their level; their reason; the language they know — translations and tips
 * are in it (searched in a list); how much time they have — the roadmap is made to fit it (Roadmap.jsx) —
 * and where that takes them. Everyone starts at Section 1, Unit 1 (2026-10-28; before then: from scratch, or finding
 * their level with the placement test (or, for one who knows some, straight
 * at the level they said).
 * The two languages can be changed later in the dropdowns by the level
 * (LanguagePicker.jsx). Each question needs an answer: CONTINUE stays grey
 * until one is tapped. Shown in place of the section until the student has a
 * level in their course.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, GraduationCap, Briefcase, Users, Plane, Smile, Brain, Search, FlaskConical, Globe, Sparkles } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, deviceLanguage } from './meta';
import { Bar, Chunky, Mascot } from './ui';
import { SessionFrame } from './session/Session';
import PlanChoices from './parts/PlanChoices';
import KnowsPick from './parts/KnowsPick';

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
// How much of the language they know, as Duolingo asks it, and the level each answer points to.
// `cefr`: the band each answer is, shown beside it (2026-10-26, as Talkpal shows A1 … C2).
const KNOW = [
    { know: 0, label: 'I am new to', bars: 0, level: 'beginner', cefr: 'A1' },
    { know: 1, label: 'I know some common words', bars: 1, level: 'beginner', cefr: 'A1–A2' },
    { know: 2, label: 'I can have basic conversations', bars: 2, level: 'intermediate', cefr: 'A2–B1' },
    { know: 3, label: 'I can talk about various topics', bars: 3, level: 'intermediate', cefr: 'B1–B2' },
    { know: 4, label: 'I can discuss most topics in detail', bars: 4, level: 'advanced', cefr: 'B2+' }
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
const STEPS = ['welcome', 'learn', 'know', 'why', 'translate', 'time', 'chart', 'speak', 'write', 'read'];
/** The screens before then: a place kept by its number in this list is read by its name. */
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
    const [know, setKnow] = useState(saved.know ?? null);
    const [days, setDays] = useState(saved.days ?? null);
    const [speak, setSpeak] = useState(saved.speak || []);
    const [write, setWrite] = useState(saved.write || []);
    const [read, setRead] = useState(saved.read || []);
    const [options, setOptions] = useState(null);
    // Kept as they go, to come back to the same question.
    useEffect(() => {
        try { localStorage.setItem(startKey(), JSON.stringify({ step, at: STEPS[step], course, from, reason, know, days, speak, write, read })); } catch { /* storage off */ }
    }, [step, course, from, reason, know, days, speak, write, read]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const at = STEPS[Math.min(step, STEPS.length - 1)];
    // One cannot learn the language one speaks (English for English speakers is a course of its own).
    const clash = !!from && course !== 'en' && from === course;
    const answered = { welcome: true, learn: !!course, know: know !== null, why: !!reason, translate: !!from && !clash, time: !!days, chart: true, speak: speak.length > 0, write: write.length > 0, read: read.length > 0 }[at];
    const last = step === STEPS.length - 1;
    const english = course === 'en';
    const name = courses.find((c) => c.code === course)?.name || 'English';
    // The times to choose: the roadmap from the first unit, where every student starts (2026-10-28).
    const forLevel = 'beginner';
    useEffect(() => {
        if (at !== 'time') return undefined;
        let live = true;
        linguisticApi.planOptions(course, from, forLevel).then((r) => { if (live) setOptions(r.options); }).catch((e) => { if (live) setError(e.message); });
        return () => { live = false; };
    }, [at, course, from, forLevel]);

    const finish = () => {
        setBusy(true); setError('');
        const saves = [linguisticApi.setAbout(reason, know), linguisticApi.setKnows({ speak, write, read })];
        // Their language first (the course is checked against it — the course they had steps aside to English if it is the one they
        // speak); then the course at its starting level; then the plan in it (it sets the daily goal to match).
        // Everyone starts at the first unit of the first section (2026-10-28).
        const level = 'beginner';
        const was = dash.course?.code || 'en';
        const steps = [];
        if (from !== dash.language?.code || !dash.languageChosen) {
            if (from === was && was !== 'en') steps.push(() => linguisticApi.setCourse('en'));
            steps.push(() => linguisticApi.setLanguage(from));
        }
        if (course !== was || !english) steps.push(() => linguisticApi.setCourse(course, english ? null : level));
        steps.push(() => linguisticApi.setPlan(days));
        saves.push(steps.reduce((p, f) => p.then(f), Promise.resolve()));
        Promise.all(saves)
            // "Find my level" starts them at Beginner first, so leaving the test half-way never brings these questions back.
            .then(() => (!english ? null : linguisticApi.chooseLevel(level)))
            .then(() => { forgetStart(); onDone(); })
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
                                        <button key={c.code} type="button" onClick={() => { setCourse(c.code); setDays(null); }} aria-pressed={on} data-course={c.code}
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

                    {at === 'know' && (
                        <>
                            <Ask pose="presenting" title={`What's your ${name} level?`} text="We will fit your lessons to your level." />
                            <div className="grid gap-2">
                                {KNOW.map((k) => (
                                    <Choice key={k.know} on={know === k.know} onClick={() => { setKnow(k.know); }} attr={{ 'data-know': k.know }}>
                                        <Bars n={k.bars} />
                                        <span className="min-w-0 flex-1 text-[17px] font-extrabold text-[#3c3c3c]">{k.know === 0 ? `${k.label} ${name}` : k.label}</span>
                                        <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-[#AFAFAF]" data-cefr>{k.cefr}</span>
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



                    {at === 'time' && (
                        <>
                            <Ask pose="flex-determined" title={`How much time do you have to learn ${name}?`} text="Your roadmap is made to fit it: every lesson when there is time, the main ones when time is short. You can change it later." />
                            {options ? <PlanChoices options={options} picked={days} onPick={setDays} /> : <p className="py-6 text-center text-[15px] font-bold text-[#AFAFAF]" role="status">Working out your roadmap…</p>}
                        </>
                    )}

                    {at === 'chart' && (
                        <>
                            <Ask pose="star-celebrate" title="Reach your learning goals faster!" text="A little every day takes you further than a lot now and then." />
                            <GoalChart weeks={Math.max(1, Math.ceil((days || 42) / 7))} />
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

                </div>
            </main>

            {error && <p className="mx-auto w-full max-w-[1000px] shrink-0 px-4 pb-2 text-center text-[15px] font-bold sm:px-10" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
            <footer className="shrink-0 border-t-2 border-[#E5E5E5]">
                <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                    {!answered && <p className="hidden flex-1 text-[15px] font-bold text-[#AFAFAF] sm:block" data-choose-first>Choose an answer to continue.</p>}
                    <span className={answered ? 'hidden flex-1 sm:block' : 'hidden'} />
                    <Chunky color="green" onClick={next} disabled={!answered || busy} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>
                        {busy ? 'Saving…' : at === 'welcome' ? 'Get started' : last ? 'Start learning' : 'Continue'}
                    </Chunky>
                </div>
            </footer>
        </SessionFrame>
    );
}
