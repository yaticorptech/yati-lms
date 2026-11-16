import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import {
  ABC, assignLetter, cipherLabConfig, decryptWith, isSolved, letterCounts, makeCipherLabLevel,
  puzzleScore, slotCounts, solutionState, startState
} from '../../data/bands/fCipherLab';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const ENGLISH_ORDER = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
const KIND_NAME = { sub: 'Substitution', vig: 'Vigenère', trans: 'Column transposition' };
const KIND_HELP = {
  sub: 'Every letter stands for one other letter. Tap a cipher letter (in the text or the chart), then tap the plain letter it stands for.',
  vig: 'Each key letter shifts every letter in its slot (A = 0, B = 1 …). Set the key letters; the message decodes as you go.',
  trans: 'The message was written in rows and read out by columns in a secret order. Tap two strips to swap them until the rows read as English.'
};

/** 🔐 Cipher Lab: break substitution, Vigenère and transposition ciphers with real cryptanalysis tools. */
export default function CipherLab({ onExit }) {
  const progress = useGameProgress('cipher-lab', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = cipherLabConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => makeCipherLabLevel(seeded(freshSeed()), cfg));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(() => startState(puzzles[0]));
  const [locked, setLocked] = useState(() => lockedFor(puzzles[0]));
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('open'); // open | solved | abandoned
  const [scores, setScores] = useState([]);

  const over = index >= puzzles.length;
  const puzzle = over ? null : puzzles[index];
  const total = scores.reduce((a, b) => a + b, 0);
  const solvedCount = scores.filter((s) => s > 0).length;
  const passed = total >= cfg.pass;
  const stars = over ? starsForFixed(total, cfg.pass, cfg.max) : 0;
  useRecordStars(progress, over, stars, { correct: solvedCount, wrong: puzzles.length - solvedCount, hints: 0, score: total });

  const update = (nextState) => {
    if (status !== 'open') return;
    setState(nextState);
    if (isSolved(puzzle, nextState)) {
      sfx.right?.();
      setStatus('solved');
      setScores((s) => [...s, puzzleScore(true)]);
    }
  };

  const giveUp = () => {
    if (status !== 'open') return;
    sfx.wrong();
    setState(solutionState(puzzle));
    setStatus('abandoned');
    setScores((s) => [...s, 0]);
  };

  const nextPuzzle = () => {
    const i = index + 1;
    setIndex(i);
    if (i < puzzles.length) {
      setState(startState(puzzles[i]));
      setLocked(lockedFor(puzzles[i]));
    }
    setSelected(null);
    setStatus('open');
  };

  /** Put plain letter `p` (null clears) on cipher letter / key slot `target` (the selected one by default). */
  const setLetter = (p, target = selected) => {
    if (target === null || locked.includes(target)) return;
    if (puzzle.kind === 'sub') {
      if (p && locked.some((c) => state.map[c] === p)) return;
      update(assignLetter(state, target, p));
    } else if (puzzle.kind === 'vig') {
      const key = [...state.key];
      key[target] = p;
      update({ key });
    }
  };

  // Keyboard: a letter assigns to the selected cipher letter / key slot; Backspace clears it.
  useEffect(() => {
    if (!started || over || status !== 'open' || puzzle.kind === 'trans' || selected === null) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea')) return;
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) { e.preventDefault(); setLetter(k); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); setLetter(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = `Three ciphers — a substitution, a Vigenère with a known key length, and a column transposition — all hiding real quotations or facts. Each one you break is worth 3 points. Score ${cfg.pass} of ${cfg.max} to clear.`;

  return (
    <GameShell
      title="Cipher Lab"
      blurb="Real cryptanalysis: frequencies, keys and column order."
      tone="bg-gradient-to-br from-emerald-800 to-slate-900"
      variant="premium"
      score={`${total}/${cfg.max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? {
        gameId: progress.gameId,
        level: progress.level,
        objective,
        stars: starsOn(progress.gameId, progress.level),
        onStart: () => setStarted(true)
      } : null}
      result={over ? {
        passed,
        stars,
        headline: passed ? `Level ${progress.level} decrypted` : 'The code held',
        detail: `${solvedCount} of ${puzzles.length} ciphers broken · ${total} of ${cfg.max} points`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p>Cipher {Math.min(index + 1, puzzles.length)} of {puzzles.length}{puzzle ? ` · ${KIND_NAME[puzzle.kind]}` : ''}. {puzzle ? KIND_HELP[puzzle.kind] : ''}</p>}
    >
      {started && puzzle && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.65rem] font-black tracking-[0.18em] text-emerald-700 uppercase">
              {KIND_NAME[puzzle.kind]}{puzzle.kind === 'vig' ? ` · key length ${puzzle.keyLen}` : ''}{puzzle.kind === 'trans' ? ` · ${puzzle.cols} columns` : ''}
            </p>
            {status === 'open' && (
              <div className="flex gap-2">
                <button type="button" onClick={giveUp} className="min-h-10 rounded-lg bg-slate-50 px-3 text-xs font-black text-slate-600 ring-1 ring-slate-200 ring-inset">Reveal</button>
              </div>
            )}
          </div>

          {puzzle.kind === 'sub' && <SubBoard puzzle={puzzle} state={state} locked={locked} selected={selected} onSelect={setSelected} onLetter={setLetter} open={status === 'open'} />}
          {puzzle.kind === 'vig' && <VigBoard puzzle={puzzle} state={state} locked={locked} selected={selected} onSelect={setSelected} onLetter={setLetter} open={status === 'open'} />}
          {puzzle.kind === 'trans' && <TransBoard puzzle={puzzle} state={state} selected={selected} onSelect={setSelected} onArrange={(arrangement) => update({ arrangement })} open={status === 'open'} />}

          {status !== 'open' && (
            <div className={`rounded-2xl p-4 ring-1 ring-inset ${status === 'solved' ? 'bg-emerald-50 ring-emerald-200' : 'bg-slate-50 ring-slate-200'}`} role="status">
              <p className={`text-xs font-black tracking-[0.14em] uppercase ${status === 'solved' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {status === 'solved' ? `Broken · +${scores[scores.length - 1]} points` : 'Revealed · 0 points'}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug text-[#1b2456]">“{sentenceCase(puzzle.text)}”</p>
              <p className="mt-1 text-sm text-slate-500">— {puzzle.source}</p>
              <button type="button" onClick={nextPuzzle} autoFocus className="mt-3 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white">
                {index + 1 >= puzzles.length ? 'See result' : 'Next cipher'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

const lockedFor = (p) => (p.kind === 'sub' ? Object.keys(p.givens) : p.kind === 'vig' ? [...p.givenSlots] : []);
const sentenceCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

/** The cipher text with the live decryption under each letter; tapping a letter selects it. */
function CipherText({ cipher, plain, selected, onSelect, slotOf = null }) {
  const words = [];
  let start = 0;
  cipher.split(' ').forEach((w) => { words.push({ w, start }); start += w.length + 1; });
  let li = -1;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 rounded-2xl bg-slate-900 p-3 sm:p-4" aria-label="Cipher text and decryption">
      {words.map(({ w, start: s }) => (
        <span key={s} className="flex max-w-full flex-wrap gap-0.5">
          {[...w].map((ch, j) => {
            li++;
            const p = plain[s + j];
            const tag = slotOf ? slotOf(li) : ch;
            const on = selected !== null && tag === selected;
            return (
              <button
                key={j}
                type="button"
                onClick={() => onSelect && onSelect(tag)}
                className={`flex w-5 flex-col items-center rounded py-0.5 font-mono transition min-[400px]:w-6 sm:w-7 ${on ? 'bg-emerald-500/30 ring-1 ring-emerald-400' : ''}`}
                aria-label={`Cipher ${ch}, reads ${p === '_' ? 'unknown' : p}`}
              >
                <span className="text-[0.7rem] text-slate-400">{ch}</span>
                <span className={`text-base font-black ${p === '_' ? 'text-slate-600' : 'text-emerald-300'}`}>{p}</span>
              </button>
            );
          })}
        </span>
      ))}
    </div>
  );
}

/** Bars of letter counts, most common first. */
function FreqChart({ counts, selected, onSelect, label }) {
  const rows = ABC.split('').map((c, i) => ({ c, n: counts[i] })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n || a.c.localeCompare(b.c));
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 ring-inset">
      <p className="mb-2 text-[0.62rem] font-black tracking-[0.14em] text-slate-500 uppercase">{label}</p>
      <div className="flex h-28 items-end gap-1 overflow-x-auto pb-1" role="list">
        {rows.map((r) => (
          <button
            key={r.c}
            type="button"
            role="listitem"
            onClick={() => onSelect && onSelect(r.c)}
            className="flex min-w-[1.4rem] flex-1 flex-col items-center justify-end gap-0.5"
            aria-label={`${r.c}: ${r.n}`}
          >
            <span className="text-[0.6rem] font-bold text-slate-400 tabular-nums">{r.n}</span>
            <span className={`w-full rounded-t ${selected === r.c ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ height: `${(r.n / max) * 64}px` }} />
            <span className={`font-mono text-xs font-black ${selected === r.c ? 'text-emerald-700' : 'text-slate-600'}`}>{r.c}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.7rem] text-slate-500">English, most to least common: <span className="font-mono font-bold tracking-wider text-slate-700">{ENGLISH_ORDER.slice(0, 12)}…</span></p>
    </div>
  );
}

/** A–Z keyboard of plain letters. `owner(p)` names the cipher letter already using p. */
function LetterPad({ onLetter, owner, disabled }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
      {ABC.split('').map((p) => {
        const by = owner ? owner(p) : null;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onLetter(p)}
            className={`relative min-h-11 rounded-lg font-mono text-sm font-black ring-1 ring-inset transition disabled:opacity-40 ${by ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-[#1b2456] ring-slate-300 hover:bg-emerald-50'}`}
            aria-label={by ? `${p}, used by ${by}` : p}
          >
            {p}
            {by && <span className="absolute right-0.5 bottom-0 text-[0.55rem] text-emerald-600">{by}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SubBoard({ puzzle, state, locked, selected, onSelect, onLetter, open }) {
  const plain = decryptWith(puzzle, state);
  const counts = letterCounts(puzzle.cipher);
  const ownerOf = Object.fromEntries(Object.entries(state.map).map(([c, p]) => [p, c]));
  return (
    <div className="flex flex-col gap-3">
      <CipherText cipher={puzzle.cipher} plain={plain} selected={selected} onSelect={open ? onSelect : null} />
      <FreqChart counts={counts} selected={selected} onSelect={open ? onSelect : null} label="Cipher letter frequency" />
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#1b2456]">
            {selected ? (
              <>Cipher <span className="font-mono text-emerald-700">{selected}</span> → {state.map[selected] ? <span className="font-mono">{state.map[selected]}</span> : 'choose a plain letter'}{locked.includes(selected) ? ' (fixed)' : ''}</>
            ) : 'Select a cipher letter first.'}
          </p>
          {selected && state.map[selected] && !locked.includes(selected) && open && (
            <button type="button" onClick={() => onLetter(null)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Clear</button>
          )}
        </div>
        <LetterPad onLetter={onLetter} owner={(p) => ownerOf[p] || null} disabled={!open || !selected || locked.includes(selected)} />
      </div>
    </div>
  );
}

function VigBoard({ puzzle, state, locked, selected, onSelect, onLetter, open }) {
  const plain = decryptWith(puzzle, state);
  const slot = selected ?? 0;
  const counts = slotCounts(puzzle.cipher, puzzle.keyLen, slot);
  const top = counts.indexOf(Math.max(...counts));
  const shift = (i, d) => {
    if (!open || locked.includes(i)) return;
    onSelect(i);
    const cur = state.key[i] ? ABC.indexOf(state.key[i]) : d > 0 ? -1 : 0;
    onLetter(ABC[(cur + d + 26) % 26], i);
  };
  return (
    <div className="flex flex-col gap-3">
      <CipherText cipher={puzzle.cipher} plain={plain} selected={slot} onSelect={open ? onSelect : null} slotOf={(li) => li % puzzle.keyLen} />
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Key">
        {state.key.map((k, i) => (
          <div key={i} className={`flex flex-col items-center rounded-2xl p-1.5 ring-1 ring-inset ${slot === i ? 'bg-emerald-50 ring-emerald-400' : 'bg-white ring-slate-200'}`}>
            <button type="button" onClick={() => shift(i, 1)} disabled={!open || locked.includes(i)} className="h-9 w-11 rounded-lg text-slate-500 disabled:opacity-30" aria-label={`Key slot ${i + 1} next letter`}>▲</button>
            <button type="button" onClick={() => onSelect(i)} className="h-11 w-11 rounded-lg font-mono text-xl font-black text-[#1b2456]" aria-label={`Key slot ${i + 1}: ${k || 'empty'}`}>
              {k || '·'}
            </button>
            <button type="button" onClick={() => shift(i, -1)} disabled={!open || locked.includes(i)} className="h-9 w-11 rounded-lg text-slate-500 disabled:opacity-30" aria-label={`Key slot ${i + 1} previous letter`}>▼</button>
            <span className="text-[0.6rem] font-bold text-slate-400">{locked.includes(i) ? 'fixed' : `slot ${i + 1}`}</span>
          </div>
        ))}
      </div>
      <FreqChart counts={counts} selected={ABC[top]} label={`Letters under key slot ${slot + 1}`} />
      <p className="text-center text-xs text-slate-500">
        Most common here: <span className="font-mono font-black text-slate-700">{ABC[top]}</span>.
      </p>
      <LetterPad onLetter={(p) => onLetter(p, slot)} disabled={!open || locked.includes(slot)} />
    </div>
  );
}

function TransBoard({ puzzle, state, selected, onSelect, onArrange, open }) {
  const strips = state.arrangement.map((i) => puzzle.strips[i]);
  const reading = decryptWith(puzzle, state);
  const swap = (a, b) => {
    const arrangement = [...state.arrangement];
    [arrangement[a], arrangement[b]] = [arrangement[b], arrangement[a]];
    onArrange(arrangement);
  };
  const tapStrip = (pos) => {
    if (!open) return;
    if (selected === null) { onSelect(pos); return; }
    if (selected !== pos) swap(selected, pos);
    onSelect(null);
  };
  const rows = strips[0].length;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-slate-500">{selected === null ? 'Tap a strip, then the strip to swap it with.' : `Strip ${selected + 1} picked — tap another to swap.`}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:gap-2" role="group" aria-label="Column strips">
        {strips.map((s, pos) => (
          <div key={state.arrangement[pos]} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => tapStrip(pos)}
              aria-pressed={selected === pos}
              aria-label={`Strip ${pos + 1}: ${s}`}
              className={`flex flex-col rounded-xl px-1.5 py-1 ring-1 transition ring-inset sm:px-2 ${selected === pos ? 'bg-emerald-100 ring-emerald-500' : 'bg-slate-900 ring-slate-700'}`}
            >
              {[...s].map((ch, r) => (
                <span key={r} className={`font-mono text-lg leading-7 font-black ${selected === pos ? 'text-emerald-800' : 'text-emerald-300'}`}>{ch}</span>
              ))}
            </button>
            <div className="flex gap-0.5">
              <button type="button" disabled={!open || pos === 0} onClick={() => swap(pos, pos - 1)} className="h-8 w-7 rounded text-slate-500 disabled:opacity-25" aria-label={`Move strip ${pos + 1} left`}>◀</button>
              <button type="button" disabled={!open || pos === strips.length - 1} onClick={() => swap(pos, pos + 1)} className="h-8 w-7 rounded text-slate-500 disabled:opacity-25" aria-label={`Move strip ${pos + 1} right`}>▶</button>
            </div>
          </div>
        ))}
      </div>
      <div className="w-full rounded-2xl bg-white p-3 ring-1 ring-slate-200 ring-inset">
        <p className="text-[0.62rem] font-black tracking-[0.14em] text-slate-500 uppercase">Rows read across</p>
        <p className="mt-1 font-mono text-base leading-relaxed font-bold tracking-[0.12em] break-all text-[#1b2456]">
          {Array.from({ length: rows }, (_, r) => reading.slice(r * strips.length, (r + 1) * strips.length)).join(' · ')}
        </p>
      </div>
    </div>
  );
}
