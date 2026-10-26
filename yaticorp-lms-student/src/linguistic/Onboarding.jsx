/**
 * Linguistic Ability — starting out, the way language apps ask it (asked
 * 2026-10-23; Duolingo, Babbel and Busuu's questions 2026-10-26; and
 * Talkpal's, the same day: "first get them started, then ask these"). A
 * welcome to Get started; the language to learn (searched in a grid) and
 * their level; what they want to achieve; "Let's get you started"; their
 * reason, learning style, what they want to get better at, the topics they
 * like; their age; the language they know — translations and tips are in it
 * (searched in a list); the minutes a day they mean to practise and when;
 * how much time they have — the roadmap is made to fit it (Roadmap.jsx) —
 * and where that takes them; then where to start: from scratch, or finding
 * their level with the placement test (or, for one who knows some, straight
 * at the level they said; another language's course has no placement test).
 * The two languages can be changed later in the dropdowns by the level
 * (LanguagePicker.jsx). Each question needs an answer: CONTINUE stays grey
 * until one is tapped. Shown in place of the section until the student has a
 * level in their course.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Compass, Sprout, GraduationCap, Briefcase, Users, Plane, Smile, Brain, ChevronRight, Mic, Headphones, BookOpen, PenLine, Puzzle, Languages, Home, HeartPulse, Wallet, Cpu, Film, Sunrise, Sun, Sunset, Moon, Search, Star, HelpCircle, Shuffle, FlaskConical, Globe, Sparkles } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, levelOf, langOf, deviceLanguage } from './meta';
import { Bar, Chunky, Mascot } from './ui';
import { SessionFrame } from './session/Session';
import PlanChoices from './parts/PlanChoices';

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
const AIMS = [
    { id: 'basics', label: 'I want to learn the basics', icon: BookOpen }, { id: 'speaking', label: 'I want to improve my speaking', icon: Mic },
    { id: 'fluent', label: 'I want to become fluent', icon: Star }, { id: 'unsure', label: 'I\'m not sure yet', icon: HelpCircle }
];
const STYLES = [
    { id: 'speaking', label: 'I like speaking', icon: Mic }, { id: 'reading', label: 'I learn better through reading', icon: BookOpen },
    { id: 'listening', label: 'I learn better by listening', icon: Headphones }, { id: 'none', label: 'I don\'t have a specific style', icon: Shuffle }
];
const AGES = [{ id: 'under18', label: 'Under 18' }, { id: '18-24', label: '18–24' }, { id: '25-34', label: '25–34' }, { id: '35-44', label: '35–44' }, { id: '45-54', label: '45–54' }, { id: '55+', label: '55+' }];
const PRACTICE = [{ min: 5, label: '5 minutes a day' }, { min: 15, label: '15 minutes a day' }, { min: 30, label: '30 minutes a day' }, { min: 60, label: '60 minutes a day' }, { min: 0, label: 'Other' }];
// What they want to get better at, the topics they like, and when they like to learn (more than one may be chosen of the first two).
const FOCUS = [
    { id: 'speaking', label: 'Speaking', icon: Mic }, { id: 'listening', label: 'Listening', icon: Headphones },
    { id: 'reading', label: 'Reading', icon: BookOpen }, { id: 'writing', label: 'Writing', icon: PenLine },
    { id: 'grammar', label: 'Grammar', icon: Puzzle }, { id: 'vocabulary', label: 'Vocabulary', icon: Languages }
];
const TOPICS = [
    { id: 'daily', label: 'Daily life', icon: Home }, { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'work', label: 'Work and career', icon: Briefcase }, { id: 'studies', label: 'Studies and exams', icon: GraduationCap },
    { id: 'health', label: 'Health', icon: HeartPulse }, { id: 'money', label: 'Money', icon: Wallet },
    { id: 'technology', label: 'Technology', icon: Cpu }, { id: 'culture', label: 'Films and culture', icon: Film }
];
const WHEN = [
    { id: 'morning', label: 'Morning', hint: 'Before college or work', icon: Sunrise }, { id: 'afternoon', label: 'Afternoon', hint: 'In a break in the day', icon: Sun },
    { id: 'evening', label: 'Evening', hint: 'After college or work', icon: Sunset }, { id: 'night', label: 'Night', hint: 'Before going to sleep', icon: Moon }
];
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
    const [aim, setAim] = useState(saved.aim ?? null);
    const [style, setStyle] = useState(saved.style ?? null);
    const [age, setAge] = useState(saved.age ?? null);
    const [practice, setPractice] = useState(saved.practice ?? null);
    const [step, setStep] = useState(saved.step || 0);
    const [reason, setReason] = useState(saved.reason ?? null);
    const [know, setKnow] = useState(saved.know ?? null);
    const [focus, setFocus] = useState(saved.focus || []);
    const [topics, setTopics] = useState(saved.topics || []);
    const [when, setWhen] = useState(saved.when ?? null);
    const [days, setDays] = useState(saved.days ?? null);
    const [options, setOptions] = useState(null);
    const [start, setStart] = useState(saved.start ?? null);       // 'scratch' | 'find' | 'level'
    // Kept as they go, to come back to the same question.
    useEffect(() => {
        try { localStorage.setItem(startKey(), JSON.stringify({ step, course, from, reason, know, focus, topics, when, aim, style, age, practice, days, start })); } catch { /* storage off */ }
    }, [step, course, from, reason, know, focus, topics, when, aim, style, age, practice, days, start]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const STEPS = ['welcome', 'learn', 'know', 'aim', 'started', 'why', 'style', 'focus', 'topics', 'age', 'translate', 'practice', 'when', 'time', 'chart', 'start'];
    const at = STEPS[Math.min(step, STEPS.length - 1)];
    // One cannot learn the language one speaks (English for English speakers is a course of its own).
    const clash = !!from && course !== 'en' && from === course;
    const answered = {
        welcome: true, learn: !!course, know: know !== null, aim: !!aim, started: true, why: !!reason, style: !!style, focus: focus.length > 0, topics: topics.length > 0,
        age: !!age, translate: !!from && !clash, practice: practice !== null, when: !!when, time: !!days, chart: true, start: !!start
    }[at];
    const last = step === STEPS.length - 1;
    const said = KNOW.find((k) => k.know === know);
    const english = course === 'en';
    const name = courses.find((c) => c.code === course)?.name || 'English';
    // The plan that matches the minutes a day they said: the shortest that asks no more of them; the longest if every one does.
    const byDays = [...(options || [])].sort((x, y) => x.days - y.days);
    const recommend = practice ? (byDays.find((o) => o.minutes <= practice) || byDays[byDays.length - 1])?.days : null;
    const toggle = (set) => (id) => set((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
    // The times to choose, for the course, language and level they have said (the level the test finds may change the roadmap).
    const forLevel = KNOW.find((k) => k.know === know)?.level || 'beginner';
    useEffect(() => {
        if (at !== 'time') return undefined;
        let live = true;
        linguisticApi.planOptions(course, from, forLevel).then((r) => { if (live) setOptions(r.options); }).catch((e) => { if (live) setError(e.message); });
        return () => { live = false; };
    }, [at, course, from, forLevel]);

    const finish = () => {
        setBusy(true); setError('');
        const saves = [linguisticApi.setAbout(reason, know, { focus, topics, studyTime: when, aim, style, ageBand: age, practiceMinutes: practice })];
        // Their language first (the course is checked against it — the course they had steps aside to English if it is the one they
        // speak); then the course at its starting level; then the plan in it (it sets the daily goal to match).
        const level = start === 'level' ? said.level : 'beginner';
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
            .then(() => { forgetStart(); if (english && start === 'find') navigate('/linguistic/placement'); else onDone(); })
            .catch((e) => { setError(e.message); setBusy(false); });
    };
    const next = () => { if (!answered || busy) return; if (last) finish(); else setStep((s) => s + 1); };

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
                                        <button key={c.code} type="button" onClick={() => { setCourse(c.code); setStart(null); setDays(null); }} aria-pressed={on} data-course={c.code}
                                            className="lingo-tile flex min-h-[7.5rem] flex-col items-center justify-center gap-2 px-2 py-3 text-center" style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: on ? COLORS.blue.face : COLORS.green.face }} lang={c.code}>{c.code === 'en' ? 'En' : langOf(c.code).mark}</span>
                                            <span className="w-full truncate text-[15px] font-extrabold text-[#3c3c3c]">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {at === 'aim' && (
                        <>
                            <Ask pose="presenting" title="What are you looking to achieve?" />
                            <div className="grid gap-2">
                                {AIMS.map(({ id, label, icon: Icon }) => (
                                    <Choice key={id} on={aim === id} onClick={() => setAim(id)} attr={{ 'data-aim': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.gold.edge }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'started' && (
                        <Message pose="star-celebrate" title="Great! Let's get you started!" text={`Language Learning covers everything from your first ${name} words to speaking with confidence: new words, grammar, stories, conversations, listening and translation.`} />
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
                                    <Choice key={k.know} on={know === k.know} onClick={() => { setKnow(k.know); setStart(null); }} attr={{ 'data-know': k.know }}>
                                        <Bars n={k.bars} />
                                        <span className="min-w-0 flex-1 text-[17px] font-extrabold text-[#3c3c3c]">{k.know === 0 ? `${k.label} ${name}` : k.label}</span>
                                        <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-[#AFAFAF]" data-cefr>{k.cefr}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'style' && (
                        <>
                            <Ask pose="curious-question" title="What's your learning style?" />
                            <div className="grid gap-2">
                                {STYLES.map(({ id, label, icon: Icon }) => (
                                    <Choice key={id} on={style === id} onClick={() => setStyle(id)} attr={{ 'data-style': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.blue.face }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'focus' && (
                        <>
                            <Ask pose="presenting" title="What do you want to get better at?" text="Choose one or more. Your lessons have all of them; this is what you want most." />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {FOCUS.map(({ id, label, icon: Icon }) => (
                                    <Choice key={id} on={focus.includes(id)} onClick={() => toggle(setFocus)(id)} attr={{ 'data-focus': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.blue.face }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'topics' && (
                        <>
                            <Ask pose="curious-question" title="Which topics interest you?" text="Choose one or more." />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {TOPICS.map(({ id, label, icon: Icon }) => (
                                    <Choice key={id} on={topics.includes(id)} onClick={() => toggle(setTopics)(id)} attr={{ 'data-topic': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.orange.face }} />
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'age' && (
                        <>
                            <Ask pose="wave-hi" title="How old are you?" />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {AGES.map(({ id, label }) => (
                                    <Choice key={id} on={age === id} onClick={() => setAge(id)} attr={{ 'data-age': id }}>
                                        <span className="text-[17px] font-extrabold tabular-nums text-[#3c3c3c]">{label}</span>
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

                    {at === 'practice' && (
                        <>
                            <Ask pose="flex-determined" title="How long do you want to practise each day?" text="We will suggest the roadmap that fits it." />
                            <div className="grid gap-2">
                                {PRACTICE.map(({ min, label }) => (
                                    <Choice key={min} on={practice === min} onClick={() => setPractice(min)} attr={{ 'data-practice': min }}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: COLORS.purple.face }}>{min || '…'}</span>
                                        <span className="text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'when' && (
                        <>
                            <Ask pose="wave-hi" title="When do you like to learn?" text="A time of day makes learning a habit." />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {WHEN.map(({ id, label, hint, icon: Icon }) => (
                                    <Choice key={id} on={when === id} onClick={() => setWhen(id)} attr={{ 'data-when': id }}>
                                        <Icon size={26} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.purple.face }} />
                                        <span className="min-w-0">
                                            <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{label}</span>
                                            <span className="block text-sm font-semibold text-[#777]">{hint}</span>
                                        </span>
                                    </Choice>
                                ))}
                            </div>
                        </>
                    )}

                    {at === 'time' && (
                        <>
                            <Ask pose="flex-determined" title={`How much time do you have to learn ${name}?`} text="Your roadmap is made to fit it: every lesson when there is time, the main ones when time is short. You can change it later." />
                            {options ? <PlanChoices options={options} picked={days} onPick={setDays} recommend={recommend} /> : <p className="py-6 text-center text-[15px] font-bold text-[#AFAFAF]" role="status">Working out your roadmap…</p>}
                        </>
                    )}

                    {at === 'chart' && (
                        <>
                            <Ask pose="star-celebrate" title="Reach your learning goals faster!" text="A little every day takes you further than a lot now and then." />
                            <GoalChart weeks={Math.max(1, Math.ceil((days || 42) / 7))} />
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
                        {busy ? 'Saving…' : at === 'welcome' ? 'Get started' : last && start === 'find' ? 'Start the test' : last && start ? 'Start learning' : 'Continue'}
                    </Chunky>
                </div>
            </footer>
        </SessionFrame>
    );
}
