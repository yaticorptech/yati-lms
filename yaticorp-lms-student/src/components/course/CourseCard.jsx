import { Link } from 'react-router-dom';
import { BookOpen, PlayCircle, CheckCircle2 } from 'lucide-react';

/**
 * One course, as a piece of content rather than a row in a table.
 *
 * Everything shown comes from the course the API returned — title, thumbnail,
 * description, progress. Nothing is invented: a course with no thumbnail gets a
 * treated placeholder rather than a broken image, and a course with no
 * description simply has no description line.
 *
 * `to` and `action` are supplied by the page, because an enrolled course and an
 * available one lead somewhere different and this card should not have to know
 * which context it is in.
 */
export default function CourseCard({ course, progress, to, action, footer }) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  const started = pct > 0;
  const done = pct === 100;

  const media = (
    <div className="relative aspect-video w-full overflow-hidden bg-surface-100">
      {course.thumbnail ? (
        <img
          src={course.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-violet-50 text-brand-300">
          <BookOpen size={40} strokeWidth={1.6} />
        </div>
      )}

      {done && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[0.68rem] font-bold text-white shadow-sm">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      )}

      <div className="absolute inset-0 flex items-center justify-center bg-ink-900/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex h-14 w-14 translate-y-3 items-center justify-center rounded-full bg-surface/90 text-link shadow-lg transition-transform duration-300 group-hover:translate-y-0">
          <PlayCircle size={30} />
        </span>
      </div>
    </div>
  );

  const body = (
    <div className="flex flex-1 flex-col gap-3 p-5">
      <div className="min-w-0">
        <h3 className="line-clamp-2 leading-snug font-bold text-ink-900 transition-colors group-hover:text-link">
          {course.title}
        </h3>
        {course.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {course.description}
          </p>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="mt-auto">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink-500">
              {done ? 'Finished' : started ? 'In progress' : 'Not started yet'}
            </span>
            <span className="text-sm font-bold text-link tabular-nums">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${course.title} progress`}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-100"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                done ? 'bg-emerald-500' : 'bg-brand-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {footer}
      {action && <div className="mt-auto pt-1">{action}</div>}
    </div>
  );

  const shell = 'lift group flex h-full flex-col overflow-hidden rounded-2xl border border-line-200 bg-surface shadow-card';

  return to ? (
    <Link to={to} className={shell}>
      {media}
      {body}
    </Link>
  ) : (
    <div className={shell}>
      {media}
      {body}
    </div>
  );
}
