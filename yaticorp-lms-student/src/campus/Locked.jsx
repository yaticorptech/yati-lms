/**
 * Campus features that are built or planned but not opened yet (2026-11-14): only attendance is
 * open. A locked feature shows greyed, with a lock and "Unlock soon", in every login.
 */
import { Lock } from 'lucide-react';

// Locked: greyed, with a small lock — no label (owner's call, 2026-11-14).
export const LockChip = ({ className = '' }) => (
    <span title="Locked" className={`inline-flex items-center justify-center text-slate-400 ${className}`}>
        <Lock size={11} strokeWidth={2.5} aria-label="Locked" />
    </span>
);

/** A card standing in for a locked feature: its name, what it will do, greyed. */
export const LockedCard = ({ icon: Icon, title, text, className = '' }) => (
    <section aria-disabled="true" className={`relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 grayscale ${className}`}>
        <div className="flex items-start gap-3 opacity-70">
            {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500"><Icon size={19} aria-hidden="true" /></span>}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-600">{title}</h2><LockChip /></div>
                {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
            </div>
        </div>
    </section>
);

/** A whole page that is locked. */
export const LockedPage = ({ icon: Icon, title, text }) => (
    <div className="mx-auto max-w-md py-16 text-center grayscale">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">{Icon ? <Icon size={24} aria-hidden="true" /> : <Lock size={24} aria-hidden="true" />}</span>
        <h2 className="mt-4 text-lg font-bold text-slate-700">{title}</h2>
        {text && <p className="mt-1.5 text-sm text-slate-500">{text}</p>}
        <LockChip className="mt-3" />
    </div>
);

/**
 * The real feature, shown but locked (2026-11-14): everything is visible, greyed and inert, with a
 * lock banner on top — so people see what is coming without being able to use it yet.
 */
export const LockedPreview = ({ title, children, className = '' }) => (
    <div className={`relative ${className}`}>
        <span title={title ? `${title} — locked` : 'Locked'} className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow ring-1 ring-slate-200"><Lock size={13} aria-label="Locked" /></span>
        <div inert="" aria-hidden="true" className="pointer-events-none select-none opacity-60 grayscale">{children}</div>
    </div>
);
