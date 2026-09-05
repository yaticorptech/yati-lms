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
import MascotGuide from './components/mascot/MascotGuide';

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
      { name: 'Overview', path: '/career', icon: LayoutDashboard, exact: true, tone: 'from-violet-500 to-indigo-600 shadow-violet-500/40' },
      { name: "Today's Plan", path: '/career/planner', icon: CalendarCheck, tone: 'from-amber-400 to-orange-500 shadow-orange-500/40' },
      { name: 'Calendar', path: '/career/calendar', icon: Calendar, tone: 'from-sky-400 to-blue-600 shadow-sky-500/40' }
    ]
  },
  {
    label: 'Your path',
    items: [
      { name: 'Roadmap', path: '/career/roadmap', icon: Map, tone: 'from-emerald-400 to-teal-600 shadow-emerald-500/40' },
      { name: 'Skills', path: '/career/skills', icon: Target, tone: 'from-pink-400 to-rose-600 shadow-pink-500/40' },
      { name: 'Ideas & Resources', short: 'Ideas', path: '/career/recommendations', icon: Lightbulb, tone: 'from-yellow-400 to-amber-500 shadow-amber-500/40' }
    ]
  },
  {
    label: 'Progress',
    items: [
      { name: 'My Progress', path: '/career/profile', icon: UserCircle, tone: 'from-indigo-400 to-violet-600 shadow-indigo-500/40' },
      { name: 'Rewards', path: '/career/badges', icon: Award, tone: 'from-orange-400 to-red-500 shadow-orange-500/40' },
      { name: 'Games', path: '/career/games', icon: Gamepad2, tone: 'from-fuchsia-400 to-purple-600 shadow-fuchsia-500/40' }
    ]
  },
  {
    // The mentor used to sit here. It is its own section now — it answers
    // about the whole product, not only the roadmap, and burying it as the
    // ninth tab of a sub-navigation made it something a student had to already
    // know about to find.
    label: 'Support',
    items: [{ name: 'Settings', path: '/career/settings', icon: Settings, tone: 'from-slate-400 to-slate-600 shadow-slate-500/40' }]
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

  // Where the white folder sits: measured from the open tab, re-measured
  // when the route or the window width changes. The CSS springs it there.
  const [slider, setSlider] = useState(null);
  useEffect(() => {
    const measure = () => {
      const rail = railRef.current;
      const active = rail?.querySelector('[aria-current="page"]');
      if (!rail || !active) return;
      setSlider({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);

  // Which way the student moved along the band, so the page can arrive
  // from that side.
  const items = NAV_GROUPS.flatMap((g) => g.items);
  const indexOf = (path) =>
    items.findIndex((i) => (i.exact ? path === i.path : path.startsWith(i.path)));
  const currentIndex = indexOf(pathname);
  // Previous and current index, kept in state and rolled forward the render
  // the route changes — so the direction is known before the page mounts.
  const [track, setTrack] = useState({ prev: currentIndex, current: currentIndex });
  if (track.current !== currentIndex) {
    setTrack({ prev: track.current, current: currentIndex });
  }
  const direction = currentIndex >= track.prev ? 'right' : 'left';

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
      {/* Folder tabs, the way a delivery app does it: every screen is its own
          tab on a dark band, an icon on top and its name beneath, and the one
          that is open turns white and joins the page below. All ten are on
          the band — nothing is folded away behind a group. */}
      <div className="mb-6">
        <div className="fp-band-sheen relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-journey-200/70 via-journey-100 to-journey-100 px-2 pt-1 sm:px-3">
          <div
            aria-hidden
            className="fp-float pointer-events-none absolute -top-16 right-1/4 h-40 w-40 rounded-full bg-pink-200/50 blur-3xl"
          />
          <div
            aria-hidden
            className="fp-float-slow pointer-events-none absolute -top-10 left-10 h-32 w-32 rounded-full bg-journey-200/50 blur-3xl"
          />

          {/* Scrolls sideways below the width all ten fit in, with the active
              tab brought into view on every route change. */}
          {/* The row scrolls sideways, and a scrolling box clips whatever
              pokes out of it — so the headroom the icons rise into is inside
              the box, as top padding, not outside it on the band. */}
          <nav
            ref={railRef}
            aria-label="Career Path sections"
            className="relative overflow-x-auto pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pt-6"
          >
            <div className="relative flex w-max min-w-full items-end gap-1 sm:gap-1.5">
              {slider && (
                <span
                  aria-hidden
                  className="fp-tab-slider"
                  style={{ left: slider.left, width: slider.width }}
                />
              )}
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  title={item.name}
                  data-guide={`tab-${item.path.split('/').pop() || 'overview'}`}
                  className={({ isActive }) =>
                    `fp-press group relative z-10 flex min-w-[5.4rem] flex-1 flex-col items-center rounded-t-[1.1rem] px-1.5 pt-1 pb-2.5 text-center transition-all duration-300 sm:min-w-[6.2rem] ${
                      isActive
                        ? '-mb-px text-ink-900'
                        : 'mb-1 bg-surface/55 text-journey-700 ring-1 ring-journey-200/70 ring-inset hover:-translate-y-1 hover:bg-surface/90'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* The icon sits half above the tab's top edge on its own
                          colour tile — bigger, and bobbing, on the open one. */}
                      <span
                        aria-hidden
                        className={`fp-wiggle -mt-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-2 ring-surface transition-transform duration-300 sm:-mt-5 sm:h-10 sm:w-10 ${item.tone} ${
                          isActive ? 'fp-bob-soft scale-110' : 'scale-95 group-hover:scale-105'
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.4} />
                      </span>
                      <span className="mt-1.5 max-w-full text-[0.66rem] leading-tight font-black sm:text-xs">
                        {item.short || item.name}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>

        {/* The white base the lit tab stands on. */}
        <div className="flex min-h-3.5 items-center justify-end rounded-b-3xl border border-t-0 border-journey-200/70 bg-surface px-4 shadow-card">
          {aiNotice && <div className="py-1.5">{aiNotice}</div>}
        </div>
      </div>

      {/* Feature releases this browser has not seen. The bell carries the
          same list per student; this is where the features actually are. */}
      <WhatsNew />

      {/* The CareerPath mascot: tours each page once, then rests with tips
          and a help menu. Uses the official image at /mascot.png. */}
      <MascotGuide />

      {/* Keyed on the route so the slide-up replays on every tab switch. */}
      <div key={pathname} className={direction === 'right' ? 'fp-page-in-right' : 'fp-page-in-left'}>
        <Outlet />
      </div>
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
