/**
 * "Continue: <course> · Resume" — one line under the Dashboard's welcome
 * banner, for the student who logged in to carry on with a course.
 *
 * The Dashboard greeted them, showed the leaderboard, the wallet and the
 * course shop, and the course they were halfway through was a page away on
 * My Courses. The course is picked the way My Courses picks its Resume button
 * (pages/EnrolledCourses.jsx): the furthest-along one that is started and not
 * finished. Nothing at all is drawn when there is no such course.
 */
import { Link } from 'react-router-dom';
import { PlayCircle, ArrowRight } from 'lucide-react';

/** The one to go back to: the furthest-along course that is not finished. */
const courseToResume = (courses = []) => courses
    .filter((c) => (c.progress || 0) > 0 && (c.progress || 0) < 100)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0] || null;

export default function ContinueStrip({ courses }) {
    const course = courseToResume(courses);
    if (!course) return null;
    const percent = Math.round(course.progress || 0);
    return (
        <Link
            to={`/learn/${course._id}`}
            data-continue-strip
            className="group flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                <PlayCircle size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">
                    <span className="text-indigo-600">Continue:</span> {course.title}
                </span>
                <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-32" aria-hidden="true">
                        <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-slate-500">{percent}% done</span>
                </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-indigo-600">
                Resume <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
