/**
 * The brand panel beside the sign-in and sign-up forms (desktop only):
 * the logo, the AI card turning over to show its QR side, and a short pitch.
 */
import React from 'react';

const AuthBrandPanel = ({ side = 'left', eyebrow, title, text, points = [] }) => (
    <aside aria-hidden="true"
        className={`relative hidden overflow-hidden border-white/[0.06] bg-[#1c2035] p-10 lg:flex lg:flex-col ${side === 'right' ? 'border-l' : 'border-r'}`}>
        <span className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-[90px]" />
        <span className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-violet-500/15 blur-[90px]" />
        <img src="/assets/YATICORP.png" alt="" className="relative h-7 w-auto self-start object-contain" />

        {/* The real AI card, turning a full circle: front, then the QR side. */}
        <div className="relative mx-auto my-10 [perspective:1400px]">
            <div className="[transform:rotateX(8deg)_rotateZ(-2deg)] [transform-style:preserve-3d]">
                <div className="auth-card-spin relative h-[200px] w-[316px] [transform-style:preserve-3d]">
                    <img src="/assets/ai-card-front.jpg" alt="" draggable="false"
                        className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-[0_30px_60px_-20px_rgba(37,99,235,0.55)] ring-1 ring-white/15 [backface-visibility:hidden]" />
                    <img src="/assets/ai-card-back.jpg" alt="" draggable="false"
                        className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-[0_30px_60px_-20px_rgba(37,99,235,0.55)] ring-1 ring-white/15 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
                </div>
            </div>
            {/* Soft shadow on the "floor" under the card. */}
            <span className="pointer-events-none absolute -bottom-8 left-1/2 h-6 w-56 -translate-x-1/2 rounded-[50%] bg-black/50 blur-xl" />
        </div>

        <div className="relative mt-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">{eyebrow}</p>
            <h1 className="mt-3 text-[26px] font-semibold leading-[1.2] tracking-tight text-white">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">{text}</p>
            <ul className="mt-7 space-y-3 text-sm text-slate-300">
                {points.map(([Icon, t]) => (
                    <li key={t} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-indigo-300 ring-1 ring-white/10"><Icon size={14} /></span>{t}
                    </li>
                ))}
            </ul>
        </div>
    </aside>
);

export default AuthBrandPanel;
