import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, PlayCircle } from 'lucide-react';

/**
 * The one thing a returning student should do next.
 *
 * Deliberately the largest element on the dashboard: it is the difference
 * between arriving at a list of everything and arriving at the next step. Shows
 * only what the course actually carries — thumbnail, title, description and the
 * progress already tracked. A course without a thumbnail gets a treated panel
 * rather than a gap, and nothing here is filled in with placeholder text.
 *
 * Renders nothing when there is no course in progress; the dashboard shows its
 * own empty state in that case rather than an empty hero.
 */
export default function ContinueLearningCard({ course, progress }) {
  if (!course) return null;

  const pct = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <section className="animate-fade-in-up overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_1.25fr]">
        <div className="relative aspect-video overflow-hidden bg-surface-100 md:aspect-auto md:min-h-[15rem]">
          {course.thumbnail ? (
            <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-violet-600 text-white/70">
              <BookOpen size={52} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div>
            <p className="flex items-center gap-1.5 text-[0.68rem] font-bold tracking-[0.12em] text-link uppercase">
              <PlayCircle className="h-3.5 w-3.5" />
              Continue learning
            </p>
            <h2 className="mt-2 text-xl leading-snug font-bold text-ink-900 sm:text-2xl">
              {course.title}
            </h2>
            {course.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
                {course.description}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink-600">Your progress</span>
              <span className="text-lg font-black text-ink-900 tabular-nums">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${course.title} progress`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <Link
            to={`/learn/${course._id}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-auto sm:self-start"
          >
            Continue Learning
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
