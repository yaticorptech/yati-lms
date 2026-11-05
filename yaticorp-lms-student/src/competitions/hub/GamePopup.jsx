/**
 * A game's card pressed (2026-11-04): its picture on a dark 3D card that tilts toward the pointer, what it is, how
 * many play, its format, and its rules and regulations. Escape, the ✕ or the dark around it closes it.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Users, Layers, ScrollText, Trophy, ArrowRight } from 'lucide-react';
import Portal from '../../components/Portal';

export default function GamePopup({ game, onClose }) {
    const card = useRef(null);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const tilt = (e) => {
        const el = card.current;
        if (!el || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
        el.style.setProperty('--gx', `${(x + 0.5) * 100}%`); el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    };
    const untilt = () => { if (card.current) card.current.style.transform = ''; };
    return (
        <Portal>
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#05061a]/80 p-3 backdrop-blur-md [perspective:1400px] sm:p-6" onClick={onClose} data-game-popup={game.id}>
                <div ref={card} onClick={(e) => e.stopPropagation()} onPointerMove={tilt} onPointerLeave={untilt} role="dialog" aria-modal="true" aria-label={`${game.label}: rules`}
                    className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-[#161a3a] to-[#0a0c20] text-white shadow-[0_60px_120px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(255,255,255,.08),inset_0_1px_0_rgba(255,255,255,.12)] transition-transform duration-200 ease-out [transform-style:preserve-3d]">
                    {/* A light that follows the pointer across the card. */}
                    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[28px] opacity-60" style={{ background: 'radial-gradient(420px circle at var(--gx,50%) var(--gy,0%), rgba(255,255,255,.08), transparent 60%)' }} />
                    <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70"><X size={18} /></button>
                    <div className="relative shrink-0 [transform:translateZ(30px)]">
                        <img src={game.image} alt="" className="aspect-[16/8] w-full object-cover sm:aspect-[16/7]" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0f1230] via-[#0f1230]/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 sm:p-6">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_24px_-6px_rgba(0,0,0,.8)]"><img src={game.icon} alt="" className="h-full w-full object-contain" /></span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-300">Competition game</p>
                                <h2 className="truncate text-2xl font-black tracking-tight drop-shadow-lg sm:text-3xl">{game.label}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                        <p className="text-sm leading-relaxed text-slate-300">{game.blurb}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Users size={13} aria-hidden /> Players</p><p className="mt-1 text-sm font-bold">{game.players}</p></div>
                            <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Layers size={13} aria-hidden /> Format</p><p className="mt-1 text-sm font-bold">{game.format}</p></div>
                        </div>
                        <h3 className="mt-5 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-300"><ScrollText size={16} aria-hidden /> Rules and regulations</h3>
                        <ol className="mt-3 space-y-2.5" data-game-rules>
                            {game.rules.map((r, i) => (
                                <li key={r} className="flex gap-3 text-sm leading-relaxed text-slate-200">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200 ring-1 ring-violet-400/40">{i + 1}</span>{r}
                                </li>
                            ))}
                        </ol>
                        {game.id !== 'quizarena' && <p className="mt-3 text-xs text-slate-400">Each competition can set its own clock, questions and team size; its page shows the exact rules.</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 p-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 ring-1 ring-white/15 hover:bg-white/10">Close</button>
                        <Link to="/competitions/open" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_20px_-6px_rgba(124,58,237,.7),inset_0_1px_0_rgba(255,255,255,.3)] hover:brightness-110">
                            <Trophy size={15} aria-hidden /> Open competitions <ArrowRight size={14} aria-hidden />
                        </Link>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
