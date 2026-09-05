import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, MessageSquare, Briefcase, Compass, Bot, User } from 'lucide-react';
import './mobileBottomNav.css';

/**
 * The student's main navigation on a phone.
 *
 * The sidebar it mirrors is behind a hamburger on mobile, which puts every
 * section of the product two taps and a mental step away. The same seven
 * destinations sit under the thumb here, and the drawer keeps what does not
 * belong in a nav bar — support and sign-out.
 *
 * Labels are shortened to one word each so seven of them sit on one line
 * under their icons; the sidebar's full name stays on the accessible label,
 * so a screen reader still hears "Enrolled Courses".
 *
 * Jobs, Career Path and the mentor come and go with the admin switches, exactly
 * as they do in the sidebar, so the bar never offers a section the student
 * cannot open.
 *
 * The active signal is a gradient bubble that slides along the bar to
 * whichever icon is on, the way a delivery app's bottom bar does it. It is
 * measured from the active link and springs into place, so switching tabs
 * is something the thumb can watch rather than a colour that changes.
 */
// `label` is the sidebar's own name and goes on the accessible label; `short`
// is what fits under an icon in one line when seven of them share a phone.
const ITEMS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, exact: true },
  { to: '/enrolled-courses', label: 'Enrolled Courses', short: 'Courses', icon: BookOpen },
  { to: '/community', label: 'Community', short: 'Community', icon: MessageSquare },
  { to: '/jobs', label: 'Jobs', short: 'Jobs', icon: Briefcase, flag: 'jobs' },
  { to: '/career', label: 'Career Path', short: 'Career', icon: Compass, flag: 'career' },
  { to: '/mentor', label: 'AI Mentor', short: 'Mentor', icon: Bot, flag: 'career' },
  { to: '/profile', label: 'My Profile', short: 'Profile', icon: User }
];

export default function MobileBottomNav({ isJobsEnabled, isCareerPathEnabled }) {
  const { pathname } = useLocation();
  const rowRef = useRef(null);
  const [bubble, setBubble] = useState(null);

  const visible = ITEMS.filter((item) => {
    if (item.flag === 'jobs') return isJobsEnabled;
    if (item.flag === 'career') return isCareerPathEnabled;
    return true;
  });

  const isActive = (item) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

  // Where the bubble sits: under the active icon, re-measured when the route
  // or the screen width changes. The CSS springs it there.
  useEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      const icon = row?.querySelector('[data-active-icon="true"]');
      if (!row || !icon) {
        setBubble(null);
        return;
      }
      const rowBox = row.getBoundingClientRect();
      const box = icon.getBoundingClientRect();
      setBubble({ left: box.left - rowBox.left, width: box.width });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname, visible.length]);

  return (
    <nav
      aria-label="Main sections"
      className="mbn-in fixed inset-x-1.5 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        {/* A faint sheen across the top edge, so the bar reads as glass. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div ref={rowRef} className="relative flex items-stretch px-0.5 pt-1.5 pb-1.5">
          {bubble && (
            <span aria-hidden className="mbn-bubble" style={{ left: bubble.left, width: bubble.width }} />
          )}

          {visible.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`mbn-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 px-0 pt-0.5 pb-1.5 text-[0.56rem] font-bold tracking-tight transition-colors duration-300 ${
                  active ? 'text-white' : 'text-slate-400'
                }`}
              >
                {/* The icon's box is what the bubble is measured from, so the
                    bubble always fits the icon rather than the whole cell. */}
                <span
                  data-active-icon={active || undefined}
                  key={active ? `${item.to}-on` : `${item.to}-off`}
                  className={`flex h-10 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                    active ? 'mbn-icon-active text-white' : 'text-slate-400'
                  }`}
                >
                  <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>

                <span className="w-full truncate px-px text-center leading-none">{item.short}</span>

                {active && <span aria-hidden className="mbn-dot absolute bottom-0 h-1 w-1 rounded-full bg-indigo-300" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
