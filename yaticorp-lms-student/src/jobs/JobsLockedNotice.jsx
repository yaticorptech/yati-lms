/**
 * @description The popup a student meets at /jobs while a course is still
 *              pending. Drawn to the supplied mock: lock in a peach disc with
 *              faint rings and sparkles, soft blobs in the corners, a round
 *              close button and one big gradient action.
 */
import { Link } from 'react-router-dom';
import { Lock, BookOpen, ArrowRight, X } from 'lucide-react';

export default function JobsLockedNotice({ total = 0 }) {
    // Same title in every case. The second line only changes for a student who
    // has already enrolled, so nobody mid-course is told to enrol again.
    const enrolled = total > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white px-8 pb-10 pt-12 text-center shadow-2xl sm:px-12">
                {/* corner blobs */}
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-100/80 blur-2xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-orange-100/70 blur-2xl" />

                {/* close */}
                <Link
                    to="/"
                    aria-label="Close"
                    className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50/80 text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                    <X size={22} strokeWidth={2.5} />
                </Link>

                {/* lock with rings and sparkles */}
                <div className="relative mx-auto mb-8 h-44 w-44">
                    <span aria-hidden="true" className="absolute inset-0 rounded-full border border-indigo-100/80" />
                    <span aria-hidden="true" className="absolute inset-4 rounded-full border border-indigo-100" />
                    <span aria-hidden="true" className="absolute inset-8 rounded-full bg-indigo-50/60 blur-sm" />
                    <div className="animate-pop-in absolute inset-9 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-100 shadow-lg shadow-orange-100">
                        <Lock size={52} strokeWidth={2} className="text-orange-400" />
                    </div>
                    <span aria-hidden="true" className="absolute left-3 top-6 h-2.5 w-2.5 rounded-full bg-indigo-300" />
                    <span aria-hidden="true" className="absolute right-2 top-1/2 h-2 w-2 rounded-full bg-indigo-300" />
                    <span aria-hidden="true" className="absolute left-7 top-1/2 h-2 w-2 rounded-full bg-orange-300" />
                    <span aria-hidden="true" className="absolute right-4 top-4 text-xl text-orange-300">✦</span>
                    <span aria-hidden="true" className="absolute bottom-6 left-0 text-xl text-indigo-300">✦</span>
                </div>

                <h2 className="relative mb-3 text-3xl font-extrabold text-slate-800 sm:text-4xl">Finish a course first</h2>
                <p className="relative mx-auto mb-8 max-w-sm text-lg text-slate-500">
                    {enrolled
                        ? 'Complete your course — the Jobs section opens after that.'
                        : 'Enrol in a course and complete it — the Jobs section opens after that.'}
                </p>

                <Link
                    to="/"
                    className="relative flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-4 text-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-violet-700"
                >
                    <BookOpen size={26} />
                    <span>{enrolled ? 'Continue my course' : 'Browse courses'}</span>
                    <ArrowRight size={26} />
                </Link>
            </div>
        </div>
    );
}
