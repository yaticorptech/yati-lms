import { useEffect, useRef, useState } from 'react';
import useSpeech from '../useSpeech';
import { words } from '../../../data/bands/wordcraft/text';
import { btnMain, btnSoft } from './look';

/**
 * WORDCRAFT's shared pieces (2026-11-20; minimal text, the user): the countdown ring, the microphone, the recorder
 * (speak — or type where the browser cannot listen), the score dial and a bar.
 */

/** A countdown ring: `left` of `total` seconds. */
export function Ring({ left, total, size = 56 }) {
  const r = 26; const c = 2 * Math.PI * r;
  const frac = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left <= 10;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ede9fe" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={urgent ? '#f43f5e' : '#7c3aed'} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <span className={`text-base font-black tabular-nums ${urgent ? 'text-rose-600' : 'text-slate-800'}`}>{Math.ceil(left)}</span>
    </div>
  );
}

/** The big microphone button. */
export function MicButton({ live, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={live ? 'Stop' : 'Start speaking'}
      className={`relative grid h-20 w-20 place-items-center rounded-full text-3xl text-white shadow-[0_14px_30px_-12px_rgba(124,58,237,0.9)] transition disabled:opacity-40 ${live ? 'wc-live bg-rose-500' : 'wc-press bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500'}`}>
      {live ? <span className="h-6 w-6 rounded-md bg-white" /> : '🎤'}
    </button>
  );
}

/**
 * Speak for up to `seconds` (or type where speech recognition is missing or fails), see the words, submit.
 * `live(text, elapsed, running, typed)` draws what reacts while the student talks. onSubmit({ text, typed, spokeFor, pauses }).
 */
export function Recorder({ seconds, onSubmit, live, minWords = 3 }) {
  const sp = useSpeech();
  const [typed, setTyped] = useState(!sp.supported);
  const [mode, setMode] = useState('idle'); // idle | run | review
  const [left, setLeft] = useState(seconds);
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState('');
  const [redos, setRedos] = useState(0);
  const [snap, setSnap] = useState(null);
  const endsAt = useRef(0);
  const typeSecs = seconds * 2;

  useEffect(() => {
    if (mode !== 'run') return undefined;
    const total = typed ? typeSecs : seconds;
    const iv = setInterval(() => {
      const l = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setLeft(l); setElapsed(total - l);
      if (l <= 0) { clearInterval(iv); finish(); }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, typed]);
  useEffect(() => { if (mode === 'run' && !typed && sp.error && !sp.listening) setMode('idle'); }, [sp.error, sp.listening, mode, typed]);

  const begin = () => {
    const total = typed ? typeSecs : seconds;
    endsAt.current = Date.now() + total * 1000;
    setLeft(total); setElapsed(0); setDraft(''); setSnap(null);
    if (!typed) sp.start();
    setMode('run');
  };
  const finish = () => { if (!typed) sp.stop(); setMode('review'); };
  useEffect(() => {
    if (mode === 'review' && !snap) {
      const t = setTimeout(() => setSnap(typed ? { text: draft, spokeFor: elapsed, pauses: 0 } : { text: sp.text, spokeFor: Math.min(seconds, sp.seconds || elapsed), pauses: sp.pauses }), typed ? 0 : 450);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [mode, snap, typed, draft, elapsed, sp.text, sp.seconds, sp.pauses, seconds]);

  const text = typed ? draft : sp.text;
  const total = typed ? typeSecs : seconds;
  const enough = snap && words(snap.text).length >= minWords;

  return (
    <div className="flex flex-col gap-3">
      {live && live(mode === 'review' && snap ? snap.text : text, elapsed, mode === 'run', typed)}
      {mode !== 'review' && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-violet-100">
          {typed ? (
            <>
              {!sp.supported && <p className="text-xs font-bold text-amber-700">⌨️ Typing (max 80 points). Chrome or Edge lets you speak.</p>}
              <div className="flex w-full items-start gap-3">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={mode !== 'run'} rows={4} placeholder={mode === 'run' ? 'Type…' : 'Press Start'}
                  className="min-w-0 flex-1 resize-none rounded-2xl p-3 text-[15px] text-slate-800 ring-2 ring-violet-200 outline-none focus:ring-violet-500 disabled:bg-slate-50" />
                <Ring left={mode === 'run' ? left : total} total={total} />
              </div>
              {mode === 'run'
                ? <button type="button" className={btnMain} onClick={finish} disabled={!words(draft).length}>Done ✓</button>
                : <button type="button" className={btnMain} onClick={begin}>Start ▶</button>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <MicButton live={sp.listening} onClick={sp.listening ? finish : begin} />
                <Ring left={mode === 'run' ? left : total} total={total} />
              </div>
              <p className="text-sm font-bold text-slate-500">{sp.listening ? 'Listening… tap ■ to finish' : 'Tap 🎤 and speak'}</p>
              {text && <p className="w-full rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200" aria-live="polite">{text}</p>}
              {sp.error && (
                <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
                  <p className="text-center text-sm font-bold text-rose-700">{sp.error}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" className={btnSoft} onClick={begin}>↺ Try again</button>
                    <button type="button" className={btnSoft} onClick={() => { setTyped(true); setMode('idle'); }}>⌨️ Type</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {mode === 'review' && (
        <div className="wc-in flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-violet-100">
          <p className="min-h-12 rounded-2xl bg-slate-50 px-3 py-2.5 text-[15px] leading-relaxed text-slate-800 ring-1 ring-slate-200">{snap ? (snap.text || <span className="text-slate-400">Nothing heard.</span>) : '…'}</p>
          {snap && !enough && <p className="text-center text-sm font-bold text-rose-600">Too short — try again.</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={btnMain} disabled={!enough} onClick={() => onSubmit({ ...snap, typed })}>Submit ➜</button>
            {(redos < 1 || !enough) && <button type="button" className={btnSoft} onClick={() => { setRedos((n) => n + 1); setMode('idle'); setSnap(null); if (!typed) sp.setText(''); }}>↺ Again</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/** The score as a dial. */
export function ScoreDial({ score, size = 110, label = 'Score' }) {
  const r = 50; const c = 2 * Math.PI * r;
  const tone = score >= 75 ? '#10b981' : score >= 60 ? '#8b5cf6' : score >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f0fb" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="wc-dial" />
      </svg>
      <div className="text-center leading-none">
        <p className="text-3xl font-black text-slate-900 tabular-nums">{score}</p>
        <p className="mt-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">{label}</p>
      </div>
    </div>
  );
}

/** A labelled 0–100 bar. */
export const Bar = ({ label, value }) => (
  <div className="flex items-center gap-2 text-xs font-black text-slate-600">
    <span className="w-24 shrink-0 truncate">{label}</span>
    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`wc-bar block h-full rounded-full ${value >= 75 ? 'bg-emerald-500' : value >= 60 ? 'bg-violet-500' : value >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></span>
    <span className="w-8 text-right tabular-nums">{value}</span>
  </div>
);
