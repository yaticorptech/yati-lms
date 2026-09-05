import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, MessageSquare, Briefcase, Compass, Bot } from 'lucide-react';

/**
 * The student's main navigation on a phone.
 *
 * The sidebar it mirrors is behind a hamburger on mobile, which puts every
 * section of the product two taps and a mental step away. The same seven
 * destinations sit under the thumb here, and the drawer keeps what does not
 * belong in a nav bar — support and sign-out.
 *
 * Labels are the sidebar's own words, wrapped rather than shortened. Renaming
 * "Enrolled Courses" to "Courses" for the sake of one line is how a product
 * ends up calling the same page two things depending on the device.
 *
 * Jobs, Career Path and the mentor come and go with the admin switches, exactly
 * as they do in the sidebar, so the bar never offers a section the student
 * cannot open.
 */
const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/enrolled-courses', label: 'Enrolled Courses', icon: BookOpen },
  { to: '/community', label: 'Community', icon: MessageSquare },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, flag: 'jobs' },
  { to: '/career', label: 'Career Path', icon: Compass, flag: 'career' },
  { to: '/mentor', label: 'AI Mentor', icon: Bot, flag: 'career' }
];

export default function MobileBottomNav({ isJobsEnabled, isCareerPathEnabled }) {
  const { pathname } = useLocation();

  const visible = ITEMS.filter((item) => {
    if (item.flag === 'jobs') return isJobsEnabled;
    if (item.flag === 'career') return isCareerPathEnabled;
    return true;
  });

  const isActive = (item) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <nav
      aria-label="Main sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 px-0.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <div className="flex items-stretch">
        {visible.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-start gap-1 px-0 pt-1 pb-1.5 text-[0.58rem] font-bold transition-colors ${
                active ? 'text-white' : 'text-slate-400'
              }`}
            >
              {/* A rail above the icon, not a filled pill around it.

                  The Career Path tabs upstairs already use a filled gradient
                  pill for "active". Repeating that shape down here made two
                  different navigations speak with one voice, so at a glance it
                  was unclear which level of the app a highlight belonged to —
                  and stacked a second heavy chip under a screen that already
                  had one. A top indicator is the bottom bar's own signal. */}
              <span
                aria-hidden
                className={`h-0.5 w-7 rounded-full transition-colors ${
                  active ? 'bg-indigo-400' : 'bg-transparent'
                }`}
              />
              <span
                className={`flex h-6 w-10 shrink-0 items-center justify-center transition-colors ${
                  active ? 'text-indigo-300' : 'text-slate-500'
                }`}
              >
                <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
              </span>
              {/* A fixed two-line box, whether the name needs one line or two.
                  "Dashboard" sat on one line next to "Enrolled Courses" on two,
                  so the icons above them lined up but the labels below did not
                  — seven cells of different heights reading as a ragged edge
                  rather than a row of buttons. */}
              {/* Wraps at spaces only. `overflow-wrap: anywhere` let it break
                  mid-word, so a 360px screen read "Dashboar / d" and
                  "Communit / y" — worse than any truncation. The type drops a
                  notch instead, which is enough for the longest single word
                  ("Dashboard", "Community") to sit on one line in a 51px cell. */}
              <span className="flex min-h-[1.8rem] w-full items-start justify-center px-px text-center leading-[1.15] break-words hyphens-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
