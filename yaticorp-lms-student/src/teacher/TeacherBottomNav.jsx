/**
 * The teacher's phone bottom bar, in the students' style (components/
 * MobileBottomNav.jsx): a light floating island (white since 2026-11-02, was
 * dark), the open tab in emerald — the teacher side's colour — with a bolder
 * icon and a small dot under its label. It shares the students' motion
 * (mobileBottomNav.css) and steps aside while the keyboard is up. The last
 * tab is their profile, with their photo (2026-11-02), as on the student side.
 */
import { Link, useLocation } from 'react-router-dom';
import useKeyboardOpen from '../native/useKeyboardOpen';
import { TeacherAvatar } from './ui';
import '../components/mobileBottomNav.css';

/** `items`: [{ to, label, short, icon, end }]; `teacher` for the profile tab's photo. */
export default function TeacherBottomNav({ items, teacher }) {
    const { pathname } = useLocation();
    const keyboardOpen = useKeyboardOpen();
    const isActive = (item) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

    return (
        <nav aria-label="Teacher shortcuts" data-keyboard-open={keyboardOpen || undefined}
            className={`mbn-in fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sidebar:hidden ${keyboardOpen ? 'hidden' : ''}`}>
            <div className="mbn-island relative mx-auto flex max-w-lg items-stretch gap-1 rounded-[28px] border border-slate-200/70 bg-white p-1.5">
                {items.map((item) => {
                    const active = isActive(item);
                    return (
                        <Link key={item.to} to={item.to} aria-label={item.label} aria-current={active ? 'page' : undefined}
                            className={`mbn-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] pb-1.5 pt-2 text-[0.6rem] tracking-tight transition-colors ${active ? 'font-bold text-emerald-700' : 'font-semibold text-slate-500 active:text-slate-700'}`}>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                <item.icon size={21} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                            </span>
                            <span className="max-w-full truncate whitespace-nowrap text-center leading-none">{item.short || 'Home'}</span>
                            {/* The only "you are here": a small dot under the label. */}
                            <span aria-hidden className={`h-1 w-1 rounded-full ${active ? 'bg-emerald-600' : 'bg-transparent'}`} />
                        </Link>
                    );
                })}
                {(() => {
                    const active = pathname === '/teacher/profile';
                    return (
                        <Link to="/teacher/profile" aria-label="My profile" aria-current={active ? 'page' : undefined}
                            className={`mbn-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] pb-1.5 pt-2 text-[0.6rem] tracking-tight transition-colors ${active ? 'font-bold text-emerald-700' : 'font-semibold text-slate-500 active:text-slate-700'}`}>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 transition-all ${active ? 'ring-emerald-500' : 'ring-slate-200'}`}>
                                <TeacherAvatar teacher={teacher} className="h-6 w-6 text-[9px]" />
                            </span>
                            <span className="max-w-full truncate whitespace-nowrap text-center leading-none">Profile</span>
                            <span aria-hidden className={`h-1 w-1 rounded-full ${active ? 'bg-emerald-600' : 'bg-transparent'}`} />
                        </Link>
                    );
                })()}
            </div>
        </nav>
    );
}
