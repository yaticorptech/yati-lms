import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import useFresh from './useFresh';
import { sfx } from './gameSfx';
import { accuracyOf, cleanTyped, speedScore, typingConfig, wpmOf } from '../../data/bands/words';

/**
 * ⌨️ Typing: type what is shown, exactly, against the clock.
 *
 * Per age band (data/bands/words.js): Foundation types single letters, then little words, on a big on-screen
 * keyboard (a physical keyboard works too); Developing, short words then simple
 * sentences, with the keyboard as a guide on wider screens; Intermediate, sentences; Analytical, longer
 * sentences and short passages with accuracy shown; Advanced, passages scored on speed (WPM) and accuracy,
 * accuracy weighted more. Every wrong keystroke is counted.
 */
export default function TypingSprint({ onExit }) {
  const progress = useGameProgress('typing-sprint');
  return <Round key={`${progress.level}-${progress.attempt}-${progress.ageBand}`} progress={progress} onExit={onExit} />;
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function Round({ progress, onExit }) {
  const config = useMemo(
    () => typingConfig(progress.ageBand, progress.difficulty, progress.levelNo),
    [progress.ageBand, progress.difficulty, progress.levelNo]
  );
  const fresh = useFresh((x) => x.text);
  const pickItem = (exclude) => {
    const pool = config.pool.filter((x) => x.text !== exclude);
    return randomOf(pool.length ? pool : config.pool);
  };
  const [current, setCurrent] = useState(() => fresh(() => pickItem(null)));
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(0);
  const [doneChars, setDoneChars] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState(null);
  const [badKey, setBadKey] = useState(null);
  const [started, setStarted] = useState(false);
  const [miss, setMiss] = useState(null); // the word that ran out of time, said for a moment
  const speed = config.mode === 'speed';
  /*
   * Every word against its own clock (2026-11-18, the user: "instead of all words in a set time, each word 8 s, so
   * the student must type fast"): a level is `total` words; each has ITEM_S seconds; out of time, it counts as missed
   * and the next comes. Passages (speed mode) keep the one clock for the round.
   */
  const total = speed ? null : starsCap(config.target);
  const [tried, setTried] = useState(0);
  const finished = speed ? done >= config.passages : tried >= total;
  const timed = useTimedRound(config.seconds, started && speed, finished);
  const seconds = timed.seconds;
  const over = speed ? timed.over : started && finished;
  const inputRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const text = current.text;
  const shownOf = (t) => (!t.includes(' ') && config.caseless ? t.toUpperCase() : t);
  const itemS = speed ? 0 : text.includes(' ') ? Math.max(8, Math.ceil(text.split(' ').length * 2.5)) : 8;
  const [left, setLeft] = useState(itemS * 10); // tenths of a second
  const [itemKey, setItemKey] = useState(0);
  const missRef = useRef(null);
  // The word's clock: a deadline when it appears, the tenths left read from it; at zero, the timeout below.
  const timeoutRef = useRef(null);
  const onTimeout = () => {
    // Out of time: a buzz, the word it was, the next one.
    sfx.wrong();
    setWrong((n) => n + 1);
    setMiss(shownOf(text));
    clearTimeout(missRef.current);
    missRef.current = setTimeout(() => setMiss(null), 1600);
    setTyped('');
    setTried((t) => t + 1);
    setCurrent(fresh(() => pickItem(text)));
    setLeft(80);
    setItemKey((k) => k + 1);
  };
  useEffect(() => { timeoutRef.current = onTimeout; });
  useEffect(() => {
    if (speed || !started || over) return undefined;
    const deadline = Date.now() + itemS * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((deadline - Date.now()) / 100));
      setLeft(l);
      if (l === 0) { clearInterval(t); timeoutRef.current?.(); }
    }, 100);
    return () => clearInterval(t);
  }, [itemKey, started, over]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(missRef.current), []);
  const same = (a, b) => (config.caseless ? a.toLowerCase() === b.toLowerCase() : a === b);
  const prefixOk = (s) => same(s, text.slice(0, s.length));
  let goodLen = 0;
  while (goodLen < typed.length && same(typed[goodLen], text[goodLen] ?? '')) goodLen += 1;
  const wrongSoFar = goodLen < typed.length;

  // Speed and accuracy, from the clock rather than a wall time, so they are pure in render.
  const elapsedMs = Math.max(1000, (config.seconds - seconds) * 1000);
  const accuracy = accuracyOf(right, wrong);
  const chars = doneChars + goodLen;
  const wpm = wpmOf(chars, elapsedMs);
  const score = speed ? speedScore(wpm, accuracy, chars) : done;
  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars, { correct: done, wrong, hints: 0, score, limitMs: config.seconds * 1000 });

  useEffect(() => {
    if (started && !over && config.mode !== 'keys') inputRef.current?.focus();
  }, [started, over, current, config.mode]);

  const complete = () => {
    setDone((d) => d + 1);
    setTried((t) => t + 1);
    setMiss(null);
    setDoneChars((c) => c + text.length);
    setTyped('');
    setCurrent(fresh(() => pickItem(text)));
    setLeft(80);
    setItemKey((k) => k + 1);
    setFlash('right');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 260);
  };

  /** Text-box modes: score the keystrokes this change added, then move on if it matches. */
  const apply = (raw) => {
    if (over) return;
    let value = cleanTyped(raw);
    // A phone keyboard adds a space after a word it commits: dropped where the text has none.
    value = text.includes(' ') ? value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ') : value.replace(/\s/g, '');
    if (value.length > typed.length && value.startsWith(typed)) {
      let ok = prefixOk(typed);
      let r = 0;
      let w = 0;
      for (let p = typed.length; p < value.length; p += 1) {
        if (ok && same(value[p], text[p] ?? '')) r += 1;
        else {
          w += 1;
          ok = false;
        }
      }
      // Buzz on the keystroke that first goes wrong, not on every key while it stays wrong.
      if (w && prefixOk(typed)) sfx.wrong();
      if (r) setRight((n) => n + r);
      if (w) setWrong((n) => n + w);
    }
    if (same(value, text)) complete();
    else setTyped(value);
  };

  /** Keys mode (Foundation): one key at a time; a wrong key buzzes and is not typed. */
  const press = (key) => {
    if (over || !started) return;
    const expected = text[typed.length];
    if (!expected) return;
    if (same(key, expected)) {
      setRight((n) => n + 1);
      if (typed.length + 1 === text.length) complete();
      else setTyped(text.slice(0, typed.length + 1));
    } else {
      sfx.wrong();
      setWrong((n) => n + 1);
      setBadKey(key.toUpperCase());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBadKey(null), 350);
    }
  };

  // The physical keyboard drives keys mode. The handler is refreshed every render (it reads the latest state).
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      e.preventDefault();
      press(e.key);
    };
  });
  useEffect(() => {
    if (config.mode !== 'keys' || !started || over) return undefined;
    const onKey = (e) => keyRef.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config.mode, started, over]);

  const nextChar = text[goodLen] || '';
  const long = text.length > 40;
  const isWordItem = !text.includes(' ');
  const shown = shownOf(text);
  // What went wrong, said plainly (2026-11-18): the letter typed and the one wanted.
  const say = (ch) => (ch === ' ' ? 'space' : config.caseless ? ch.toUpperCase() : ch);
  const mistake = wrongSoFar ? { typed: say(typed[goodLen]), want: say(text[goodLen] ?? '') } : badKey ? { typed: badKey, want: say(text[typed.length] ?? '') } : null;

  const objective = {
    keys: `Type each letter or word before its 8 seconds run out. Get ${config.target} of ${total} right.`,
    items: config.caseless
      ? `Type each word before its 8 seconds run out. ${total} words — get ${config.target} right to win.`
      : `Type each sentence exactly — capitals and full stops too — before its time runs out. ${config.target} of ${total} to win.`,
    speed: `Type ${config.passages} passages. Your score mixes speed (WPM) and accuracy — accuracy counts more. Reach ${config.target}.`
  }[config.mode];

  return (
    <GameShell
      title="Typing Sprint"
      blurb={speed ? `Score ${config.target}+ on speed and accuracy.` : `Type ${config.target} before the clock runs out.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-pink-700"
      score={speed ? `${accuracy}%` : `${done}/${total}`}
      seconds={speed ? seconds : Math.ceil(left / 10)}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective,
              seconds: speed ? config.seconds : undefined,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: speed
                ? `Score ${score} · ${wpm} WPM · ${accuracy}% accuracy`
                : `${done} typed${config.showAccuracy || wrong ? ` · ${accuracy}% accuracy` : ''}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        speed || config.showAccuracy ? (
          <p className="text-center text-sm text-ink-500">
            {speed ? `${wpm} WPM · ` : ''}
            {accuracy}% accuracy · {done}/{speed ? config.passages : config.target}
          </p>
        ) : (
          <p className="text-center text-sm text-ink-500">
            {config.mode === 'keys' ? 'Type the letters you see' : 'Letters turn red the moment one is wrong'}
          </p>
        )
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-xl text-center">
          {/* The stage (2026-11-18 redesign): a coloured card, the word in letter tiles, its own 8-second bar. */}
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 p-4 shadow-[0_14px_30px_-14px_rgba(124,58,237,0.6)] sm:p-5">
            <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              {[['⌨️', 6, 8, -10], ['A', 86, 8, 12], ['✦', 4, 70, 0], ['Z', 90, 72, -8]].map(([c, x, y, r]) => <span key={c} className="absolute text-3xl font-black text-white/20" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}>{c}</span>)}
            </span>
            <div className="relative flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-violet-700 shadow-sm">⌨️ {speed ? 'Type the passage' : `Word ${Math.min(tried + 1, total)} of ${total}`}</span>
              {!speed && <span className={`rounded-full px-3 py-1 text-xs font-black tabular-nums shadow-sm ${left <= 30 ? 'bg-rose-500 text-white' : 'bg-white/90 text-violet-700'}`}>⏱ {(left / 10).toFixed(1)}s</span>}
            </div>
            {!speed && (
              <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-white/25" aria-hidden>
                <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${left <= 30 ? 'bg-rose-300' : 'bg-gradient-to-r from-amber-300 to-yellow-200'}`} style={{ width: `${(left / (itemS * 10)) * 100}%` }} />
              </div>
            )}
            {current.picture && <div className="relative mt-3 text-6xl leading-none drop-shadow" role="img" aria-hidden="true">{current.picture}</div>}

            {isWordItem || config.mode === 'keys' ? (
              <div className={`relative mt-4 flex flex-wrap justify-center gap-1.5 ${flash === 'right' ? 'oo-win' : ''}`} aria-label={`Type: ${text}`}>
                {shown.split('').map((ch, i) => (
                  <span key={i} className={`grid place-items-center rounded-xl font-mono font-black shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)] transition-colors ${shown.length > 8 ? 'h-11 w-9 text-xl' : 'h-14 w-12 text-3xl'} ${
                    i < goodLen ? 'bg-emerald-400 text-white'
                      : i < typed.length ? 'gs-wrong bg-rose-500 text-white'
                        : i === typed.length ? 'bg-amber-300 text-ink-900 ring-4 ring-white/70'
                          : 'bg-white text-violet-800'}`}>{ch}</span>
                ))}
              </div>
            ) : (
              <p aria-label={`Type: ${text}`} className={`relative mt-4 rounded-2xl bg-white px-4 py-4 text-ink-900 ${long ? 'text-left text-base leading-relaxed font-semibold sm:text-lg' : 'text-xl leading-snug font-bold sm:text-2xl'} ${flash === 'right' ? 'ring-4 ring-emerald-300' : ''}`}>
                {shown.split('').map((ch, i) => (
                  <span key={i} className={i < goodLen ? 'text-emerald-600' : i < typed.length ? 'bg-rose-100 text-rose-600' : i === typed.length ? 'rounded-sm bg-amber-200/70 underline decoration-amber-500 decoration-2 underline-offset-4' : ''}>{ch}</span>
                ))}
              </p>
            )}

            {/* What went wrong, and what to type — or the word that ran out of time. */}
            <div className="relative mt-3 min-h-9" aria-live="polite">
              {mistake ? (
                <p className="oo-pop inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-2xl bg-rose-50 px-4 py-1.5 text-sm font-black whitespace-nowrap text-rose-700 shadow-sm ring-2 ring-rose-200">
                  <span>✗ You typed <span className="rounded-md bg-rose-500 px-1.5 font-mono text-white">{mistake.typed}</span></span>
                  <span>· type <span className="rounded-md bg-emerald-500 px-1.5 font-mono text-white">{mistake.want}</span></span>
                  {wrongSoFar && <span className="text-rose-500">(⌫ first)</span>}
                </p>
              ) : miss ? (
                <p className="oo-pop inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-black text-amber-800 shadow-sm ring-2 ring-amber-200">⏰ Time's up — it was <span className="font-mono">{miss}</span></p>
              ) : flash === 'right' ? (
                <p className="oo-pop inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-black text-emerald-700 shadow-sm ring-2 ring-emerald-200">✓ Great typing!</p>
              ) : null}
            </div>
          </div>
          {current.clue && <p className="mt-2 text-sm text-ink-500">{current.clue}</p>}

          {config.mode !== 'keys' &&
            (long ? (
              <textarea
                ref={inputRef}
                value={typed}
                onChange={(e) => apply(e.target.value.replace(/\n/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                rows={3}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                aria-label="Type the passage"
                className={`mt-4 w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 text-left text-base text-ink-900 outline-none transition-colors ${
                  wrongSoFar ? 'border-rose-400' : 'border-line-200 focus:border-fuchsia-400'
                }`}
              />
            ) : (
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => apply(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize={config.caseless ? 'off' : 'sentences'}
                spellCheck={false}
                aria-label={isWordItem ? 'Type the word' : 'Type the sentence'}
                placeholder="Type here…"
                className={`mt-4 min-h-14 w-full rounded-2xl border-[3px] bg-white px-4 py-3 text-center text-ink-900 shadow-sm outline-none transition-colors placeholder:text-ink-300 ${
                  isWordItem ? 'font-mono text-2xl font-black tracking-[0.12em]' : 'text-lg font-semibold'
                } ${config.caseless && isWordItem ? 'uppercase' : ''} ${wrongSoFar ? 'border-rose-400 bg-rose-50' : 'border-violet-200 focus:border-violet-500'}`}
              />
            ))}

          {config.keyboard && (
            <Keyboard
              next={wrongSoFar ? '⌫' : nextChar}
              bad={badKey}
              onKey={config.mode === 'keys' ? press : (k) => apply(k === '⌫' ? typed.slice(0, -1) : typed + (config.caseless ? k.toLowerCase() : k))}
              withSpace={config.mode !== 'keys'}
              guideOnly={config.mode !== 'keys'}
            />
          )}
        </div>
      )}
    </GameShell>
  );
}

/**
 * A big on-screen keyboard (it does not show the next letter; only ⌫ lights after a mistake). In keys mode it is the way to type on a tablet;
 * otherwise it is a guide shown on wider screens (a phone already has its own keyboard up).
 */
function Keyboard({ next, bad, onKey, withSpace, guideOnly }) {
  const want = next === ' ' ? 'SPACE' : next.toUpperCase();
  const key = (label, value = label, wide = false) => {
    // No spelling help (2026-11-16, the user): only Backspace lights, after a wrong letter.
    const lit = want === label && label === '⌫';
    return (
      <button
        key={label}
        type="button"
        onClick={() => onKey(value)}
        aria-label={label === 'SPACE' ? 'Space' : label === '⌫' ? 'Backspace' : `Key ${label}`}
        className={`fp-press flex h-12 min-w-0 items-center justify-center rounded-lg text-lg font-black shadow-sm transition-all sm:h-14 ${
          wide ? 'flex-[5]' : 'max-w-14 flex-1'
        } ${
          bad === label
            ? 'gs-wrong bg-rose-500 text-white'
            : lit
              ? 'scale-105 bg-amber-400 text-ink-900 ring-4 ring-amber-200'
              : 'bg-surface-100 text-ink-700'
        }`}
      >
        {label === 'SPACE' ? 'space' : label}
      </button>
    );
  };
  return (
    <div className={`mt-5 select-none flex-col gap-1.5 ${guideOnly ? 'hidden sm:flex' : 'flex'}`}>
      {ROWS.map((row, r) => (
        <div key={r} className="flex justify-center gap-1">
          {row.split('').map((ch) => key(ch))}
          {r === 2 && withSpace && key('.', '.')}
          {r === 2 && withSpace && key('⌫')}
        </div>
      ))}
      {withSpace && <div className="flex justify-center gap-1">{key('SPACE', ' ', true)}</div>}
    </div>
  );
}
