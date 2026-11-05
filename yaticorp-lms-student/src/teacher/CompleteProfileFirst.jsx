/** In place of a page until a teacher without a card completes their profile (./profileGate.js). */
import { Link } from 'react-router-dom';
import { UserCheck, ArrowRight } from 'lucide-react';
import { btn } from './kit';

const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export default function CompleteProfileFirst({ missing }) {
    return (
        <section role="status" className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><UserCheck size={22} aria-hidden="true" /></span>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Complete your profile first</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Add your {listOf(missing)} to start using your dashboard.</p>
            <Link to="/teacher/profile" className={`${btn.primary} mt-5`}>Complete profile <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
    );
}
