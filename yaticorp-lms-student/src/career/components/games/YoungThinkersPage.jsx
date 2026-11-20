import { useContext, useState } from 'react';
import { ArrowLeft, ChevronRight, Lock, Play, Star, Trophy, Users } from 'lucide-react';
import { AuthContext as LmsAuthContext } from '../../../context/AuthContext';
import GameThumb from './GameThumb';

/**
 * Young Thinkers (2026-11-14, the user's design): the section's own page, drawn from the reference picture — the
 * sky-and-castle banner with the two children and the wooden sign (cut from the design into public/games/young),
 * the student's own name, class, points and achievements over it; the four category tabs; the category's seven
 * games as picture cards with a blue Play; then "Your Progress" (opens My progress), a cheer, and Group Games.
 *
 * Props: categories [{ key, name }], gamesOf(key) → [{ game, badge }], completed (games of the 28 started),
 * classNumber, stars, achievements (earned count), onPlay(game), onProgress(), onGroup(), onBack().
 */
const ICON = { memory: 'icon-memory.png', logic: 'icon-logic.png', vocab: 'icon-vocab.png', math: 'icon-math.png' };
const PICTURE = new Set(['memory-match', 'colour-match', 'animal-pair-safari', 'whats-missing', 'light-up-garden', 'shadow-detective', 'flash-sequence']);
// Cards with no picture yet: the game's own drawing on a bright wash, in turn.
const WASH = ['from-sky-200 to-emerald-100', 'from-amber-100 to-rose-100', 'from-lime-100 to-sky-100', 'from-violet-100 to-sky-100', 'from-rose-100 to-amber-100', 'from-emerald-100 to-lime-100', 'from-sky-100 to-violet-100'];
const RING = ['ring-sky-200', 'ring-amber-200', 'ring-emerald-200', 'ring-violet-200', 'ring-teal-200', 'ring-orange-200', 'ring-indigo-200'];

const nameOf = (u) => u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Young thinker';

export default function YoungThinkersPage({ categories, renderGames, playLeft = null, completed, classNumber, stars, achievements, onProgress, onGroup }) {
  const user = useContext(LmsAuthContext)?.user;
  const [cat, setCat] = useState(categories[0].key);
  const pct = Math.round((Math.min(28, completed) / 28) * 100);

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-[#8fd3f7] via-[#c9ecfb] to-[#bfe6a6] font-[Nunito,ui-rounded,system-ui] shadow-xl ring-1 ring-sky-200" data-young-thinkers>
      {/* The banner, as drawn: the student's own details over the picture's places for them. */}
      {/* A phone (2026-11-14, "make the boy, girl and sign big"): its own cut of the picture — the sign and both
          children, the picture's sample details painted out — at full width; from md the whole picture with the
          student's details over its places. */}
      <div className="relative w-full">
        <picture>
          <source media="(max-width: 767px)" srcSet="/games/young/hero-mobile.jpg" />
          <img src="/games/young/hero.jpg" alt="Young Thinkers. Explore, play, build your brain!" className="block h-auto w-full" draggable="false" />
        </picture>
        {/* Each pill placed exactly over the picture's own (as % of the banner), a little larger so none shows through. */}
        <span className="absolute hidden min-w-0 items-center md:flex gap-[6%] overflow-hidden rounded-[1.1vw] bg-white px-[0.6%] shadow-md" style={{ left: '65.3%', top: '6%', width: '12.2%', height: '22.5%' }}>
          <span className="grid aspect-square h-[72%] shrink-0 place-items-center rounded-full bg-amber-100" style={{ fontSize: 'clamp(9px, 1.25vw, 22px)' }} aria-hidden>🧒</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-black text-[#1b2456]" style={{ fontSize: 'clamp(7px, 0.95vw, 16px)' }}>{nameOf(user)}</span>
            <span className="block truncate font-bold text-slate-600" style={{ fontSize: 'clamp(6px, 0.78vw, 13px)' }}>{classNumber ? `Class ${classNumber}` : 'Young Thinker'}</span>
          </span>
        </span>
        <span className="absolute hidden items-center justify-center gap-[6%] overflow-hidden rounded-[1.1vw] bg-white shadow-md md:flex" style={{ left: '77.8%', top: '6%', width: '8.1%', height: '22.5%' }}>
          <Star className="shrink-0 fill-amber-400 text-amber-500" style={{ width: 'clamp(10px, 1.7vw, 30px)', height: 'clamp(10px, 1.7vw, 30px)' }} aria-hidden />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-black text-[#1b2456] tabular-nums" style={{ fontSize: 'clamp(7px, 1vw, 17px)' }}>{stars.toLocaleString('en-IN')}</span>
            <span className="block font-bold text-slate-600" style={{ fontSize: 'clamp(6px, 0.75vw, 12px)' }}>Stars</span>
          </span>
        </span>
        {/* Today's play time left, written plainly on the sign's yellow bar (2026-11-17, the user). */}
        {playLeft && (
          <span className="absolute hidden items-center justify-center text-center font-black text-[#1b2456] tabular-nums md:flex" style={{ left: '48.5%', top: '64.5%', width: '19%', height: '14%', fontSize: 'clamp(8px, 1.15vw, 20px)' }} role="timer">
            {playLeft}
          </span>
        )}
        {/* No achievements box or button here (2026-11-14, the user): that corner is sky. */}
      </div>
      {playLeft && <p className="px-3 pt-2 text-center text-sm font-black text-[#1b2456] tabular-nums md:hidden" role="timer">⏱ {playLeft}</p>}
      <div className="flex items-stretch gap-2 px-2 pt-2 md:hidden" data-young-details>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-2.5 py-2 shadow-md">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xl" aria-hidden>🧒</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-black text-[#1b2456]">{nameOf(user)}</span>
            <span className="block truncate text-xs font-bold text-slate-600">{classNumber ? `Class ${classNumber}` : 'Young Thinker'}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-2.5 py-2 shadow-md">
          <Star className="h-6 w-6 fill-amber-400 text-amber-500" aria-hidden />
          <span className="leading-tight"><span className="block text-[15px] font-black text-[#1b2456] tabular-nums">{stars.toLocaleString('en-IN')}</span><span className="block text-[11px] font-bold text-slate-600">Stars</span></span>
        </span>
        <button type="button" onClick={onProgress} className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-2.5 py-2 text-left shadow-md" aria-label="My achievements">
          <Trophy className="h-6 w-6 fill-amber-300 text-amber-500" aria-hidden />
          <span className="leading-tight"><span className="block text-[15px] font-black text-[#1b2456] tabular-nums">{achievements}</span><span className="block text-[11px] font-bold text-slate-600">Badges</span></span>
        </button>
      </div>

      {/* The board: four tabs, then the category's seven games. */}
      {/* On a phone (2026-11-14, the user): the tabs are their own strip, one row scrolling sideways, apart from the cards;
          from lg they sit in the board's top row, as drawn. */}
      <div className="relative z-10 mx-2 mt-2 lg:mx-6 lg:-mt-1 lg:rounded-[22px] lg:bg-white/85 lg:p-4 lg:shadow-lg lg:ring-1 lg:ring-white lg:backdrop-blur-sm">
        {/* A phone: the games page's own category chips, one row scrolling sideways (as before, 2026-11-14). */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Game categories">
          {categories.map((c) => {
            const on = c.key === cat;
            const Icon = c.icon;
            return (
              <button key={c.key} type="button" role="tab" aria-selected={on} onClick={() => setCat(c.key)} data-young-category={c.key}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-full py-2 pr-5 pl-2 text-sm font-black transition-colors ${on ? `bg-gradient-to-r text-white shadow-md ${c.band || 'from-violet-500 to-indigo-600'}` : 'bg-white text-ink-700 ring-1 ring-line-200'}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${on ? 'bg-white/25' : 'bg-violet-50 text-violet-600'}`}>
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                </span>
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="hidden lg:grid lg:grid-cols-4 lg:gap-2" role="tablist" aria-label="Game categories">
          {categories.map((c) => {
            const on = c.key === cat;
            return (
              <button key={c.key} type="button" role="tab" aria-selected={on} onClick={() => setCat(c.key)} data-young-category={c.key}
                className={`relative flex min-h-12 items-center justify-center gap-2 rounded-2xl px-2 py-2 text-base font-black transition ${on ? 'bg-[#cfe6ff] text-[#1e3a8a] shadow-inner' : 'bg-[#f3f6fb] text-[#1b2456] hover:bg-[#e8f1fe]'}`}>
                <img src={`/games/young/${ICON[c.key]}`} alt="" aria-hidden className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" />
                <span className="min-w-0 leading-tight">{c.name}</span>
                {on && <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-1 rounded-full bg-[#2563eb]" />}
              </button>
            );
          })}
        </div>

        {/* The same cards and layout as the other sections (2026-11-14, the user): 4 a row, then 3. */}
        <div className="mt-4 lg:mt-3">{renderGames(cat)}</div>
      </div>

      {/* Bottom row on the grass: progress (opens My progress), a cheer, Group Games. */}
      <div className="relative">
        <img src="/games/young/grass.jpg" alt="" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full object-cover object-top opacity-90" />
        <div className="relative grid grid-cols-1 gap-3 px-2 pt-4 pb-4 sm:px-6 md:grid-cols-[1fr_1.4fr_1fr]">
          <button type="button" onClick={onProgress} className="flex items-center gap-3 rounded-2xl bg-[#fff8e6] px-3 py-2.5 text-left shadow-lg ring-2 ring-amber-200 hover:bg-[#fff3d4]" data-young-progress>
            <img src="/games/young/trophy.png" alt="" aria-hidden className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black text-[#1b2456]">Your Progress</span>
              <span className="block text-sm font-bold text-slate-600">{Math.min(28, completed)} / 28 Games Completed</span>
              <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-amber-100"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500" style={{ width: `${pct}%` }} /></span>
            </span>
          </button>
          <div className="flex items-center justify-center gap-3 rounded-full bg-[#fffbe8] px-4 py-2.5 text-center shadow-lg ring-4 ring-amber-200">
            <span aria-hidden className="text-3xl">⭐</span>
            <span className="min-w-0">
              <span className="block text-base font-black text-[#1b2456] sm:text-lg">You’re doing great, little champ!</span>
              <span className="block text-xs font-bold text-slate-600 sm:text-sm">Keep playing to unlock more achievements!</span>
            </span>
            <span aria-hidden className="text-3xl">⭐</span>
          </div>
          <button type="button" onClick={onGroup} className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#7c4dff] to-[#9b51e0] px-4 py-3 text-left text-white shadow-lg ring-2 ring-violet-300 hover:brightness-110" data-young-group>
            <Users className="h-10 w-10 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black">Group Games</span>
              <span className="block text-sm font-bold text-white/85">Play with Friends</span>
            </span>
            <ChevronRight className="h-7 w-7 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
