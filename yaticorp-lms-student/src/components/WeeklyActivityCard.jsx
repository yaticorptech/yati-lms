import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import StreakPanel from '../career/components/dashboard/StreakPanel';
import useCountUp from '../hooks/useCountUp';

/**
 * The Dashboard's Weekly activity tab: one card, Career Path's learning streak.
 *
 * The streak panel is the one Career Path's Overview shows (StreakPanel): the
 * run of days, the last seven as dated tiles, and the week's quests. What the
 * student has finished on the LMS side — courses and certificates, which the
 * old weekly card counted and nothing else on the Dashboard does — sits inside
 * the same card, under the streak number. It once had a violet card of its
 * own beside this one; two cards for one week of activity was one too many.
 *
 * Wrapped in the Career Path scope, without its page background (as
 * CareerProviders' `embedded` does), because the panel's typeface and its
 * flame's flicker live there.
 */
export default function WeeklyActivityCard({ streak, activity, weekly, careerOn, completedCourses = 0, certificates = 0 }) {
    const shownCourses = useCountUp(completedCourses, 900);
    const shownCertificates = useCountUp(certificates, 900);
    const tiles = [
        { key: 'courses', emoji: '🎓', value: shownCourses, label: completedCourses === 1 ? 'Course completed' : 'Courses completed', to: '/enrolled-courses' },
        { key: 'certificates', emoji: '🏆', value: shownCertificates, label: certificates === 1 ? 'Certificate' : 'Certificates', to: '/profile#certificates' }
    ];

    const finished = (
        <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
                {tiles.map((tile, i) => (
                    <Link
                        key={tile.key}
                        to={tile.to}
                        style={{ animationDelay: `${0.45 + i * 0.12}s` }}
                        className="animate-pop-in group flex items-center gap-2.5 rounded-2xl bg-surface/80 p-3 ring-1 ring-amber-100 ring-inset backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                        <span className="fp-bob-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-lg sm:h-10 sm:w-10 sm:text-xl" style={{ animationDelay: `${i * -0.8}s` }} aria-hidden>
                            {tile.emoji}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-2xl leading-none font-black tabular-nums text-ink-900">{tile.value}</span>
                            {/* Wraps rather than truncates: a phone's half-width tile
                                cut "Courses completed" to "Course…". */}
                            <span className="mt-1 block text-xs leading-snug font-bold text-ink-500">
                                {tile.label}
                                <ArrowRight className="ml-1 hidden h-3 w-3 align-[-2px] text-ink-300 sm:inline transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </span>
                    </Link>
                ))}
            </div>
            <p className="animate-fade-in-up mt-3 text-xs font-medium text-ink-500" style={{ animationDelay: '0.65s' }}>
                {completedCourses > 0
                    ? 'Every course you finish adds a certificate to your profile.'
                    : 'Finish your first course to earn its certificate.'}
            </p>
        </div>
    );

    return (
        <div className="futurepath" style={{ background: 'none' }}>
            <section className="animate-fade-in-up overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card">
                <StreakPanel streak={streak} activity={activity} weekly={weekly} extra={finished}>
                    {/* The tiles come from the rewards streak when rewards are
                        on, and from Career Path's daily tasks when not. With
                        neither, they can only ever be empty, so say why. */}
                    {!careerOn && (
                        <p className="animate-fade-in-up mt-4 border-t border-line-100 pt-3.5 text-sm text-ink-500" style={{ animationDelay: '0.7s' }}>
                            Turn on Career Path to track your daily activity here.
                        </p>
                    )}
                </StreakPanel>
            </section>
        </div>
    );
}
