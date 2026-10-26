/**
 * Linguistic Ability — the section around its tabs (redesigned 2026-10-22 to
 * work like Duolingo): Learn (the path), Practice, Badges and Writing, with
 * the student's level, streak and XP, and — on a wide screen — today's quests
 * and the mistakes waiting beside the page. The dashboard is loaded here once
 * and handed to the tabs.
 */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Route as PathIcon, Dumbbell, Medal, PenLine } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, deviceLanguage, languageAsked, markLanguageAsked } from './meta';
import { Loading, Problem } from './ui';
import { Stats } from './Rail';
import LanguagePicker from './LanguagePicker';
import Onboarding from './Onboarding';
import PlanQuestion from './PlanQuestion';
import './lingo.css';

// The Dashboard (/linguistic/dashboard, 2026-10-26) is where the section opens, from the menu; it has no tab of its own.
const TABS = [
    { to: '/linguistic', end: true, label: 'Learn', icon: PathIcon },
    { to: '/linguistic/practice', label: 'Practice', icon: Dumbbell },
    { to: '/linguistic/badges', label: 'Badges', icon: Medal },
    { to: '/linguistic/writing', label: 'Writing', icon: PenLine }
];

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
    // The dashboard takes the whole width, like the profile dashboard (2026-10-26), and has no tabs: they show
    // once the student goes on from it ("Continue where you stopped"). The side panel that stood beside every
    // tab (level, roadmap, quests, mistakes) is on the dashboard only now (asked the same day).
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
                <div className={wide ? 'mb-5 flex justify-end' : 'mb-5 space-y-3'}>
                    {/* The language, level, streak and XP: on the dashboard only (2026-10-26, "not inside"). */}
                    {wide && <Stats dash={dash} onLanguage={() => setPicking('learn')} className="w-full sm:w-auto sm:gap-3" />}
                    {!wide && <nav aria-label="Language Learning" className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {TABS.map(({ to, end, label, icon: Icon }) => (
                            <NavLink key={to} to={to} end={end} data-tab={label}
                                className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-[11px] font-extrabold uppercase tracking-wide transition-colors sm:flex-row sm:gap-2 sm:text-[13px] ${isActive ? '' : 'border-transparent text-[#777] hover:bg-[#F2F2F2]'}`}
                                style={({ isActive }) => (isActive ? { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink } : undefined)}>
                                <Icon size={20} strokeWidth={2.5} /> {label}
                            </NavLink>
                        ))}
                    </nav>}
                </div>
                {/* A new language or course redraws the tab, in it. */}
                <Outlet key={`${dash.language?.code || 'kn'}:${dash.course?.code || 'en'}`} context={{ dash, reload: load }} />
            </div>
            {picking && (
                <LanguagePicker languages={dash.languages || []} courses={dash.courses || []} current={dash.language?.code || 'kn'} course={dash.course} mode={picking}
                    suggested={deviceLanguage((dash.languages || []).map((l) => l.code))} onClose={closePicker} onDone={() => { closePicker(); load(); }} />
            )}
        </div>
    );
}
