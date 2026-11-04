import React from 'react';

/**
 * The student's 360° total in the top bar, beside the wallet. Shown only when
 * their institution has 360° marks switched on.
 *
 * Reads `user.marks360` = { enabled, total, max? }. The 360° section is wired
 * to fill it; until then the chip stays hidden.
 */
export function read360(user) {
    const m = user?.marks360;
    if (!m || !m.enabled || m.total == null || Number.isNaN(Number(m.total))) return null;
    return { total: Number(m.total), max: m.max != null ? Number(m.max) : null };
}

const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });

export default function Marks360Chip({ user, compact = false }) {
    const m = read360(user);
    if (!m) return null;
    const label = `360° marks: ${fmt(m.total)}${m.max ? ` of ${fmt(m.max)}` : ''}`;

    if (compact) {
        return (
            <span role="img" aria-label={label} title={label}
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-extrabold tabular-nums text-indigo-700">
                {fmt(m.total)}
            </span>
        );
    }

    return (
        <span title={label} aria-label={label}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-1 pr-3 text-sm font-bold text-indigo-700 tabular-nums">
            <span aria-hidden="true" className="inline-flex h-6 items-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-extrabold tracking-tight text-white">
                360°
            </span>
            <span>
                {fmt(m.total)}
                {m.max ? <span className="font-semibold text-indigo-400">/{fmt(m.max)}</span> : null}
            </span>
        </span>
    );
}
