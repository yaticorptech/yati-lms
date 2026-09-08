/** A labelled percentage bar that fills on mount. */
import { useEffect, useState } from 'react';
import { scoreTone } from './api';

export default function ScoreBar({ label, value = 0, small = false }) {
    const [w, setW] = useState(0);
    useEffect(() => { const t = setTimeout(() => setW(value), 80); return () => clearTimeout(t); }, [value]);
    return (
        <div>
            <div className={`flex items-center justify-between ${small ? 'text-xs' : 'text-sm'}`}>
                <span className="font-semibold text-slate-700">{label}</span>
                <span className="font-black tabular-nums text-slate-900">{value}%</span>
            </div>
            <div className={`mt-1 overflow-hidden rounded-full bg-slate-100 ${small ? 'h-2' : 'h-2.5'}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                <div className={`h-full rounded-full bg-gradient-to-r ${scoreTone(value)} transition-[width] duration-700 ease-out`} style={{ width: `${w}%` }} />
            </div>
        </div>
    );
}
