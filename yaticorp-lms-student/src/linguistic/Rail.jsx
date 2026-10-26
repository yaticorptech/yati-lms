/**
 * Linguistic Ability — the panels beside the path (under it, on a phone's
 * Practice tab): the student's level, streak and XP; today's quests; the
 * mistakes waiting; the placement test; and the timeline.
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Flame, Zap, Gift, BookOpen, Target, ListChecks, Compass, ChevronRight, ChevronDown, CalendarDays, Check, Loader2 } from 'lucide-react';
import { COLORS, langOf, levelOf } from './meta';
import { Bar, Panel, Mascot } from './ui';
import { planLabel, planStatus } from './parts/plan';

const LESSON_GOAL = 2;

/**
 * The course and the student's language (to change either), level, streak and
 * XP, in a row. The chip shows the student's language while they learn
 * English, as it always has; on another course, that course's language.
 * `compact` (the side panel, 340px) shows the chip's letter without its name.
 */
export function Stats({ dash, onLanguage, compact = false, className = '' }) {
    const streak = dash.streak?.current || 0;
    const lang = dash.language || { code: 'kn', native: 'ಕನ್ನಡ', name: 'Kannada' };
    const course = dash.course || { code: 'en', name: 'English', native: 'English' };
    const shown = course.code === 'en' ? lang : course;
    const pad = compact ? 'px-1' : 'px-1 sm:px-2.5';
    return (
        <div className={`flex items-center justify-between gap-1 ${className}`} data-lingo-stats>
            {onLanguage && (
                <button type="button" onClick={onLanguage} aria-label={`Learning ${course.name}, from ${lang.name}. Change`} title={course.code === 'en' ? 'Your language' : `Learning ${course.name}`}
                    data-language-chip={lang.code} data-course-chip={course.code}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl px-1.5 text-[15px] font-extrabold text-[#777] hover:bg-[#F2F2F2]">
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg border-2 px-1 text-xs font-black" lang={shown.code}
                        style={course.code === 'en' ? { borderColor: '#E5E5E5', background: '#fff', color: '#4b4b4b' } : { borderColor: COLORS.green.edge, background: COLORS.green.face, color: '#fff' }}>{langOf(shown.code).mark}</span>
                    {!compact && <span className="hidden sm:inline" lang={shown.code}>{shown.native}</span>}
                    <ChevronDown size={16} strokeWidth={3} />
                </button>
            )}
            <span className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl text-[15px] font-extrabold ${pad}`} style={{ color: COLORS.blue.ink }} title="Your level">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: COLORS.blue.face }}>{levelOf(dash.level).label[0]}</span>
                {levelOf(dash.level).label}
            </span>
            <span className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl text-[15px] font-extrabold tabular-nums ${pad}`} style={{ color: streak ? COLORS.orange.face : '#AFAFAF' }} title={`Day streak · best ${dash.streak?.longest || 0}`} data-streak={streak}>
                <Flame size={22} fill="currentColor" strokeWidth={1.5} /> {streak}
            </span>
            <span className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl text-[15px] font-extrabold tabular-nums ${pad}`} style={{ color: COLORS.gold.ink }} title="XP earned in English" data-xp={dash.points}>
                <Zap size={22} fill={COLORS.gold.face} stroke={COLORS.gold.edge} strokeWidth={1.5} /> {dash.points}
            </span>
        </div>
    );
}

function Quest({ icon: Icon, color, title, value, goal, to }) {
    const done = value >= goal;
    const body = (
        <>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: COLORS[color].light, color: COLORS[color].ink }}><Icon size={22} strokeWidth={2.5} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold text-[#4b4b4b]">{title}</span>
                <span className="mt-1.5 flex items-center gap-2">
                    <span className="relative flex-1">
                        <Bar value={(Math.min(value, goal) / goal) * 100} color="gold" className="h-5" label={`${title}: ${Math.min(value, goal)} of ${goal}`} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold tabular-nums text-[#777]">{Math.min(value, goal)} / {goal}</span>
                    </span>
                    <Gift size={26} className="shrink-0" style={{ color: done ? COLORS.gold.face : '#E5E5E5' }} fill={done ? COLORS.gold.light : 'none'} aria-label={done ? 'Done' : undefined} />
                </span>
            </span>
        </>
    );
    return to && !done
        ? <Link to={to} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#F7F7F7]" data-quest={title}>{body}</Link>
        : <div className="flex items-center gap-3 py-1.5" data-quest={title} data-done={done}>{body}</div>;
}

/** Today's quests: XP, lessons, and the daily challenge. */
export function Quests({ dash }) {
    return (
        <Panel className="p-5" data-quests>
            <h2 className="mb-3 text-xl font-extrabold text-[#3c3c3c]">Daily quests</h2>
            <div className="space-y-2">
                <Quest icon={Zap} color="gold" title={`Earn ${dash.dailyGoal || 30} XP`} value={dash.today?.xp || 0} goal={dash.dailyGoal || 30} />
                <Quest icon={BookOpen} color="green" title={`Complete ${LESSON_GOAL} lessons`} value={dash.today?.lessons || 0} goal={LESSON_GOAL} />
                <Quest icon={Target} color="blue" title="Do the daily challenge" value={dash.daily?.done ? 1 : 0} goal={1} to="/linguistic/daily" />
            </div>
        </Panel>
    );
}

const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
const lessonsADay = (n) => (n >= 1 ? `about ${n} lesson${n === 1 ? '' : 's'} a day` : 'a lesson every other day');

/**
 * The timeline (asked 2026-10-24: "in how many days they learn the
 * language"): the days to finish the course at the student's daily goal, the
 * days to finish each level one after another, the days at the pace they
 * really keep, and a faster goal to pick (`onGoal(xp)`). Days only, never a
 * date (asked the same day).
 */
export function Timeline({ dash, onGoal }) {
    const [busy, setBusy] = useState(0);
    const t = dash.timeline;
    // With a learning plan (2026-10-24), its day and today's lessons instead.
    if (dash.plan) return <PlanCard dash={dash} />;
    if (!t) return null;
    const course = dash.course?.name || 'English';
    if (!t.remaining) {
        return (
            <Panel className="flex items-center gap-4 p-5" data-timeline="done">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: COLORS.green.light, color: COLORS.green.ink }}><Check size={24} strokeWidth={3} /></span>
                <p className="text-[17px] font-extrabold text-[#3c3c3c]">You have finished every level of {course}!</p>
            </Panel>
        );
    }
    const faster = t.goals.filter((g) => g.xp > t.goal && g.days < t.days);
    const pick = (xp) => { if (!onGoal || busy) return; setBusy(xp); Promise.resolve(onGoal(xp)).finally(() => setBusy(0)); };
    return (
        <Panel className="p-5" data-timeline={t.days}>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#3c3c3c]"><CalendarDays size={22} style={{ color: COLORS.purple.face }} /> Your timeline</h2>
            <p className="mt-2 text-[17px] font-bold text-[#4b4b4b]">
                Finish {course} in about <span className="font-extrabold" style={{ color: COLORS.purple.ink }} data-timeline-days>{days(t.days)}</span>.
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#777]">At your goal of {t.goal} XP a day: {lessonsADay(t.lessonsPerDay)}. {t.remaining} lesson{t.remaining === 1 ? '' : 's'} to go.</p>
            <ol className="relative mt-4 space-y-3 border-l-2 border-[#E5E5E5] pl-5">
                {t.levels.map((l) => (
                    <li key={l.level} className="relative" data-timeline-level={l.level}>
                        <span className="absolute -left-[1.85rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white"
                            style={{ background: l.done || l.skipped ? COLORS.green.face : COLORS.purple.face }}>
                            {(l.done || l.skipped) && <Check size={12} strokeWidth={4} className="text-white" />}
                        </span>
                        <p className="text-[15px] font-extrabold text-[#3c3c3c]">{l.label}</p>
                        <p className="text-sm font-semibold text-[#777]">
                            {l.skipped ? 'Placed past it' : l.done ? 'Done' : `In about ${days(l.days)} · ${l.left} lesson${l.left === 1 ? '' : 's'} left`}
                        </p>
                    </li>
                ))}
            </ol>
            {t.pace && (
                <p className="mt-4 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: COLORS.blue.light, color: COLORS.blue.ink }} data-timeline-pace>
                    At the pace you keep ({lessonsADay(t.pace.lessonsPerDay)}): about {days(t.pace.days)}.
                </p>
            )}
            <Link to="/linguistic/roadmap" className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-extrabold" style={{ background: COLORS.purple.light, color: COLORS.purple.ink }} data-make-plan>
                <CalendarDays size={18} /> <span className="flex-1">Short on time? Make a plan that fits</span> <ChevronRight size={18} />
            </Link>
            {onGoal && faster.length > 0 && (
                <div className="mt-4">
                    <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Want it sooner? Raise your daily goal</p>
                    <div className="flex flex-wrap gap-2">
                        {faster.map((g) => (
                            <button key={g.xp} type="button" onClick={() => pick(g.xp)} disabled={!!busy} data-timeline-goal={g.xp}
                                className="lingo-tile inline-flex min-h-10 items-center gap-1.5 px-3 text-sm text-[#4b4b4b]">
                                {busy === g.xp ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill={COLORS.gold.face} stroke={COLORS.gold.edge} />} {g.xp} XP · {days(g.days)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Panel>
    );
}

/**
 * The learning plan beside the path (asked 2026-10-24): which day of it this
 * is, whether the student is on track, and today's lessons, each one tap
 * away; the whole roadmap a link further.
 */
export function PlanCard({ dash }) {
    const p = dash.plan;
    const status = planStatus(p);
    const today = p.today?.lessons || [];
    const left = today.filter((l) => l.status !== 'completed');
    return (
        <Panel className="p-5" data-plan-card={p.day}>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#3c3c3c]"><CalendarDays size={22} style={{ color: COLORS.purple.face }} /> Your roadmap</h2>
            <p className="mt-1 text-sm font-bold text-[#777]">Day {Math.min(p.day, p.days)} of {p.days} · {planLabel(p.days)} plan · {p.done}/{p.total} lessons</p>
            <Bar value={p.total ? (p.done / p.total) * 100 : 0} className="mt-2 h-3" label={`${p.done} of ${p.total} lessons done`} />
            <p className="mt-3 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: COLORS[status.tone].light, color: COLORS[status.tone].ink }}>{status.text}</p>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{left.length ? `Today: ${left.length} lesson${left.length === 1 ? '' : 's'} to do` : 'Today’s lessons are done!'}</p>
            <ul className="mt-1.5 space-y-1">
                {today.map((l) => {
                    const done = l.status === 'completed';
                    const row = (
                        <>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: done ? COLORS.green.face : COLORS.blue.light }}>{done && <Check size={14} strokeWidth={4} className="text-white" />}</span>
                            <span className={`min-w-0 flex-1 truncate text-[15px] font-bold ${done ? 'text-[#AFAFAF] line-through' : 'text-[#4b4b4b]'}`}>{l.title}</span>
                        </>
                    );
                    return <li key={l.id}>{!done && l.open ? <Link to={`/linguistic/${l.module}/${l.id}`} className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-[#F7F7F7]" data-plan-today={l.id}>{row}<ChevronRight size={16} className="shrink-0 text-[#AFAFAF]" /></Link> : <span className="flex items-center gap-2.5 py-1" data-plan-today={l.id}>{row}</span>}</li>;
                })}
            </ul>
            <Link to="/linguistic/roadmap" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }} data-see-roadmap>See my roadmap <ChevronRight size={16} /></Link>
        </Panel>
    );
}

export function MistakesCard({ dash }) {
    return (
        <Panel className="flex items-center gap-4 p-5" data-mistakes={dash.mistakes}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: COLORS.red.light, color: COLORS.red.ink }}><ListChecks size={24} strokeWidth={2.5} /></span>
            <div className="min-w-0 flex-1">
                <p className="text-[17px] font-extrabold text-[#3c3c3c]">{dash.mistakes ? `${dash.mistakes} mistake${dash.mistakes === 1 ? '' : 's'} to fix` : 'No mistakes to fix'}</p>
                <p className="text-sm font-semibold text-[#777]">{dash.mistakes ? 'Practise them until you get them right.' : 'Wrong answers come here to practise.'}</p>
            </div>
            {dash.mistakes > 0 && <Link to="/linguistic/review" className="lingo-btn inline-flex h-11 shrink-0 items-center px-4 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.ink }}>Fix</Link>}
        </Panel>
    );
}

export function LevelCard({ dash }) {
    // Another language's course has no placement test: where it began, and what it teaches.
    if (dash.course && dash.course.code !== 'en') {
        return (
            <Panel className="flex items-center gap-4 p-5" data-course-card={dash.course.code}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white" style={{ background: COLORS.green.face }} lang={dash.course.code}>{langOf(dash.course.code).mark}</span>
                <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-extrabold text-[#3c3c3c]">{dash.course.name} course</p>
                    <p className="text-sm font-semibold text-[#777]">Words and sentences, Beginner to Advanced, taught in {dash.language?.name || 'Kannada'}.</p>
                </div>
            </Panel>
        );
    }
    if (!dash.placement) {
        return (
            <Link to="/linguistic/placement" className="lingo-btn flex items-center gap-3 !rounded-2xl p-4 !normal-case !tracking-normal" style={{ background: COLORS.blue.face, borderColor: COLORS.blue.edge, color: '#fff' }} data-placement-cta>
                <Mascot pose="curious-question" className="h-16 w-16 shrink-0" />
                <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[17px] font-extrabold">Find your level</span>
                    <span className="block text-sm font-semibold text-white/90">A 15-question test, about 5 minutes. Start where you belong.</span>
                </span>
                <ChevronRight size={22} className="shrink-0" />
            </Link>
        );
    }
    return (
        <Panel className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: COLORS.blue.light, color: COLORS.blue.ink }}><Compass size={24} strokeWidth={2.5} /></span>
            <div className="min-w-0 flex-1">
                <p className="text-[17px] font-extrabold text-[#3c3c3c]">{dash.placement.chosen ? 'You chose' : 'Placed at'} {levelOf(dash.placement.level).label}</p>
                <p className="text-sm font-semibold text-[#777]">{dash.placement.chosen ? 'Not sure? The placement test finds your level.' : `${dash.placement.score}/${dash.placement.total} on the placement test`}</p>
            </div>
            <Link to="/linguistic/placement" className="shrink-0 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }}>{dash.placement.chosen ? 'Take it' : 'Retake'}</Link>
        </Panel>
    );
}
