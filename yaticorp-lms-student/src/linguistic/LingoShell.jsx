/**
 * Linguistic Ability — the section around its tabs (redesigned 2026-10-22 to
 * work like Duolingo): Learn (the path), Practice, Badges and Writing, with
 * the student's level, streak and XP, and — on a wide screen — today's quests
 * and the mistakes waiting beside the page. The dashboard is loaded here once
 * and handed to the tabs.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, deviceLanguage, languageAsked, markLanguageAsked } from './meta';
import { Loading, Problem } from './ui';
import { Stats } from './Rail';
import { ArtTile, LearnArt, PracticeArt, WritingArt, BadgesArt } from './parts/TabArt';
import LanguagePicker from './LanguagePicker';
import Onboarding from './Onboarding';
import PlanQuestion from './PlanQuestion';
import './lingo.css';

// The Dashboard (/linguistic/dashboard, 2026-10-26) is where the section opens, from the menu; it has no tab of its own.
// The tabs as a flow (2026-10-29, from a learning app's): learn, practise, write, then the badges earned — each a
// picture in a white tile with an orange edge, the tiles joined by an orange line, each named in a coloured pill.
const TABS = [
    { to: '/linguistic', end: true, label: 'Learn', art: LearnArt, pill: '#5B9BE6' },
    { to: '/linguistic/practice', label: 'Practice', art: PracticeArt, pill: '#F08A34' },
    { to: '/linguistic/writing', label: 'Writing', art: WritingArt, pill: '#7E4DBF' },
    { to: '/linguistic/badges', label: 'Badges', art: BadgesArt, pill: '#E8605E' }
];
const FLOW = '#F5A524';

/**
 * Whether a click landed on the empty page around the content, inside the layout's <main>: not on a button,
 * link, field, picture or text, nor in anything drawn as a card (a fill or an edge of its own).
 */
const onEmptyPage = (target) => {
    const main = target?.closest?.('main');
    if (!main || target.closest('a, button, input, select, textarea, label, summary, img, svg, [role="button"], [role="dialog"]')) return false;
    if ([...target.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
    for (let el = target; el && el !== main; el = el.parentElement) {
        const s = getComputedStyle(el);
        const fill = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
        const edge = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s[`border${k}Width`]) > 0);
        if (fill || edge || s.backgroundImage !== 'none' || s.cursor === 'pointer') return false;
    }
    return true;
};

export default function LingoShell() {
    const [dash, setDash] = useState(undefined);
    const [error, setError] = useState(null);
    const [picking, setPicking] = useState(null);       // 'learn' (the course) | 'speak' (their language) | null
    // The dashboard takes the whole width, like the profile dashboard (2026-10-26). The tabs are its own (none
    // lit: it is not one of them), in its top row with the language, level, streak and XP (2026-10-27); a page
    // they open has only its ✕ back to the dashboard (2026-10-27, "remove the nav bar from this page"). The side
    // panel that stood beside every tab (level, roadmap, quests, mistakes) is on the dashboard only (2026-10-26).
    const wide = useLocation().pathname === '/linguistic/dashboard';
    const navigate = useNavigate();
    const load = useCallback(() => linguisticApi.dashboard().then((d) => {
        setDash(d); setError(null);
        // A device set to Hindi, Japanese, French or Korean is offered that language, once.
        const offered = deviceLanguage((d.languages || []).map((l) => l.code));
        // (Not before the start screens, which ask it themselves.)
        if (d.started && !d.languageChosen && offered && offered !== 'kn' && !languageAsked()) setPicking('speak');
    }).catch((e) => { setError(e); setDash((cur) => cur || null); }), []);
    useEffect(() => { load(); }, [load]);
    const closePicker = useCallback(() => { markLanguageAsked(); setPicking(null); }, []);

    // The pages inside (2026-10-26): a click on the empty page around them goes back to the dashboard. A click
    // that only closes something open (a lesson's START card, the guidebook) stays, as before.
    const inside = !wide && !!dash?.started && !!dash?.plan;
    useEffect(() => {
        if (!inside) return undefined;
        let open = false;
        const down = () => { open = !!document.querySelector('[data-lesson-card], [role="dialog"], [aria-modal="true"]'); };
        const click = (e) => { if (!open && e.button === 0 && !window.getSelection()?.toString() && onEmptyPage(e.target)) navigate('/linguistic/dashboard'); };
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('click', click);
        return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('click', click); };
    }, [inside, navigate]);

    if (dash === undefined) return <Loading label="Opening your lessons…" />;
    if (!dash) return <Problem error={error} onRetry={load} />;
    // No level yet: the start screens first (the placement test, or a level chosen), Duolingo-style.
    if (!dash.started) return <Onboarding dash={dash} onDone={load} />;
    // Started, but no learning plan in this course yet (2026-10-26): how much time they have, before the path.
    if (!dash.plan) return <PlanQuestion dash={dash} onDone={load} />;

    return (
        // Every page of the section is full width (2026-10-26, "make it full screen"), as the dashboard is.
        <div className="lingo flex items-start pb-6" data-lingo-shell data-wide={wide || undefined}>
            <div className="w-full min-w-0 flex-1">
                {/* On the dashboard: ✕, the tabs, then the language, level, streak and XP — one row on a wide
                    screen; on a narrower one the tabs go to a second row under the ✕ and the rest. */}
                <div className={`mb-5 flex items-center gap-2 ${wide ? 'flex-wrap justify-between lg:flex-nowrap lg:gap-6' : ''}`}>
                    {/* The ✕ on every page (2026-10-26): a page inside opens the dashboard; the dashboard's leaves the
                        section for the app's Dashboard (2026-10-29: straight there, never back through the pages inside). */}
                    <Link to={wide ? '/' : '/linguistic/dashboard'} data-lingo-close={wide ? 'section' : 'dashboard'}
                        aria-label={wide ? 'Close Language Learning' : 'Back to the Language Learning dashboard'} title={wide ? 'Close' : 'Back to the dashboard'}
                        className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] transition-colors hover:bg-[#F2F2F2] hover:text-[#777]">
                        <X size={26} strokeWidth={3} aria-hidden="true" />
                    </Link>
                    {/* The language, level, streak and XP: on the dashboard only (2026-10-26, "not inside"). */}
                    {wide && <Stats dash={dash} onLanguage={() => setPicking('learn')} className="order-2 min-w-0 flex-1 sm:flex-none sm:gap-3 lg:order-3" />}
                    {wide && <nav aria-label="Language Learning" className="relative order-3 grid min-w-0 flex-1 basis-full grid-cols-4 lg:order-2 lg:max-w-2xl lg:basis-auto" data-tab-flow>
                        {/* The line that joins the tiles, from the first one's middle to the last one's. */}
                        <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[30px] h-2 -translate-y-1/2 rounded-full sm:top-[38px]" style={{ background: FLOW }} />
                        {TABS.map(({ to, end, label, art: Art, pill }) => (
                            <NavLink key={to} to={to} end={end} data-tab={label}
                                className="group relative flex flex-col items-center gap-2 rounded-2xl py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                                {({ isActive }) => (
                                    <>
                                        <ArtTile active={isActive} data-tab-node><Art /></ArtTile>
                                        <span className="whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-extrabold text-white shadow-sm sm:rounded-2xl sm:px-4 sm:py-1.5 sm:text-sm" style={{ background: pill }}>{label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>}
                </div>
                {/* A new language or course redraws the tab, in it. */}
                <Outlet key={`${dash.language?.code || 'kn'}:${dash.course?.code || 'en'}`} context={{ dash, reload: load }} />
            </div>
            {picking && (
                <LanguagePicker languages={dash.languages || []} courses={dash.courses || []} current={dash.language?.code || 'kn'} course={dash.course} mode={picking} locked={!!dash.started && !dash.courseDone && !dash.freeCourse} finished={!!dash.started && !!dash.courseDone}
                    suggested={deviceLanguage((dash.languages || []).map((l) => l.code))} onClose={closePicker} onDone={() => { closePicker(); load(); }} />
            )}
        </div>
    );
}
