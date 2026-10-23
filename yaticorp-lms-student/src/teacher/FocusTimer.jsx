import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

/** The focus timer's face: time left, start/pause and reset (state from useFocusTimer). */
export default function FocusTimer({ timer, dark = true }) {
    const { left, running, toggle, reset } = timer;
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    return (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
            <Timer size={15} aria-hidden="true" />
            <span className="font-mono text-sm font-bold tabular-nums" aria-live="off">{mm}:{ss}</span>
            {left === 0 && <span className={`text-xs font-bold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>Done — take a break</span>}
            <button type="button" onClick={toggle} disabled={left === 0} aria-label={running ? 'Pause focus timer' : 'Start focus timer'} className={`rounded p-1 disabled:opacity-40 ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>{running ? <Pause size={14} /> : <Play size={14} />}</button>
            <button type="button" onClick={reset} aria-label="Reset focus timer" className={`rounded p-1 ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><RotateCcw size={14} /></button>
        </div>
    );
}
