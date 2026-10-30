import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, BookOpen, Route, BriefcaseBusiness, Gamepad2, Wallet, ChevronRight, UserRound, Globe, Shield, Trophy } from 'lucide-react';
import ProfileImage from './ProfileImage';
import { money, balance } from './rewards/format';
import useKeyboardOpen from '../native/useKeyboardOpen';
import './mobileBottomNav.css';

/**
 * The student's main navigation on a phone.
 *
 * The sidebar it mirrors is behind a hamburger on mobile, which puts every
 * section of the product two taps and a mental step away. The same
 * destinations sit under the thumb here, and the drawer keeps what does not
 * belong in a nav bar — support and sign-out.
 *
 * Labels are shortened to one word each so all of them sit on one line
 * under their icons; the sidebar's full name goes on the accessible label
 * too, so a screen reader still hears "My Courses". The accessible label
 * always starts with the word on screen ("Grants (Scholarships)"): someone
 * using voice control says what they see, and "tap Grants" found nothing
 * when the label was "Scholarships" alone.
 *
 * Jobs and Career Path come and go with the admin switches, exactly
 * as they do in the sidebar, so the bar never offers a section the student
 * cannot open.
 *
 * The bar is a light floating island, matching the white top bar, and the
 * active signal is a full-height indigo capsule that slides along it to
 * whichever tab is on — icon and label together, the way the newest phone
 * tab bars do it. It is measured from the active tab and springs into
 * place, so switching tabs is something the thumb can watch rather than a
 * colour that changes.
 */
// `label` is the sidebar's own name, word for word, and goes on the accessible
// label; `short` is what fits under an icon in one line when all of them
// share a phone.
// My Profile stays in the drawer rather than here. The order follows a
// student's path: learn, plan a career, prepare for jobs, fund it; Games
// (the brain games) last — lit on Competitions too (`also`): the two
// sections share one place here; Competitions is in the drawer. Each icon is
// the plainest picture of its word: a house, a book, a route, a briefcase,
// coins in a hand, a gamepad.
// Home stays put on the left; the rest scroll (asked 2026-10-29): Career,
// Multilingo and Games first, a › to say there is more, then Job Prep,
// Courses and the activities, and Me (the profile) last.
const HOME = { to: '/', label: 'Dashboard', short: 'Home', icon: House, exact: true };
const ITEMS = [
  { to: '/career', label: 'Career Path', short: 'Career Path', icon: Route, flag: 'career' },
  { to: '/linguistic/dashboard', section: '/linguistic', label: 'Multilingo', short: 'Multilingo', icon: Globe, flag: 'linguistic' },
  { to: '/games', label: 'Games', short: 'Games', icon: Gamepad2 },
  { to: '/interview', label: 'Job Preparation', short: 'Job Preparation', icon: BriefcaseBusiness, also: '/jobs' },
  { to: '/enrolled-courses', label: 'My Courses', short: 'My Courses', icon: BookOpen },
  { to: '/extracurricular', label: 'Extra Curricular', short: 'Extra Curricular', icon: Shield },
  { to: '/competitions', label: 'Competitions', short: 'Competitions', icon: Trophy }
];

/** The visible word first, then the sidebar's name when it says something else. */
const nameOf = (item) =>
  item.label.toLowerCase().startsWith(item.short.toLowerCase()) ? item.label : `${item.short} (${item.label})`;

const initialsOf = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/**
 * The last tab: the student's photo. It opens a small card above the bar —
 * My Profile, and the wallet balance (its history opens in the wallet popup).
 */
function MeTab({ user, rewards, onOpenWallet }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const active = pathname === '/profile' || pathname.startsWith('/profile/');

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const wallet = rewards?.wallet;
  const level = rewards?.level?.level;
  return (
    <div ref={boxRef} className="relative z-10 flex w-[4.4rem] shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Me (My Profile and wallet)"
        className={`mbn-press flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] pt-2 pb-1.5 text-[0.6rem] tracking-tight transition-colors ${active || open ? 'font-bold text-indigo-700' : 'font-semibold text-slate-500'}`}>
        <span className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[0.55rem] font-black text-indigo-700 ring-2 transition-all ${active || open ? 'ring-indigo-500' : 'ring-slate-200'}`}>
          <ProfileImage src={user?.profilePicture} alt="" className="h-full w-full object-cover" fallback={initialsOf(user?.name)} />
        </span>
        <span className="whitespace-nowrap leading-none">Me</span>
      </button>

      {open && (
        <div role="menu" aria-label="Me" className="mbn-pop fixed right-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] w-64 origin-bottom-right overflow-hidden rounded-3xl bg-white p-1.5 shadow-[0_18px_50px_-14px_rgba(30,27,75,0.45)] ring-1 ring-slate-900/5">
          {/* The student, as a small member card: opens My Profile. */}
          <Link to="/profile" role="menuitem" className="group relative flex items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-3 text-white">
            <span aria-hidden="true" className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
            <span className="relative shrink-0">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold ring-2 ring-white/70">
                <ProfileImage src={user?.profilePicture} alt="" className="h-full w-full object-cover" fallback={initialsOf(user?.name)} />
              </span>
              {level != null && <span className="absolute -right-1.5 -bottom-1 rounded-full bg-amber-300 px-1.5 text-[10px] leading-4 font-black text-amber-950 ring-2 ring-violet-600">Lv {level}</span>}
            </span>
            <span className="relative min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-bold">{user?.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/80"><UserRound size={11} aria-hidden="true" /> My Profile</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="relative shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* The wallet: the balance here, the history in the wallet popup. */}
          {wallet && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenWallet?.(); }}
              className="mt-1.5 flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition-colors hover:bg-emerald-50 active:bg-emerald-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><Wallet size={19} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[11px] font-semibold text-slate-500">Wallet balance</span>
                <span className="block text-lg font-black text-slate-900 tabular-nums">{money(balance(wallet.available), wallet.currency || 'INR')}</span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">History</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One tab: icon over a one-word label, lit as an indigo pill when on. */
function Tab({ item, active, onClick, className = '' }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      data-active-tab={active || undefined}
      aria-label={nameOf(item)}
      aria-current={active ? 'page' : undefined}
      className={`mbn-press relative z-10 flex shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] pt-2 pb-1.5 text-[0.6rem] tracking-tight transition-colors ${
        active ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500 active:text-slate-700'
      } ${className}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <item.icon size={21} strokeWidth={active ? 2.4 : 1.9} />
      </span>
      <span className="whitespace-nowrap text-center leading-none">{item.short}</span>
      {/* The only "you are here": a small dot under the label. */}
      <span aria-hidden className={`h-1 w-1 rounded-full ${active ? 'bg-indigo-600' : 'bg-transparent'}`} />
    </Link>
  );
}

export default function MobileBottomNav({ isJobsEnabled, isCareerPathEnabled, isLinguisticEnabled = true, user, rewards, onOpenWallet }) {
  const { pathname } = useLocation();
  const stripRef = useRef(null);
  const [more, setMore] = useState(true);
  // In the app, the bar steps aside while the on-screen keyboard is up: it
  // sat on top of the field being typed in.
  const keyboardOpen = useKeyboardOpen();

  const visible = ITEMS.filter((item) => {
    if (item.flag === 'jobs') return isJobsEnabled;
    if (item.flag === 'career') return isCareerPathEnabled;
    if (item.flag === 'linguistic') return isLinguisticEnabled;
    return true;
  });

  const isActive = (item) =>
    item.exact ? pathname === item.to : [item.section || item.to, item.also].filter(Boolean).some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Whether there is more to the right: the › shows until the end is reached.
  const check = () => {
    const el = stripRef.current;
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  // Home brings the strip back to its start; any other section scrolls its tab into view.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (pathname === '/') el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.querySelector('[data-active-tab="true"]')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const t = setTimeout(check, 400);
    window.addEventListener('resize', check);
    return () => { clearTimeout(t); window.removeEventListener('resize', check); };
  }, [pathname, visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav
      aria-label="Main sections"
      data-loop-skip
      data-keyboard-open={keyboardOpen || undefined}
      className={`mbn-in fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sidebar:hidden ${keyboardOpen ? 'hidden' : ''}`}
    >
      {/* Solid white, with no backdrop blur: the bar never leaves the screen,
          so a blur was worked out again for every frame of every scroll, and
          the page scrolled unevenly on phones. A hairline border and a soft,
          low shadow lift it off the page instead. */}
      <div className="mbn-island relative flex items-stretch gap-1 rounded-[28px] border border-slate-200/70 bg-white p-1.5">
        <Tab item={HOME} active={isActive(HOME)} className="w-[4.4rem]" onClick={() => stripRef.current?.scrollTo({ left: 0, behavior: 'smooth' })} />
        <span aria-hidden className="my-2 w-px shrink-0 bg-slate-200" />
        <div className="relative min-w-0 flex-1">
          <div ref={stripRef} onScroll={check} className="flex h-full items-stretch gap-1 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visible.map((item) => <Tab key={item.to} item={item} active={isActive(item)} className="min-w-[4.4rem] px-2.5" />)}
            <MeTab user={user} rewards={rewards} onOpenWallet={onOpenWallet} />
          </div>
          {more && (
            <button type="button" aria-label="More sections"
              onClick={() => stripRef.current?.scrollBy({ left: stripRef.current.clientWidth * 0.8, behavior: 'smooth' })}
              className="absolute inset-y-0 right-0 z-20 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-0.5 text-slate-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm"><ChevronRight size={15} strokeWidth={2.6} /></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
