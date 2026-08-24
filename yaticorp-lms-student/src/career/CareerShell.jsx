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
import { useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Calendar, Map, Target, Lightbulb,
  UserCircle, Award, MessageSquare, Settings, Zap, Sparkles
} from 'lucide-react';

import api from './services/api';
import { AuthContext } from './context/AuthContext';
import CareerProviders from './CareerProviders';

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
      { name: 'Rewards', path: '/career/badges', icon: Award }
    ]
  },
  {
    label: 'Support',
    items: [
      { name: 'AI Mentor', path: '/career/mentor', icon: MessageSquare },
      { name: 'Settings', path: '/career/settings', icon: Settings }
    ]
  }
];

function CareerFrame() {
  const { user, refresh } = useContext(AuthContext);
  const { pathname } = useLocation();

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

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold tracking-wider text-ink-400 uppercase">
            Career Path
          </p>
          <h1 className="truncate text-xl font-bold text-ink-900">
            {user?.name ? `${user.name.split(' ')[0]}'s roadmap` : 'Your roadmap'}
          </h1>
        </div>

        {/* No bell here. Career Path used to carry its own, which meant a badge
            earned on Monday was only discoverable by coming back into this
            section — the header bell a few centimetres away showed nothing.
            Both feeds are in the one header bell now (StudentLayout). */}
        <div className="flex shrink-0 items-center gap-2">
          {lowOnAi && (
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
          )}
          <NavLink
            to="/career/profile"
            className="flex items-center gap-1.5 rounded-full border border-line-200 bg-surface px-3 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:border-brand-200 hover:text-link"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Level {user?.level || 1} · {user?.xp || 0} XP
          </NavLink>
        </div>
      </div>

      {/* Tab strip rather than the standalone app's second sidebar: the LMS
          already spends 16rem on its own, and a nested rail inside it left the
          content squeezed on a laptop and unusable on a phone.

          It WRAPS on desktop instead of scrolling. Ten tabs came to 1292px,
          and StudentLayout caps its content at max-w-7xl (1280px) — so a
          scrolling strip hid Settings at every desktop width, 1920px included,
          behind a horizontal scrollbar nobody thinks to look for. Below md it
          still scrolls, where a sideways swipe is the expected gesture and
          three wrapped rows would eat the screen. */}
      <nav
        aria-label="Career Path sections"
        className="-mx-4 mb-6 overflow-x-auto border-b border-line-200 px-4 md:-mx-8 md:overflow-x-visible md:px-8"
      >
        <div className="flex w-max items-center gap-1 pb-px md:w-auto md:flex-wrap">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  title={`${group.label} · ${item.name}`}
                  className={({ isActive }) =>
                    `group flex items-center gap-2 border-b-2 px-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-brand-600 text-link-strong'
                        : 'border-transparent text-ink-600 hover:text-ink-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isActive ? 'text-link' : 'text-ink-400 group-hover:text-ink-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>

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
