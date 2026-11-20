import { useEffect, useRef, useState } from 'react';
import useSpeech, { sayAloud } from '../useSpeech';
import { sfx } from '../gameSfx';
import { words } from '../../../data/bands/wordcraft/text';
import { MAX_TWISTER_ATTEMPTS, TWISTER_REPS, checkTwister, forbiddenSaid, twisterReps, twistsUsed } from '../../../data/bands/wordcraft/score';
import { Recorder, Ring, MicButton } from './kit';
import { LOOK, btnMain, btnSoft } from './look';

/**
 * The six WORDCRAFT challenges (2026-11-20; minimal text, the user). Each calls onDone(payload) once with what was
 * said or written — { text, typed, spokeFor, pauses } or, for the twister, { attempts: [{ spoken, secs }] } — and the
 * server scores it (score.js, run there).
 */

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
const Card = ({ kind, children, className = '' }) => (
  <div className={`rounded-3xl bg-white p-4 shadow-[0_18px_40px_-26px_rgba(76,29,149,0.55)] ring-1 sm:p-5 ${LOOK[kind].ring} ${className}`}>{children}</div>
);

/* 🚫 Don't Say That! */
export function DontSayThat({ ch, onDone }) {
  const { item } = ch;
  const bans = [item.target.toLowerCase(), ...item.ban];
  const heard = useRef(new Set());
  return (
    <div className="flex flex-col gap-3">
      <Card kind="dont-say" className="text-center">
        <p className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{item.target}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {item.ban.map((b) => <span key={b} className="rounded-full bg-rose-50 px-3 py-1 text-sm font-black text-rose-600 ring-1 ring-rose-200">🚫 {b}</span>)}
        </div>
      </Card>
      <Recorder seconds={ch.seconds} minWords={5}
        live={(text) => {
          const said = forbiddenSaid(text, bans);
          said.forEach((w) => { if (!heard.current.has(w)) { heard.current.add(w); sfx.wrong?.(); } });
          return said.length ? <p className="wc-shake text-center text-sm font-black text-rose-600">✕ You said: {said.join(', ')}</p> : null;
        }}
        onSubmit={onDone} />
    </div>
  );
}

/* 🖼️ Caption Clash */
export function CaptionClash({ onDone, ch }) {
  const [text, setText] = useState('');
  const n = words(text).length;
  return (
    <div className="flex flex-col gap-3">
      <img src={`${BASE}${ch.item.src}`} alt={ch.item.desc} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg sm:aspect-[16/10]" />
      <Card kind="caption">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 160))} rows={2} placeholder="Your caption…" aria-label="Your caption"
          className="w-full resize-none rounded-2xl p-3 text-lg font-bold text-slate-800 ring-2 ring-sky-200 outline-none focus:ring-blue-500" />
        <div className="mt-3 flex justify-center">
          <button type="button" className={btnMain} disabled={n < 2} onClick={() => onDone({ text, typed: false })}>Submit ➜</button>
        </div>
      </Card>
    </div>
  );
}

/* ⏱️ Talk for 60 */
export function TalkFor60({ ch, onDone }) {
  return (
    <div className="flex flex-col gap-3">
      <Card kind="talk60" className="text-center"><p className="text-2xl leading-snug font-black text-slate-900 sm:text-3xl">{ch.item.topic}</p></Card>
      <Recorder seconds={ch.seconds} minWords={10} onSubmit={onDone} />
    </div>
  );
}

/* 🌀 Plot Twist — continue the story; use each new word as it pops up */
export function PlotTwist({ ch, onDone }) {
  const { item, twists } = ch;
  const shown = useRef(new Set());
  return (
    <div className="flex flex-col gap-3">
      <Card kind="plot">
        <p className="text-xs font-black text-fuchsia-600">Start with this line, then keep the story going:</p>
        <p className="mt-1 text-xl leading-snug font-black text-slate-900 italic sm:text-2xl">“{item.line}”</p>
      </Card>
      <Recorder seconds={ch.seconds} minWords={15}
        live={(text, elapsed, running, typed) => {
          const used = twistsUsed(twists, text);
          const k = typed ? 2 : 1;
          return (
            <div className="flex flex-wrap justify-center gap-2" aria-live="polite">
              {twists.map((t) => {
                const open = (!running && elapsed > 0) || elapsed >= t.at * k;
                if (open && running && !shown.current.has(t.id)) { shown.current.add(t.id); sfx.whoosh?.(); }
                const ok = used.includes(t);
                return open
                  ? <span key={t.id} className={`wc-drop rounded-2xl px-4 py-2 text-base font-black ${ok ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white shadow-lg'}`}>{ok ? '✓' : 'Use:'} {t.word}</span>
                  : <span key={t.id} className="rounded-2xl border-2 border-dashed border-fuchsia-200 px-4 py-2 text-sm font-black text-fuchsia-300">? at {t.at * k}s</span>;
              })}
            </div>
          );
        }}
        onSubmit={onDone} />
    </div>
  );
}

/* 💼 Sell the Impossible */
export function SellImpossible({ ch, onDone }) {
  return (
    <div className="flex flex-col gap-3">
      <Card kind="sell" className="text-center">
        <p className="text-2xl leading-tight font-black text-slate-900 sm:text-3xl">{ch.item.name}</p>
        <p className="mt-1 text-sm font-bold text-orange-600">{ch.item.hook}</p>
      </Card>
      <Recorder seconds={ch.seconds} minWords={10} onSubmit={onDone} />
    </div>
  );
}

/* 👅 Tongue Twister — say it five times in one go; two chances (2026-11-20, the user) */
export function TongueTwister({ ch, onDone }) {
  const { item } = ch;
  const sp = useSpeech();
  const [tries, setTries] = useState(0);
  const [last, setLast] = useState(null);
  const [note, setNote] = useState('');
  const [left, setLeft] = useState(ch.seconds);
  const [finished, setFinished] = useState(false);
  const textRef = useRef(''); textRef.current = sp.text;
  const judging = useRef(false);
  const log = useRef([]);
  const liveReps = sp.listening ? twisterReps(item.text, sp.text, ch.acc).reps : last?.reps ?? 0;

  const judge = (spoken, secs) => {
    if (judging.current) return;
    judging.current = true;
    sp.stop();
    const res = checkTwister(item.text, spoken, ch.acc, secs, ch.seconds + 1);
    log.current.push({ spoken, secs: Math.round(secs * 10) / 10 });
    const t = tries + 1;
    setTries(t); setLast(res);
    if (res.ok) { sfx.right?.(); setNote('🎉 Five in a row!'); setFinished(true); setTimeout(() => onDone({ attempts: log.current }), 900); return; }
    sfx.wrong?.();
    if (t >= MAX_TWISTER_ATTEMPTS) { setNote(`${res.reps} of 5. Moving on.`); setFinished(true); setTimeout(() => onDone({ attempts: log.current }), 1400); return; }
    setNote(res.slow ? 'Too slow — one more chance.' : `${res.reps} of 5 — one more chance.`);
  };

  useEffect(() => {
    if (!sp.listening) return undefined;
    const iv = setInterval(() => {
      const t = sp.elapsed(); const spoken = textRef.current;
      setLeft(Math.max(0, ch.seconds - t));
      if (spoken && twisterReps(item.text, spoken, ch.acc).reps >= TWISTER_REPS) { judge(spoken, t); return; }
      const quiet = sp.heardAgo();
      if (spoken && quiet !== null && quiet > 2200) { judge(spoken, t - quiet / 1000); return; }
      if (!spoken && t > 8) { sp.stop(); setNote('Didn’t hear you — tap 🎤 again (not counted).'); return; }
      if (t > ch.seconds + 1.5) judge(spoken, t);
    }, 150);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.listening]);

  const go = () => { judging.current = false; setNote(''); setLast(null); setLeft(ch.seconds); sp.start(); };

  if (!sp.supported) {
    return (
      <Card kind="twister" className="text-center">
        <p className="text-xl font-black text-slate-900">🎙️ The Tongue Twister needs Chrome or Edge</p>
        <p className="mt-3 rounded-2xl bg-indigo-50 p-3 text-lg font-black text-indigo-900">{item.text}</p>
        <button type="button" className={`${btnSoft} mt-4`} onClick={() => onDone({ unsupported: true })}>Skip (level won’t clear)</button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card kind="twister" className="text-center">
        <p className="text-2xl leading-relaxed font-black text-indigo-950 sm:text-3xl">{item.text}</p>
        <button type="button" onClick={() => sayAloud(item.text, 0.85)} className="mt-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">🔊 Hear it</button>
        <div className="mt-4 flex items-center justify-center gap-2" aria-label={`${liveReps} of 5`}>
          {Array.from({ length: TWISTER_REPS }, (_, i) => (
            <span key={i} className={`grid h-11 w-11 place-items-center rounded-full text-sm font-black transition sm:h-12 sm:w-12 ${i < liveReps ? 'wc-pop bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'}`}>{i < liveReps ? '✓' : i + 1}</span>
          ))}
        </div>
        <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{liveReps}/5</p>
      </Card>

      <Card kind="twister" className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-5">
          <MicButton live={sp.listening} disabled={finished} onClick={sp.listening ? () => judge(textRef.current, sp.elapsed()) : go} />
          <Ring left={sp.listening ? left : ch.seconds} total={ch.seconds} />
        </div>
        <p className="text-sm font-black text-slate-600">{sp.listening ? 'Say it 5 times without stopping…' : finished ? '' : `Tap 🎤 · say it 5 times in one go · chance ${Math.min(tries + 1, MAX_TWISTER_ATTEMPTS)} of ${MAX_TWISTER_ATTEMPTS}`}</p>
        {sp.listening && sp.text && <p className="w-full rounded-xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-600 ring-1 ring-slate-200">{sp.text}</p>}
        {note && <p className={`wc-in w-full rounded-xl px-3 py-2 text-center text-sm font-black ${last?.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`} role="status">{note}{last && !last.ok && last.missed.length ? ` Unclear: ${last.missed.slice(0, 4).join(', ')}` : ''}</p>}
        {sp.error && <p className="w-full rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-800">{sp.error} (not counted)</p>}
        {!sp.listening && !finished && tries > 0 && <button type="button" className={btnMain} onClick={go}>🎤 Last chance</button>}
      </Card>
    </div>
  );
}
