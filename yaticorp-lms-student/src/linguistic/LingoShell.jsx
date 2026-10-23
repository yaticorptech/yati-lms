/**
 * Linguistic Ability — the section around its tabs (redesigned 2026-10-22 to
 * work like Duolingo): Learn (the path), Practice, Badges and Writing, with
 * the student's level, streak and XP, and — on a wide screen — today's quests
 * and the mistakes waiting beside the page. The dashboard is loaded here once
 * and handed to the tabs.
 */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Route as PathIcon, Dumbbell, Medal, PenLine } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, deviceLanguage, languageAsked, markLanguageAsked } from './meta';
import { Loading, Problem } from './ui';
import { Stats, Quests, MistakesCard, LevelCard } from './Rail';
import LanguagePicker from './LanguagePicker';
import Onboarding from './Onboarding';
import './lingo.css';

const TABS = [
    { to: '/linguistic', end: true, label: 'Learn', icon: PathIcon },
    { to: '/linguistic/practice', label: 'Practice', icon: Dumbbell },
    { to: '/linguistic/badges', label: 'Badges', icon: Medal },
    { to: '/linguistic/writing', label: 'Writing', icon: PenLine }
];

export default function LingoShell() {
    const [dash, setDash] = useState(undefined);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(null);       // 'learn' (the course) | 'speak' (their language) | null
    const load = useCallback(() => linguisticApi.dashboard().then((d) => {
        setDash(d); setError(null);
        // A device set to Hindi, Japanese, French or Korean is offered that language, once.
        const offered = deviceLanguage((d.languages || []).map((l) => l.code));
        // (Not before the start screens, which ask it themselves.)
        if (d.started && !d.languageChosen && offered && offered !== 'kn' && !languageAsked()) setPicking('speak');
    }).catch((e) => { setError(e); setDash((cur) => cur || null); }), []);
    useEffect(() => { load(); }, [load]);
    const closePicker = useCallback(() => { markLanguageAsked(); setPicking(null); }, []);

    if (dash === undefined) return <Loading label="Opening your lessons…" />;
    if (!dash) return <Problem error={error} onRetry={load} />;
    // No level yet: the start screens first (the placement test, or a level chosen), Duolingo-style.
    if (!dash.started) return <Onboarding dash={dash} onDone={load} />;

    return (
        <div className="lingo mx-auto flex max-w-[1100px] items-start gap-10 pb-6" data-lingo-shell>
            <div className="mx-auto w-full min-w-0 max-w-[640px] flex-1">
                <div className="mb-5 space-y-3">
                    <Stats dash={dash} onLanguage={() => setPicking('learn')} className="xl:hidden" />
                    <nav aria-label="Linguistic Ability" className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {TABS.map(({ to, end, label, icon: Icon }) => (
                            <NavLink key={to} to={to} end={end} data-tab={label}
                                className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-[11px] font-extrabold uppercase tracking-wide transition-colors sm:flex-row sm:gap-2 sm:text-[13px] ${isActive ? '' : 'border-transparent text-[#777] hover:bg-[#F2F2F2]'}`}
                                style={({ isActive }) => (isActive ? { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink } : undefined)}>
                                <Icon size={20} strokeWidth={2.5} /> {label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                {/* A new language or course redraws the tab, in it. */}
                <Outlet key={`${dash.language?.code || 'kn'}:${dash.course?.code || 'en'}`} context={{ dash, reload: load }} />
            </div>
            <aside className="sticky top-20 hidden w-[340px] shrink-0 space-y-5 xl:block" aria-label="Your progress">
                <Stats dash={dash} onLanguage={() => setPicking('learn')} compact />
                <LevelCard dash={dash} />
                <Quests dash={dash} />
                <MistakesCard dash={dash} />
            </aside>
            {picking && (
                <LanguagePicker languages={dash.languages || []} courses={dash.courses || []} current={dash.language?.code || 'kn'} course={dash.course} mode={picking}
                    suggested={deviceLanguage((dash.languages || []).map((l) => l.code))} onClose={closePicker} onDone={() => { closePicker(); load(); }} />
            )}
        </div>
    );
}
