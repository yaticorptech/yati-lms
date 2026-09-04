import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';

/**
 * 🏆 The banner that closes the skills page.
 *
 * One number, and it is a real one: the mean progress across every tracked
 * skill, the same figure the Overview's skill card reports. The ring is drawn
 * from it rather than being a decorative arc — a fake dial under the words
 * "Overall Skill Progress" would be the one thing on this page a student could
 * not check.
 */
export default function SkillsBanner({ percent = 0 }) {
  const shown = useCountUp(percent, 1100);

  const size = 92;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 p-6 text-white shadow-float sm:p-8">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-amber-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-fuchsia-300/25 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
        <span className="animate-badge-burst shrink-0 text-6xl sm:text-7xl" aria-hidden>
          🏆
        </span>

        <div className="min-w-0 flex-1 text-center lg:text-left">
          <h2 className="text-xl leading-tight font-black sm:text-2xl">
            Level up your skills, level up your future!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pink-100 lg:mx-0">
            Consistency is your superpower. Keep building, keep growing, and unlock your dream
            career.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row">
          <div className="rounded-2xl bg-white/95 px-5 py-4 text-center shadow-lg">
            <p className="text-[0.68rem] font-black tracking-wide text-ink-500 uppercase">
              Overall skill progress
            </p>
            <div className="relative mx-auto mt-2" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  className="stroke-surface-200"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  stroke="#7c3aed"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums text-ink-900">
                {shown}%
              </span>
            </div>
          </div>

          <Link
            to="/career/profile"
            className="fp-press group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-purple-700 shadow-lg transition-transform hover:scale-[1.03]"
          >
            View my progress
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
