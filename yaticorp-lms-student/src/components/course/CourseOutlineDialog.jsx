import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen, PlayCircle, FileText, CheckSquare, Briefcase, ChevronDown, Lock, Award, ArrowRight, Layers, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import Portal from '../Portal';
import useBackClose from '../../native/useBackClose';

// The kinds of lesson, with the icons and words the course player uses.
const KINDS = {
    video: { Icon: PlayCircle, label: 'Video', many: 'videos', tone: 'text-emerald-600 bg-emerald-50' },
    reading: { Icon: FileText, label: 'Reading', many: 'readings', tone: 'text-rose-600 bg-rose-50' },
    quiz: { Icon: CheckSquare, label: 'Quiz', many: 'quizzes', tone: 'text-violet-600 bg-violet-50' },
    assignment: { Icon: Briefcase, label: 'Assignment', many: 'assignments', tone: 'text-sky-600 bg-sky-50' },
    lesson: { Icon: BookOpen, label: 'Lesson', many: 'lessons', tone: 'text-slate-500 bg-slate-100' }
};
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const price = (p) => (p > 0 ? `₹${p}` : 'Free');

/**
 * A course's Preview: what is inside it, for a student deciding whether to
 * enrol. Its sections, every lesson's title and kind, and the counts, read
 * from GET /user/courses/:id/outline, which sends nothing that plays.
 *
 * `initial` is what the page already knows about the course (its card: the
 * title, cover and price), shown at once while the outline loads. `onEnroll`
 * is the page's own way to enrol (the Dashboard opens its confirmation with
 * the price and wallet); a student who can open the course already (enrolled,
 * or through a bundle) gets "Open course" instead.
 */
export default function CourseOutlineDialog({ courseId, initial = {}, onClose, onEnroll }) {
    const [outline, setOutline] = useState(undefined);   // undefined while loading, null when it failed
    const [attempt, setAttempt] = useState(0);            // bumped by "Try again"
    const [open, setOpen] = useState(() => new Set([0]));

    useEffect(() => {
        let alive = true;
        api.get(`/user/courses/${courseId}/outline`)
            .then((r) => { if (alive) setOutline(r.data); })
            .catch(() => { if (alive) setOutline(null); });
        return () => { alive = false; };
    }, [courseId, attempt]);
    const retry = () => { setOutline(undefined); setAttempt((n) => n + 1); };

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    // Android's back button closes it, rather than leaving the page under it.
    useBackClose(onClose);

    const course = { ...initial, ...(outline?.course || {}) };
    const totals = outline?.totals;
    const toggle = (i) => setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
    });

    return (
        <Portal>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
                <div role="dialog" aria-modal="true" aria-labelledby="course-outline-title" onClick={(e) => e.stopPropagation()}
                    className="rw-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

                    {/* Cover: the course's picture, or the light one its card uses. */}
                    <div className="relative h-32 shrink-0 overflow-hidden sm:h-36">
                        {course.thumbnail ? (
                            <>
                                <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                            </>
                        ) : (
                            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50">
                                <span aria-hidden="true" className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-100/70" />
                                <span aria-hidden="true" className="absolute -bottom-12 right-6 h-36 w-36 rounded-full bg-fuchsia-100/60" />
                                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md shadow-indigo-100 ring-1 ring-indigo-100">
                                    <BookOpen size={26} />
                                </span>
                            </div>
                        )}
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-100 backdrop-blur">
                            Course preview
                        </span>
                        <button type="button" onClick={onClose} aria-label="Close"
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur transition-colors hover:text-slate-800">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-6">
                        <div className="flex items-start justify-between gap-3">
                            <h2 id="course-outline-title" className="text-xl font-black leading-snug text-slate-900">{course.title || 'Course'}</h2>
                            <span className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-black ${course.price > 0 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'bg-emerald-500 text-white'}`}>
                                {price(course.price)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500">by {course.instructor || 'YATICORP'}</p>

                        {/* What is in it, at a glance. */}
                        {totals && (
                            <ul className="mt-4 flex flex-wrap gap-2" aria-label="In this course">
                                <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                    <Layers size={13} aria-hidden="true" /> {count(totals.modules, 'section', 'sections')} · {count(totals.lessons, 'lesson', 'lessons')}
                                </li>
                                {['video', 'reading', 'quiz', 'assignment'].filter((k) => totals[k] > 0).map((k) => {
                                    const { Icon, label, many, tone } = KINDS[k];
                                    return (
                                        <li key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
                                            <Icon size={13} aria-hidden="true" /> {count(totals[k], label.toLowerCase(), many)}
                                        </li>
                                    );
                                })}
                                <li className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                    <Award size={13} aria-hidden="true" /> Certificate
                                </li>
                            </ul>
                        )}

                        {course.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{course.description}</p>}

                        <h3 className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-slate-400">What's inside</h3>
                        {outline === undefined ? (
                            <div className="mt-3 space-y-2" aria-label="Loading the course outline">
                                {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
                            </div>
                        ) : outline === null ? (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <span>We couldn't load what's in this course.</span>
                                <button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-rose-700 hover:text-rose-900">
                                    <RefreshCw size={14} /> Try again
                                </button>
                            </div>
                        ) : outline.modules.length === 0 ? (
                            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">The lessons for this course are still being added.</p>
                        ) : (
                            <ol className="mt-3 space-y-2">
                                {outline.modules.map((m, i) => {
                                    const isOpen = open.has(i);
                                    return (
                                        <li key={i} className="overflow-hidden rounded-2xl border border-slate-200">
                                            <button type="button" onClick={() => toggle(i)} aria-expanded={isOpen}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{i + 1}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-slate-900">{m.title}</span>
                                                    <span className="block text-xs text-slate-500">
                                                        {count(m.lessons.length, 'lesson', 'lessons')}
                                                        {m.dripDays > 0 && <> · <Lock size={10} className="inline align-[-1px]" aria-hidden="true" /> opens {count(m.dripDays, 'day', 'days')} after you enrol</>}
                                                    </span>
                                                </span>
                                                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                            </button>
                                            {isOpen && (
                                                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                                                    {m.description && <p className="py-1.5 text-xs leading-relaxed text-slate-500">{m.description}</p>}
                                                    {m.lessons.length === 0 ? (
                                                        <p className="py-2 text-xs text-slate-400">No lessons here yet.</p>
                                                    ) : (
                                                        <ul className="divide-y divide-slate-100">
                                                            {m.lessons.map((l, j) => {
                                                                const { Icon, label, tone } = KINDS[l.kind] || KINDS.lesson;
                                                                return (
                                                                    <li key={j} className="flex items-center gap-3 py-2">
                                                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={14} aria-hidden="true" /></span>
                                                                        <span className="min-w-0 flex-1 text-sm text-slate-700">{l.title}</span>
                                                                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    {/* The next step: enrol, or open it when it is already theirs. */}
                    <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
                            Close
                        </button>
                        {outline?.canOpen ? (
                            <Link to={`/learn/${courseId}`} onClick={onClose}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition-all hover:from-emerald-600 hover:to-teal-700">
                                Open course <ArrowRight size={16} />
                            </Link>
                        ) : onEnroll ? (
                            <button type="button" onClick={onEnroll} disabled={outline === undefined}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60">
                                Enroll Now{course.price > 0 ? ` · ${price(course.price)}` : ''} <ArrowRight size={16} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
