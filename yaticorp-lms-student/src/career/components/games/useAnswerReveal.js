import { useEffect, useRef, useState } from 'react';
import { sfx } from './gameSfx';

/** How long a wrong answer stays on screen, the right one shown beside it, before the game moves on. */
export const WRONG_REVEAL_MS = 1200;

/** The option classes while a wrong answer is being shown: the right one green, the pick red (shaking), the rest faded. */
export const REVEAL_TONE = {
  right: '!bg-emerald-500 !text-white !ring-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]',
  wrong: '!bg-rose-500 !text-white !ring-rose-500 gs-wrong',
  dim: 'opacity-45'
};

/**
 * The one wrong-answer moment shared by the games (2026-11-06): the wrong buzz, the pick marked red and the right
 * answer green, a pause, then the game goes on. While it shows, `busy` is true: the options take no taps.
 *
 *   const { busy, showWrong, toneOf } = useAnswerReveal();
 *   onWrong: showWrong(picked, correct, () => nextQuestion());
 *   <button disabled={busy} className={`... ${toneOf(option)}`}>
 */
export default function useAnswerReveal(ms = WRONG_REVEAL_MS) {
  const [reveal, setReveal] = useState(null); // { picked, correct }
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const showWrong = (picked, correct, then) => {
    sfx.wrong();
    clearTimeout(timer.current);
    setReveal({ picked, correct });
    timer.current = setTimeout(() => {
      setReveal(null);
      then?.();
    }, ms);
  };

  const state = (option) => (!reveal ? null : option === reveal.correct ? 'right' : option === reveal.picked ? 'wrong' : 'dim');
  const toneOf = (option) => REVEAL_TONE[state(option)] || '';

  return { reveal, busy: !!reveal, showWrong, state, toneOf };
}
