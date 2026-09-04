/**
 * @description The frame the whole Career Path (FuturePath) section renders in.
 *
 * Replaces the standalone app's DashboardLayout. That one owned the page: its
 * own left sidebar, its own top bar, its own identity card. Inside the LMS all
 * of that already exists one level up in StudentLayout, so this is deliberately
 * thinner — a tab strip for the section's ten screens, the level/XP chip and the
 * Career Path notification bell, and then the page.
 *
 * It also carries the three things the ported pages assume are above them:
 *   • the `.futurepath` wrapper, which is what scopes career.css (without it the
 *     section renders in the LMS's font on the LMS's background);
 *   • the toast / confirm / celebration providers the pages call into;
 *   • the auth adapter that re-exposes the LMS session in FuturePath's shape.
 */
import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Calendar, Map, Target, Lightbulb,
  UserCircle, Award, Settings, Sparkles, Gamepad2
} from 'lucide-react';

import api from './services/api';
import { AuthContext } from './context/AuthContext';
import CareerProviders from './CareerProviders';
import WhatsNew from './components/WhatsNew';

/**
 * The section's ten screens, in the order the standalone app grouped them:
 * today's work first, the long view next, then progress and support. The group
 * labels survive as separators in the tab strip — nine peers competing as
 * equals was the problem the grouping originally solved.
 */
const NAV_GROUPS = [
  {
    label: 'Today',
    items: [
      { name: 'Overview', path: '/career', icon: LayoutDashboard, exact: true },
      { name: "Today's Plan", path: '/career/planner', icon: CalendarCheck },
      { name: 'Calendar', path: '/career/calendar', icon: Calendar }
    ]
  },
  {
    label: 'Your path',
    items: [
      { name: 'Roadmap', path: '/career/roadmap', icon: Map },
      { name: 'Skills', path: '/career/skills', icon: Target },
      { name: 'Ideas & Resources', path: '/career/recommendations', icon: Lightbulb }
    ]
  },
  {
    label: 'Progress',
    items: [
      { name: 'My Progress', path: '/career/profile', icon: UserCircle },
      { name: 'Rewards', path: '/career/badges', icon: Award },
      { name: 'Games', path: '/career/games', icon: Gamepad2 }
    ]
  },
  {
    // The mentor used to sit here. It is its own section now — it answers
    // about the whole product, not only the roadmap, and burying it as the
    // ninth tab of a sub-navigation made it something a student had to already
    // know about to find.
    label: 'Support',
    items: [{ name: 'Settings', path: '/career/settings', icon: Settings }]
  }
];

function CareerFrame() {
  const { refresh } = useContext(AuthContext);
  const { pathname } = useLocation();

  /**
   * The rail slides the tab you are on into the middle of itself.
   *
   * Nine sections do not fit across a phone, so the strip scrolls — and a
   * scrolling strip that never moves on its own is worse than no strip at all:
   * tapping "Roadmap" from Overview would leave the highlight off-screen to
   * the right, so the one thing the student needs to see, where they are, is
   * the one thing hidden. Centring it also puts the previous section on the
   * left and the next one peeking in on the right, which is what tells them
   * the strip scrolls at all.
   *
   * `nearest` on the block axis so this never scrolls the page itself, only
   * the strip. Instant rather than smooth when the OS asks for reduced motion.
   */
  const railRef = useRef(null);
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector('[aria-current="page"]');
    if (!rail || !active) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    active.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }, [pathname]);

  // XP and level are written server-side whenever a task is completed. The
  // standalone app got fresh numbers because signing in reloaded the page; here
  // the student can finish a task and walk to Rewards without the app ever
  // reloading, so the chip and the rewards page would both go stale.
  useEffect(() => {
    refresh?.();
  }, [pathname, refresh]);

  // What is left of today's AI allowance. Shown only once it is nearly gone:
  // a counter on screen all day turns a safety limit into a scoreboard, but a
  // student who is about to click Regenerate with two requests left should
  // know before they spend them, not after.
  const [aiLeft, setAiLeft] = useState(null);
  useEffect(() => {
    api.get('/ai-usage').then((r) => setAiLeft(r.data)).catch(() => setAiLeft(null));
  }, [pathname]);
  const lowOnAi = aiLeft && aiLeft.remaining <= 5;

  // Defined once, rendered in whichever of the two slots the width calls for.
  const aiNotice = lowOnAi ? (
    <span
      title={`AI requests reset at midnight. ${aiLeft.used} of ${aiLeft.limit} used today.`}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
        aiLeft.remaining === 0
          ? 'border-amber-300 bg-amber-100 text-amber-800'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {aiLeft.remaining === 0
        ? 'No AI requests left today'
        : `${aiLeft.remaining} AI request${aiLeft.remaining === 1 ? '' : 's'} left`}
    </span>
  ) : null;

  return (
    <>
      {/* The section's tabs, with the student's level parked at the end of
          them.

          The page title that used to sit above this is gone. It read "CAREER
          PATH / <name>'s roadmap" on every screen, directly above each page's
          own heading — so Skills opened with "ZZQA's roadmap / Your skill map"
          and the Overview opened with it a third time, above a hero already
          carrying the student's name and goal. Three titles, one page. The
          pages title themselves; the shell carries navigation. */}
      {/* Exact complement of the thumb bar's `lg:hidden`, and nothing else.
          It carried `lg:flex` and `lg:block` together — two display values
          fighting at the same breakpoint — and the pair left 1024px showing
          neither the rail nor the bar: a width with no Career Path navigation
          on it at all. One condition, one display. */}
      <div className="mb-6 flex items-start gap-2">
        {/* Segmented rail rather than the standalone app's second sidebar: the
            LMS already spends 16rem on its own, and a nested rail inside it
            left the content squeezed on a laptop and unusable on a phone.

            The four groups are visible as groups. They were always declared in
            NAV_GROUPS but rendered as adjacent divs with identical spacing, so
            ten tabs still arrived as ten peers competing as equals — the exact
            problem the grouping was written to solve.

            One line, at every width. It used to wrap on desktop, and at the
            widths a laptop actually has that meant Settings alone on a second
            row — a strip of nine and an orphan. The pills are compact enough
            that all ten fit inside the layout's max width; below that the
            strip scrolls sideways with the scrollbar hidden, and the active
            tab is scrolled into view on every route change so the current
            section is never off-screen. */}
        <nav
          ref={railRef}
          aria-label="Career Path sections"
          className="-ml-4 min-w-0 flex-1 overflow-x-auto pb-1 pl-4 [scrollbar-width:none] [scroll-padding-inline:1rem] [&::-webkit-scrollbar]:hidden lg:ml-0 lg:pl-0"
        >
          {/* No card, no border, no shadow.

              A white panel here sat between a dark header and a dark bottom bar
              — three heavy stripes with the page squeezed between them, and the
              section tabs reading as chrome when they are content. Bare pills
              on the page background put them at the level they belong to, and
              leave "solid dark" meaning one thing only: app chrome. */}
          <div className="flex w-max items-center gap-1 py-0.5 lg:w-full">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.label} className="flex items-center gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    title={`${group.label} · ${item.name}`}
                    className={({ isActive }) =>
                      `fp-press group flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[0.8rem] font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-journey-600 to-indigo-600 text-white shadow-md shadow-journey-600/25'
                          : 'bg-surface/70 text-ink-600 ring-1 ring-line-200 ring-inset hover:bg-surface hover:text-journey-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-ink-400 group-hover:text-journey-500'
                          }`}
                        />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}

                {/* The rule closes a group rather than opening the next one.
                    Rendered ahead of the following group it became the first
                    thing on a wrapped line — a stray mark hanging in the left
                    margin with nothing before it to divide. */}
                {groupIndex < NAV_GROUPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mx-0.5 h-5 w-px shrink-0 self-center bg-line-200"
                  />
                )}
              </div>
            ))}

            {/* Level sits inside the rail on desktop, pushed to the end of the
                last row. Outside it, it hung in the gutter to the right of the
                card looking like something that had come loose. Below lg the
                rail scrolls, so it moves to its own row instead of sliding
                away with the tabs. */}
            {/* Level lived here as an amber chip. It is already on the hero
                ("Level 2 · 110 XP to go"), in the header pill and on the
                sidebar card, so a fourth copy above the tabs was the same
                number competing with the navigation for attention. Only the AI
                allowance stays, and only when it is nearly spent. */}
            {aiNotice && (
              <div className="hidden lg:ml-auto lg:flex lg:items-center lg:pl-2">{aiNotice}</div>
            )}
          </div>
        </nav>

        {aiNotice && <div className="flex shrink-0 items-center lg:hidden">{aiNotice}</div>}
      </div>

      {/* Feature releases this browser has not seen. The bell carries the
          same list per student; this is where the features actually are. */}
      <WhatsNew />

      <Outlet />
    </>
  );
}

export default function CareerShell() {
  return (
    <CareerProviders>
      <CareerFrame />
    </CareerProviders>
  );
}
