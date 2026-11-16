/**
 * A Campus page that is locked for now (2026-11-14): only attendance, and what it needs
 * (departments and their logins, subjects, admissions), is open.
 */
import { Lock, ClipboardList, Wallet, Landmark, MessageSquareText, Radio, Inbox, Megaphone } from 'lucide-react';

const PAGES = {
    live: ['Live view', Radio, 'Watch any HOD’s or teacher’s dashboard as it happens: attendance being taken, classes, their students.'],
    requests: ['Admission requests', Inbox, 'Students who join with your organization ID choose their department and semester; the office accepts or edits each request.'],
    announcements: ['Announcements', Megaphone, 'Notices from the office or the examination board to students, teachers and HODs — one department or all.'],
    internals: ['Internal marks', ClipboardList, 'Each subject teacher enters the internal assessment marks for their own subject.'],
    fees: ['Fees', Wallet, 'The fee structure, receipts at the office, and examination fees.'],
    board: ['Examination', Landmark, 'Exam timetables, semester results, marks cards from an Excel upload, and promoting students to the next semester.'],
    feedback: ['Feedback', MessageSquareText, 'Anonymous feedback from students on their subjects and teachers.']
};
export default function Soon({ page }) {
    const [title, Icon, text] = PAGES[page] || ['Locked', Lock, ''];
    return (
        <div className="mx-auto max-w-lg py-20 text-center grayscale">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500"><Icon size={28} aria-hidden="true" /></span>
            <h1 className="mt-5 text-xl font-bold text-slate-700">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
            <Lock size={16} className="mx-auto mt-4 text-slate-400" aria-label="Locked" />
        </div>
    );
}
