/**
 * Wallet & Rewards in the My Courses banner (moved from the Dashboard,
 * 2026-10-26): the balance that pays for courses, and what was spent. The
 * whole card opens the full wallet in a popup (WalletSheet: overview and every
 * transaction); there is no separate "View all" button (asked 2026-10-27). The
 * figures are the rewards summary the header's wallet button reads, so the two
 * always agree.
 *
 * Drawn after the supplied banner design (2026-10-27): a white card with a
 * purple "Wallet & Rewards" tab over its top edge and the design's own gift
 * box on its corner (public/illustrations/courses-hero-gift.png).
 *
 * id="wallet": a wallet notice (/enrolled-courses#wallet) scrolls here.
 */
import React, { useState } from 'react';
import { Wallet, Gift } from 'lucide-react';
import { useRewards } from '../../context/useRewards';
import { WalletSheet } from './WalletCard';
import { money, balance } from './format';

export default function HeroWallet() {
    const rewards = useRewards();
    const [open, setOpen] = useState(false);
    const w = rewards.enabled ? rewards.summary?.wallet : null;
    if (!rewards.enabled) return null;
    const cur = w?.currency || 'INR';

    // The card is one button: a tap anywhere on it opens the wallet. The tab
    // sits half over its top edge, so the wrapper leaves room above it.
    return (
        <div id="wallet" className="relative scroll-mt-24 pt-5">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                aria-label={w ? `Wallet & Rewards: ${money(balance(w.available), cur)} to spend. Open the wallet and its transactions.` : 'Wallet & Rewards. Open the wallet and its transactions.'}
                className="relative block w-full cursor-pointer rounded-[1.6rem] bg-white px-5 pt-8 pb-4 text-left text-slate-900 shadow-[0_24px_48px_-22px_rgba(76,29,149,0.5)] ring-1 ring-white transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 active:translate-y-0 sm:px-6">
                <span className="absolute -top-5 left-5 flex h-10 items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 pr-6 pl-3.5 text-[0.95rem] font-semibold whitespace-nowrap text-white shadow-lg shadow-violet-600/30 ring-2 ring-white/70 sm:left-7">
                    <Wallet size={20} strokeWidth={1.8} aria-hidden />
                    Wallet &amp; Rewards
                </span>
                <img src="/illustrations/courses-hero-gift.png" alt="" aria-hidden draggable={false}
                    className="pointer-events-none absolute -top-10 -right-2 w-16 select-none sm:-top-12 sm:-right-3 sm:w-[4.75rem]" />
                {w ? (
                    <>
                        <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">Wallet balance</span>
                        <span className="mt-1 block text-[2.1rem] font-black leading-tight tracking-tight tabular-nums text-emerald-600 sm:text-[2.3rem]">{money(balance(w.available), cur)}</span>
                        <span className="block text-sm text-slate-500">Spend it on courses and features</span>
                        <span aria-hidden className="mt-3 block h-px w-4/5 bg-slate-200/80" />
                        {/* Spent only: no "Earned" (taken off, 2026-10-26). */}
                        <span className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/80 px-4 py-3 ring-1 ring-amber-200/50">
                            <Gift size={20} className="shrink-0 text-amber-500" fill="#fde68a" aria-hidden />
                            <span className="min-w-0 flex-1 text-[0.8rem] font-bold uppercase tracking-wide text-amber-700">Spent so far</span>
                            <span aria-hidden className="h-6 w-px shrink-0 bg-amber-300/60" />
                            <span className="truncate text-xl font-black tabular-nums text-amber-950">{money(w.totalSpent, cur)}</span>
                        </span>
                    </>
                ) : (
                    <span className="block space-y-2" aria-hidden>
                        <span className="block h-6 w-32 animate-pulse rounded-full bg-violet-50" />
                        <span className="block h-9 w-44 animate-pulse rounded-lg bg-slate-100" />
                        <span className="block h-12 animate-pulse rounded-2xl bg-amber-50" />
                    </span>
                )}
            </button>
            {open && <WalletSheet onClose={() => setOpen(false)} />}
        </div>
    );
}
