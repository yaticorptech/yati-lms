/**
 * @description Role-to-skill roadmap: readiness, what you have, what to learn.
 *
 * The half of the section that is about the student rather than about the
 * listings — which is why it sits above the results rather than beside them.
 */
import { Link } from 'react-router-dom';
import { Target, GraduationCap, ArrowRight, Compass } from 'lucide-react';

const TONES = {
    have: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    learn: 'bg-amber-50 text-amber-700 border-amber-100',
    nice: 'bg-slate-50 text-slate-600 border-slate-200'
};

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
        <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GraduationCap size={14} className="text-indigo-500" /> Learn these here
            </h4>
            <div className="space-y-2">
                {[...byCourse.entries()].map(([courseId, course]) => (
                    <Link
                        key={courseId}
                        to={`/preview/${courseId}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 group hover:border-indigo-300 transition-colors"
                    >
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">{course.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Covers {course.skills.join(', ')}
                            </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
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
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 group hover:border-emerald-300 transition-colors">
                <span className="flex items-center gap-2 text-sm text-emerald-800">
                    <Compass size={15} className="shrink-0 text-emerald-600" />
                    This is your Career Path goal — your roadmap turns these skills into daily tasks.
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    Open Career Path
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        );
    }

    if (careerGoal === null) {
        return (
            <Link to="/career/onboarding"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 group hover:border-indigo-300 transition-colors">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                    <Compass size={15} className="shrink-0 text-indigo-600" />
                    Want a day-by-day plan for this role? Career Path builds one and tracks you through it.
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                    Build my roadmap
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        );
    }

    return null;
};

const Group = ({ title, skills, variant }) => {
    if (!skills?.length) return null;
    return (
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
            <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                    <span key={s} className={`text-xs font-medium border px-2.5 py-1 rounded-lg ${TONES[variant]}`}>
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
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-1">
                    <Target size={18} className="text-indigo-600" /> {unrecognizedRole}
                </h3>
                <p className="text-sm text-slate-500">
                    That role isn&apos;t in the skill library yet, so the jobs below are matched on your
                    skills and title keywords. Pick one of the suggested roles for a full skill-gap breakdown.
                </p>
            </div>
        );
    }

    if (!gap) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-1">
                <Target size={18} className="text-indigo-600" /> Becoming a {gap.role}
            </h3>
            <p className="text-sm text-slate-500 mb-4">{gap.blurb}</p>

            <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${gap.readiness}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700 tabular-nums shrink-0">{gap.readiness}% ready</span>
            </div>

            <div className="space-y-4">
                <Group title="Skills you already have" skills={gap.have} variant="have" />
                <Group title="Skills to learn (core)" skills={gap.learn} variant="learn" />
                <Group title="Nice to have" skills={gap.nice} variant="nice" />
                <Group title="Trending in current listings" skills={gap.trending} variant="nice" />
            </div>

            <TeachBlock teach={gap.teach} />

            <CareerPathLink role={gap.role} careerGoal={careerGoal} enabled={careerPathEnabled} />

            {gap.advice && <p className="text-sm text-slate-500 mt-5 pt-4 border-t border-slate-100">{gap.advice}</p>}
        </div>
    );
}
