/**
 * IELTS (2026-11-17) — the band dial and band chips both IELTS pages use (constants: sections.js).
 */
import { fmtBand } from './sections';

/** A ring filled to band / 9, the band in the middle. */
export function BandDial({ band, size = 120, stroke = 10, color = '#1CB0F6', label = 'Overall band' }) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const v = typeof band === 'number' ? Math.max(0, Math.min(9, band)) / 9 : 0;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${typeof band === 'number' ? fmtBand(band) : 'not yet'}`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black leading-none text-[#1F2A44]" style={{ fontSize: size * 0.3 }}>{fmtBand(band)}</span>
                <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8A94A6]">{typeof band === 'number' ? 'Band' : 'No band'}</span>
            </div>
        </div>
    );
}

/** A small chip: a criterion and its band (TA 6). */
export function Crit({ name, title, value, tint = '#F7F7F7', ink = '#3c3c3c' }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-extrabold" style={{ background: tint, color: ink }} title={title}>
            <span className="text-[11px] uppercase tracking-wider opacity-70">{name}</span>{value ?? '—'}
        </span>
    );
}
