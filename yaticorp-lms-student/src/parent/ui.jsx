/** The parent dashboard's small pieces (2026-11-19); its frame is ParentLayout.jsx. */
import { useState } from 'react';

export function Avatar({ src, name, size = 'h-12 w-12' }) {
    const [broken, setBroken] = useState(false);
    const initials = String(name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className={`${size} shrink-0 rounded-2xl object-cover ring-2 ring-white shadow`} />
        : <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-lg font-extrabold text-white shadow`}>{initials}</span>;
}
