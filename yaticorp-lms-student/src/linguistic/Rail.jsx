/**
 * Linguistic Ability — the panels beside the path (under it, on a phone's
 * Practice tab): the student's level, streak and XP; today's quests; the
 * mistakes waiting; and the placement test.
 */
import { Link } from 'react-router-dom';
import { Flame, Zap, Gift, BookOpen, Target, ListChecks, Compass, ChevronRight, ChevronDown } from 'lucide-react';
import { COLORS, langOf, levelOf } from './meta';
import { Bar, Panel, Mascot } from './ui';

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
