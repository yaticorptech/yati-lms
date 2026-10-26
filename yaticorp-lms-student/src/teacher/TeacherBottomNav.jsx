/**
 * The teacher's phone bottom bar, in the students' style (components/
 * MobileBottomNav.jsx): a floating dark bar whose gradient bubble slides to
 * the active icon — emerald here, the teacher side's colour. It shares the
 * students' motion (mobileBottomNav.css) and steps aside while the keyboard
 * is up.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useKeyboardOpen from '../native/useKeyboardOpen';
import '../components/mobileBottomNav.css';

const BUBBLE = { background: 'linear-gradient(135deg, #10b981, #0d9488)', boxShadow: '0 8px 20px -8px rgb(16 185 129 / 0.7), inset 0 1px 0 rgb(255 255 255 / 0.25)' };

/** `items`: [{ to, label, short, icon, end }]. */
export default function TeacherBottomNav({ items }) {
    const { pathname } = useLocation();
    const rowRef = useRef(null);
    const [bubble, setBubble] = useState(null);
    const keyboardOpen = useKeyboardOpen();

    const isActive = (item) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

    useEffect(() => {
        const measure = () => {
            const row = rowRef.current;
            const icon = row?.querySelector('[data-active-icon="true"]');
            if (!row || !icon) { setBubble(null); return; }
            const rowBox = row.getBoundingClientRect();
            const box = icon.getBoundingClientRect();
            setBubble({ left: box.left - rowBox.left, width: box.width });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [pathname, items.length]);

    return (
        <nav aria-label="Teacher shortcuts" data-keyboard-open={keyboardOpen || undefined}
            className={`mbn-in fixed inset-x-1.5 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 sidebar:hidden ${keyboardOpen ? 'hidden' : ''}`}>
            <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.8)]">
                <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div ref={rowRef} className="relative flex items-stretch px-0.5 pb-1.5 pt-1.5">
                    {bubble && <span aria-hidden className="mbn-bubble" style={{ left: bubble.left, width: bubble.width, ...BUBBLE }} />}
                    {items.map((item) => {
                        const active = isActive(item);
                        return (
                            <Link key={item.to} to={item.to} aria-label={item.label} aria-current={active ? 'page' : undefined}
                                className={`mbn-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 px-0 pb-1.5 pt-0.5 text-[0.62rem] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-white' : 'text-slate-400'}`}>
                                <span data-active-icon={active || undefined} key={active ? `${item.to}-on` : `${item.to}-off`}
                                    className={`flex h-10 w-full max-w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${active ? 'mbn-icon-active text-white' : 'text-slate-400'}`}>
                                    <item.icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                                </span>
                                <span className="whitespace-nowrap text-center leading-none">{item.short || 'Home'}</span>
                                {active && <span aria-hidden className="mbn-dot absolute bottom-0 h-1 w-1 rounded-full bg-emerald-300" />}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
