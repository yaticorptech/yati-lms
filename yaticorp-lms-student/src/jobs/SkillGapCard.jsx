/**
 * @description Role-to-skill roadmap: readiness, what you have, what to learn.
 *
 * The half of the section that is about the student rather than about the
 * listings — which is why it sits above the results rather than beside them,
 * and why it is the one dark card on the page: it is the destination the
 * white listing cards below are steps towards.
 */
import { Link } from 'react-router-dom';
import { Target, GraduationCap, ArrowRight, Compass } from 'lucide-react';

const TONES = {
    have: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
    learn: 'bg-white text-amber-700 border-white',
    nice: 'bg-white/90 text-slate-700 border-white/90',
    trending: 'bg-white/10 text-white border-white/20'
};

const SHELL = 'relative overflow-hidden rounded-2xl p-6 mb-5 text-white bg-gradient-to-br from-[#1b1f5e] via-[#1e2a7a] to-[#123a8c] shadow-lg shadow-indigo-900/20';

/* A thin spectrum along the top edge and a faint dot grid — the card's
   texture, kept in one place so the two states of the card share it. */
const Backdrop = () => (
    <>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:18px_18px]" />
    </>
);

/**
 * The gap's skills, grouped by the published course that teaches them.
 *
 * Grouped by course rather than by skill because the action is per course —
 * one enrol decision may close several gaps at once, and saying so is the
 * whole sell.
 */
const TeachBlock = ({ teach }) => {
    if (!teach?.length) return null;

    const byCourse = new Map();
    for (const t of teach) {
        if (!byCourse.has(t.courseId)) byCourse.set(t.courseId, { title: t.title, skills: [] });
        byCourse.get(t.courseId).skills.push(t.skill);
    }

    return (
        <div className="mt-6 border-t border-white/10 pt-5">
            <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                <GraduationCap size={14} className="text-sky-300" /> Learn these here
            </h4>
            <div className="space-y-2">
                {[...byCourse.entries()].map(([courseId, course]) => (
                    <Link
                        key={courseId}
                        to={`/preview/${courseId}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 transition-colors hover:bg-white/15"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{course.title}</p>
                            <p className="mt-0.5 text-xs text-white/60">
                                Covers {course.skills.join(', ')}
                            </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-sky-200">
                            We teach this
                            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

/**
 * Where this gap meets the student's Career Path.
 *
 * Three honest states. Searching the very role their roadmap is built for →
 * point at the roadmap, which turns these missing skills into daily tasks.
 * No Career Path yet → offer to build one for this role. Searching some OTHER
 * role than their goal → say nothing: exploring is not a commitment, and a
 * card that nags "but your goal is X" would teach students not to explore.
 * Gated on the admin lock — never a door to a section that bounces.
 */
const CareerPathLink = ({ role, careerGoal, enabled }) => {
    // undefined = not learned yet this visit; stay silent rather than offer
    // to build a roadmap the student may already have.
    if (!enabled || careerGoal === undefined) return null;

    const sameGoal = careerGoal &&
        careerGoal.trim().toLowerCase() === String(role || '').trim().toLowerCase();

    if (sameGoal) {
        return (
            <Link to="/career"
                className="group mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 transition-colors hover:bg-emerald-400/25">
                <span className="flex items-center gap-2 text-sm text-emerald-50">
                    <Compass size={15} className="shrink-0 text-emerald-300" />
                    This is your Career Path goal — your roadmap turns these skills into daily tasks.
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-200">
                    Open Career Path
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        );
    }

    if (careerGoal === null) {
        return (
            <Link to="/career/onboarding"
                className="group mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 transition-colors hover:bg-white/15">
                <span className="flex items-center gap-2 text-sm text-white/90">
                    <Compass size={15} className="shrink-0 text-sky-300" />
                    Want a day-by-day plan for this role? Career Path builds one and tracks you through it.
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-sky-200">
                    Build my roadmap
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        );
    }

    return null;
};

const Group = ({ title, skills, variant, marker = '—' }) => {
    if (!skills?.length) return null;
    return (
        <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                <span aria-hidden="true" className={variant === 'trending' ? 'text-sky-400' : 'text-white/40'}>{marker}</span>
                {title}
            </h4>
            <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                    <span key={s} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${TONES[variant]}`}>
                        {variant === 'have' ? '✓ ' : ''}{s}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default function SkillGapCard({ gap, unrecognizedRole, careerGoal, careerPathEnabled = true }) {
    if (unrecognizedRole) {
        return (
            <div className={SHELL}>
                <Backdrop />
                <div className="relative">
                    <h3 className="mb-1 flex items-center gap-2.5 text-xl font-bold">
                        <Target size={20} className="text-sky-300" /> {unrecognizedRole}
                    </h3>
                    <p className="text-sm text-white/70">
                        That role isn&apos;t in the skill library yet, so the jobs below are matched on your
                        skills and title keywords. Pick one of the suggested roles for a full skill-gap breakdown.
                    </p>
                </div>
            </div>
        );
    }

    if (!gap) return null;

    return (
        <div className={SHELL}>
            <Backdrop />
            <div className="relative">
                <h3 className="mb-1 flex items-center gap-2.5 text-xl font-bold sm:text-2xl">
                    <Target size={20} className="shrink-0 text-sky-300" /> Becoming a {gap.role}
                </h3>
                <p className="mb-5 text-sm text-white/70 sm:text-base">{gap.blurb}</p>

                <div className="mb-6 flex items-center gap-4">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
                            style={{ width: `${gap.readiness}%` }} />
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{gap.readiness}% ready</span>
                </div>

                <div className="space-y-5">
                    <Group title="Skills you already have" skills={gap.have} variant="have" />
                    <Group title="Skills to learn (core)" skills={gap.learn} variant="learn" />
                    <Group title="Nice to have" skills={gap.nice} variant="nice" />
                    <Group title="Trending in current listings" skills={gap.trending} variant="trending" marker="●" />
                </div>

                <TeachBlock teach={gap.teach} />

                <CareerPathLink role={gap.role} careerGoal={careerGoal} enabled={careerPathEnabled} />

                {gap.advice && <p className="mt-6 border-t border-white/10 pt-4 text-sm text-white/70">{gap.advice}</p>}
            </div>
        </div>
    );
}
