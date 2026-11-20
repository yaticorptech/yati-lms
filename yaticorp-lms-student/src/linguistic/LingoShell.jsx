/**
 * Linguistic Ability — the section around its tabs (redesigned 2026-10-22 to
 * work like Duolingo): Learn (the path), Practice, Badges and Writing, with
 * the student's level, streak and XP, and — on a wide screen — today's quests
 * and the mistakes waiting beside the page. The dashboard is loaded here once
 * and handed to the tabs.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, deviceLanguage, languageAsked, markLanguageAsked } from './meta';
import { Loading, Problem } from './ui';
import LanguagePicker from './LanguagePicker';
import Onboarding from './Onboarding';
import PlanQuestion from './PlanQuestion';
import { Stats } from './Rail';
import useGoBack from '../hooks/useGoBack';
import './lingo.css';



export default function LingoShell() {
    const [dash, setDash] = useState(undefined);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(null);       // 'learn' (the course) | 'speak' (their language) | null
    // The dashboard takes the whole width, like the profile dashboard (2026-10-26). The tabs are its own (none
    // lit: it is not one of them), in its top row with the language, level, streak and XP (2026-10-27); a page
    // they open has only its ✕ back to the dashboard (2026-10-27, "remove the nav bar from this page"). The side
    // panel that stood beside every tab (level, roadmap, quests, mistakes) is on the dashboard only (2026-10-26).
    const { pathname } = useLocation();
    const wide = pathname === '/linguistic/dashboard';
    // The learning path's Back goes to the dashboard (2026-10-31): the page before it is often a lesson just ended.
    const onPath = pathname.replace(/\/$/, '') === '/linguistic';
    // Back: the page before (the browser's history); opened straight here, the dashboard.
    const goBack = useGoBack();
    const load = useCallback(() => linguisticApi.dashboard().then((d) => {
        setDash(d); setError(null);
        // A device set to Hindi, Japanese, French or Korean is offered that language, once.
        const offered = deviceLanguage((d.languages || []).filter((l) => !l.locked).map((l) => l.code));
        // (Not before the start screens, which ask it themselves.)
        if (d.started && !d.languageChosen && offered && offered !== 'kn' && !languageAsked()) setPicking('speak');
    }).catch((e) => { setError(e); setDash((cur) => cur || null); }), []);
    useEffect(() => { load(); }, [load]);
    const closePicker = useCallback(() => { markLanguageAsked(); setPicking(null); }, []);

    // No more "tap the empty page to go back" (2026-11-19, the user: "when click on empty place it taking me to back"): only Back leaves.

    if (dash === undefined) return <Loading label="Opening your lessons…" />;
    if (!dash) return <Problem error={error} onRetry={load} />;
    // No level yet: the start screens first (the placement test, or a level chosen), Duolingo-style.
    if (!dash.started) return <Onboarding dash={dash} onDone={load} />;
    // Started, but no learning plan in this course yet (2026-10-26): it is made, its days set by itself (2026-11-04), before the path.
    if (!dash.plan) return <PlanQuestion dash={dash} onDone={load} />;

    return (
        // Every page of the section is full width (2026-10-26, "make it full screen"), as the dashboard is.
        <div className="lingo flex items-start pb-6" data-lingo-shell data-wide={wide || undefined}>
            <div className="w-full min-w-0 flex-1">
                {/* On the dashboard: the language, level, streak and XP, on the right (its ✕ went 2026-10-29: the
                    sidebar's menu leaves the section). A page inside: its ✕, back to the dashboard. */}
                <div className={`flex items-center gap-2 ${wide ? 'mb-5 justify-center sm:justify-end' : '-mt-4 mb-0.5 sidebar:-mt-8'}`}>
                    {!wide && (
                        <Link to="/linguistic/dashboard" onClick={onPath ? undefined : goBack} data-lingo-close="dashboard" aria-label="Back" title="Back"
                            className="-ml-1 inline-flex min-h-9 items-center gap-1.5 px-1 text-[15px] font-extrabold text-[#1F2A44] transition-opacity hover:opacity-70">
                            <ArrowLeft size={20} strokeWidth={2.8} aria-hidden="true" /> Back
                        </Link>
                    )}
                    {/* The language, level, streak and XP: on the dashboard only (2026-10-26, "not inside"). */}
                    {wide && <Stats dash={dash} onLanguage={() => setPicking('learn')} className="min-w-0 sm:gap-3" />}
                    {/* The tabs went (2026-10-29): the dashboard's four doors — Learn, Practice, Badges, Writing — open those pages. */}
                </div>
                {/* A new language or course redraws a page inside (its lessons are another course's). The dashboard
                    stays as it is (2026-10-29): it is drawn from `dash`, so only what changed changes, no reload. */}
                <Outlet key={wide ? 'dashboard' : `${dash.language?.code || 'kn'}:${dash.course?.code || 'en'}`} context={{ dash, reload: load }} />
            </div>
            {picking && (
                <LanguagePicker languages={dash.languages || []} courses={dash.courses || []} current={dash.language?.code || 'kn'} course={dash.course} mode={picking} locked={!!dash.started && !dash.courseDone && !dash.freeCourse} finished={!!dash.started && !!dash.courseDone}
                    suggested={deviceLanguage((dash.languages || []).filter((l) => !l.locked).map((l) => l.code))} onClose={closePicker} onDone={() => { closePicker(); load(); }} />
            )}
        </div>
    );
}
