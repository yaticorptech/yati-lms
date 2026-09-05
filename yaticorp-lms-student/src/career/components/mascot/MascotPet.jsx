import { useEffect, useRef, useState } from 'react';
import { MousePointerClick, X } from 'lucide-react';
import Mascot from './Mascot';
import { occupancy, contentBounds as bounds, overlaps } from './placement';
import { HELP } from './guideSteps';

/**
 * 🦉 The CareerPath companion.
 *
 * It turns up at moments that matter, reacts like a character, and goes:
 *
 *   ARRIVE    a page has a button worth pressing → it walks in, waves hello
 *             the first time, stands beside the button, looks at it, points
 *             at it again and again, says its line, then walks out.
 *   NUDGE     the button was ignored for a while → once more, gently.
 *   TASK      a task is opened → a confident nod: "Let's do this!"
 *   QUIZ      a quiz begins → an encouraging pump; then it stands beside the
 *             quiz, thinking, while the student answers; a pass earns the
 *             full dance, a miss a droop and then encouragement.
 *   GAME      the rules are on screen → it explains them with gestures;
 *             a win earns the dance, a loss a droop and "try again".
 *   CHEER     XP went up → claps, then dances.
 *   GOODBYE   the day's plan is cleared → waves goodbye.
 *   ASK       the seated mascot in the sidebar card is tapped → help menu.
 *
 * Every pose is an unaltered official cut-out; every gesture moves the whole
 * image. Under prefers-reduced-motion it appears in place instead of walking.
 */
const SHOW_MS = 6000;
const NUDGE_AFTER_MS = 45000;
const rand = (a, b) => a + Math.random() * (b - a);

const onScreen = (r) =>
  r.width >= 56 && r.height >= 28 && r.bottom > 88 && r.top < window.innerHeight - 24 && r.right > 0 && r.left < window.innerWidth;

// Gesture sequences: pose + whole-image motion + line + how long.
const ACTS = {
  taskStart: [{ pose: 'thumbs', motion: 'mc-nod-once', text: "Let's do this! 🫡", ms: 2800 }],
  quizStart: [{ pose: 'flex', motion: 'mc-encourage', text: "You've got this! One question at a time.", ms: 3000 }],
  quizPass: [
    { pose: 'hooray', motion: 'mc-clap', text: 'Yes! 👏', ms: 1400 },
    { pose: 'confetti', motion: 'mc-dance', text: 'You cleared it! 🎉 Amazing work!', ms: 4200 }
  ],
  quizFail: [
    { pose: 'sad', motion: 'mc-sad', text: 'Oh… not this time.', ms: 1800 },
    { pose: 'flex', motion: 'mc-encourage', text: "Good try! Let's give it another shot!", ms: 3400 }
  ],
  gameWin: [
    { pose: 'jump', motion: 'mc-jump', text: 'Woohoo! 👏', ms: 1400 },
    { pose: 'star', motion: 'mc-dance', text: 'You won! 🎉 That was brilliant!', ms: 4200 }
  ],
  gameLose: [
    { pose: 'worried', motion: 'mc-sad', text: 'Aww…', ms: 1600 },
    { pose: 'flex', motion: 'mc-encourage', text: "Almost there! Don't give up. Try again!", ms: 3400 }
  ],
  cheer: (text) => [
    { pose: 'hooray', motion: 'mc-clap', text: 'Great job! 👏', ms: 1500 },
    { pose: 'star', motion: 'mc-dance', text, ms: 3200 }
  ],
  goodbye: [
    { pose: 'heart', motion: 'mc-nod-once', text: "That's the whole day done! Proud of you.", ms: 2400 },
    { pose: 'bye', motion: 'mc-wave-whole', text: 'See you tomorrow 👋', ms: 3000 }
  ]
};

// While it holds on a button it keeps the one instructing pose, pointing,
// so there is never any doubt what it is asking for; only the line and the
// small movement change, so it does not look stuck.
const HOLD_ROUTINE = [
  { pose: 'point', motion: 'mc-point-pulse', ms: 5000 },
  { pose: 'point', motion: 'mc-nod-once', line: 'Come on, let\'s go! 💪', ms: 2600 },
  { pose: 'point', motion: 'mc-point-pulse', ms: 4000 },
  { pose: 'point', motion: 'mc-bounce', line: 'Just one click — 10 XP is waiting!', ms: 2200 },
  { pose: 'point', motion: 'mc-point-pulse', ms: 4000 },
  { pose: 'point', motion: 'mc-float', line: 'Hmm… whenever you\'re ready 😊', ms: 3000 },
  { pose: 'point', motion: 'mc-nod-once', line: 'You\'ve got this. Let\'s start!', ms: 2600 },
  { pose: 'point', motion: 'mc-point-pulse', ms: 4000 },
  { pose: 'point', motion: 'mc-float', line: 'No rush. I\'ll wait right here.', ms: 3200 },
  { pose: 'point', motion: 'mc-point-pulse', ms: 4000 },
  { pose: 'point', motion: 'mc-peek', line: 'I\'ll be right here 😉', ms: 2200 }
];

export default function MascotPet({ small, cheer, menu, setMenu, steps, pathname, onStartTour, onGo, onHide }) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const vw = window.innerWidth;
  const height = small ? 88 : vw < 1280 ? 128 : 160;
  const width = Math.round(height * 0.8);

  const [phase, setPhase] = useState('away'); // away | in | greet | point | act | think | out | menu
  const [pos, setPos] = useState({ x: -400, y: window.innerHeight - 300 });
  const [dir, setDir] = useState(1);
  const [focus, setFocus] = useState(null); // { el, rect, side }
  const [act, setAct] = useState(null); // { pose, motion, text }
  const [bubbleAt, setBubbleAt] = useState(null); // which side of the mascot the bubble sits, when chosen
  const [line, setLine] = useState(null);
  const [idleWink, setIdleWink] = useState(false);
  const [beat, setBeat] = useState(null); // current step of the hold routine
  const present = phase !== 'away';
  const posRef = useRef(pos);
  const anchor = useRef(null); // where it stands relative to the button it points at
  const raf = useRef(null);
  const timer = useRef(null);
  const nudgeTimer = useRef(null);
  const shown = useRef(new Set());
  const nudged = useRef(new Set());
  const clicked = useRef(new Set());
  const greeted = useRef(false);
  const busy = useRef(false);
  const thinkingRef = useRef(false);
  const [loading, setLoading] = useState(false);

  // While a page is loading the mascot is not on it at all.
  useEffect(() => {
    const onLoading = (e) => setLoading(Boolean(e.detail));
    window.addEventListener('mascot:loading', onLoading);
    return () => window.removeEventListener('mascot:loading', onLoading);
  }, []);
  useEffect(() => {
    if (!loading) return;
    clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
    setFocus(null);
    setLine(null);
    setAct(null);
    setBubbleAt(null);
    setPhase('away');
    busy.current = false;
  }, [loading]);

  useEffect(() => {
    shown.current = new Set();
    nudged.current = new Set();
    clicked.current = new Set();
    greeted.current = false;
    clearTimeout(nudgeTimer.current);
  }, [pathname]);

  /* ---------------- Buttons worth showing ---------------- */

  const isRealButton = (el) => {
    const tag = el.tagName;
    if (!(tag === 'A' || tag === 'BUTTON' || el.getAttribute('role') === 'button')) return false;
    if (el.closest('[aria-label="Career Path sections"]')) return false;
    if (el.closest('[data-mascot]')) return false;
    if (el.closest('nav[aria-label="Main sections"]')) return false;
    if (/ai mentor/i.test(el.getAttribute('aria-label') || '')) return false;
    return !el.disabled;
  };

  const buttons = () =>
    steps
      .filter((st) => st.target && st.pet)
      .map((st) => {
        const el = document.querySelector(`[data-guide="${st.target}"]`);
        if (!el || !isRealButton(el)) return null;
        const r = el.getBoundingClientRect();
        return { el, r, key: st.target, text: st.text, hold: !!st.hold };
      })
      .filter((b) => b && onScreen(b.r) && getComputedStyle(b.el).visibility !== 'hidden')
      .sort((a, b) => a.r.top - b.r.top);

  /* ---------------- Standing room ---------------- */

  const contentBounds = () => bounds(width);

  const clamp = (x, y) => {
    const c = contentBounds();
    return {
      x: Math.max(c.left, Math.min(c.right - width, x)),
      y: Math.max(72, Math.min(window.innerHeight - height - (small ? 96 : 12), y))
    };
  };

  // The four places the speech bubble can sit around the mascot at (x, y).
  const bubbleBoxes = (x, y) => {
    const bw = small ? Math.min(240, window.innerWidth - 32) : 270;
    const bh = 72;
    const bl = x + Math.min(0, window.innerWidth - x - bw - 12);
    return {
      above: { left: bl, right: bl + bw, top: y - 8 - bh, bottom: y - 8 },
      below: { left: bl, right: bl + bw, top: y + height + 8, bottom: y + height + 8 + bh },
      right: { left: x + width + 8, right: x + width + 8 + bw, top: y + 4, bottom: y + 4 + bh },
      left: { left: x - 8 - bw, right: x - 8, top: y + 4, bottom: y + 4 + bh }
    };
  };

  // What the mascot and its speech bubble would hide if it stood at (x, y),
  // with the bubble on whichever side hides least. The picture has clear
  // margins, so its box is inset a little.
  const hides = (x, y) => {
    const body = { left: x + width * 0.15, right: x + width * 0.85, top: y + height * 0.1, bottom: y + height };
    const boxes = bubbleBoxes(x, y);
    let bubble = 'above';
    let bubbleScore = Infinity;
    ['above', 'right', 'left', 'below'].forEach((side) => {
      const sc = occupancy(boxes[side], 5, 3);
      if (sc < bubbleScore - 0.02) {
        bubble = side;
        bubbleScore = sc;
      }
    });
    return { score: occupancy(body) + 0.6 * bubbleScore, bubble };
  };

  // Where to stand for a button so that nothing else is hidden. Spots are
  // tried either side of it at different heights and then, if those are
  // taken (a chip or a sentence usually sits right next to a button), further
  // along the same row, then below and above. Each is scored by how much of
  // the page it and the bubble would cover, plus a little for distance, so
  // it stands as close as it can without sitting on anything readable. The
  // mascot is taller than any button, so "beside" alone would always put its
  // head over whatever sits above the button; sliding down to stand level
  // with it, or moving along to empty ground, is what keeps the words clear.
  const standingSpot = (rect) => {
    const c = contentBounds();
    const ys = [
      rect.top + rect.height / 2 - height * 0.55,
      rect.top - height * 0.12,
      rect.bottom - height,
      rect.top + rect.height / 2 - height * 0.3
    ];
    const options = [];
    for (let dx = 16, n = 0; n < 7 && rect.right + dx + width <= c.right; dx += 72, n += 1) {
      ys.forEach((y) => options.push({ ...clamp(rect.right + dx, y), side: 'left', far: dx - 16 }));
    }
    for (let dx = 16, n = 0; n < 7 && rect.left - dx - width >= c.left; dx += 72, n += 1) {
      ys.forEach((y) => options.push({ ...clamp(rect.left - dx - width, y), side: 'right', far: dx - 16 }));
    }
    options.push({ ...clamp(rect.left, rect.bottom + 12), side: 'up', far: 0 });
    options.push({ ...clamp(rect.right - width, rect.bottom + 12), side: 'up', far: 0 });
    options.push({ ...clamp(rect.left, rect.top - height - 12), side: 'down', far: 0 });
    options.push({ ...clamp(rect.right - width, rect.top - height - 12), side: 'down', far: 0 });
    const me = (o) => ({ left: o.x, right: o.x + width, top: o.y, bottom: o.y + height });
    let best = { ...options[0], bubble: 'above' };
    let bestScore = Infinity;
    options.forEach((o) => {
      if (overlaps(me(o), rect, 4)) return;
      const { score, bubble } = hides(o.x, o.y);
      const total = score + (o.far / 100) * 0.12;
      if (total < bestScore - 0.02) {
        best = { ...o, bubble };
        bestScore = total;
      }
    });
    return best;
  };

  const contentLeft = () => {
    const main = document.querySelector('main');
    return main ? Math.max(8, main.getBoundingClientRect().left + 24) : 16;
  };
  // A bottom corner of the content column: the left one unless the right
  // one has emptier ground beneath it.
  const cornerSpot = () => {
    const y = window.innerHeight - height - (small ? 96 : 16);
    const c = contentBounds();
    const l = clamp(contentLeft(), y);
    const r = clamp(c.right - width - 16, y);
    return hides(l.x, l.y).score <= hides(r.x, r.y).score + 0.02 ? l : r;
  };
  // Beside a big element (the quiz, a game) if one is on screen, else the corner.
  const besideSpot = (guide) => {
    const el = guide && document.querySelector(`[data-guide="${guide}"]`);
    const r = el?.getBoundingClientRect();
    if (r && onScreen(r)) return { ...standingSpot(r), rect: r };
    return { ...cornerSpot(), side: 'right' };
  };

  /* ---------------- Movement ---------------- */

  const later = (fn, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  const leave = (then) => {
    setFocus(null);
    setLine(null);
    setAct(null);
    setPhase('out');
    cancelAnimationFrame(raf.current);
    setTimeout(() => {
      setPhase('away');
      busy.current = false;
      then?.();
    }, reduced ? 0 : 380);
  };

  // Play a gesture sequence at a spot, then leave (or hand over).
  const perform = (seq, spot, then) => {
    clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
    busy.current = true;
    setFocus(null);
    posRef.current = { x: spot.x, y: spot.y };
    setPos(posRef.current);
    setDir(spot.side === 'left' ? -1 : 1);
    setPhase('act');
    const run = (i) => {
      if (i >= seq.length) return then ? then() : leave();
      const step = seq[i];
      setAct({ pose: step.pose, motion: step.motion });
      setLine(step.text);
      later(() => run(i + 1), step.ms);
    };
    run(0);
  };

  const show = (b, text) => {
    if (busy.current) return;
    busy.current = true;
    const spot = standingSpot(b.r);
    anchor.current = { dx: spot.x - b.r.left, dy: spot.y - b.r.top, side: spot.side };
    posRef.current = { x: spot.x, y: spot.y };
    setPos(posRef.current);
    setBubbleAt(spot.bubble || null);
    setPhase('in');
    // It appears in place: a short pop, then it is there.
    later(() => {
      shown.current.add(b.key);
      setDir(spot.side === 'left' ? -1 : 1);
      const point = () => {
        setPhase('point');
        setFocus({ el: b.el, side: spot.side, rect: b.el.getBoundingClientRect(), key: b.key, hold: b.hold });
        setLine(text);
        // A held button keeps it here, pointing, until the click happens.
        if (b.hold) return;
        later(() => {
          leave();
          clearTimeout(nudgeTimer.current);
          nudgeTimer.current = setTimeout(() => {
            if (nudged.current.has(b.key) || busy.current || menu) return;
            const again = buttons().find((x) => x.key === b.key);
            if (again) {
              nudged.current.add(b.key);
              show(again, `Still here? ${text}`);
            }
          }, NUDGE_AFTER_MS);
        }, SHOW_MS);
      };
      // First time on a page it waves hello before it points.
      if (!greeted.current) {
        greeted.current = true;
        setPhase('greet');
        setLine('Hi there! 👋');
        later(point, 1500);
      } else point();
    }, reduced ? 0 : 450);
  };

  const arrive = () => {
    if (loading || busy.current || menu || cheer || thinkingRef.current) return;
    const fresh = buttons().filter((b) => (b.hold ? !clicked.current.has(b.key) : !shown.current.has(b.key)));
    if (fresh.length > 0) show(fresh[0], fresh[0].text);
  };

  useEffect(() => {
    const t = setTimeout(arrive, rand(900, 1600));
    let st = null;
    const onScroll = () => {
      clearTimeout(st);
      st = setTimeout(arrive, 600);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      clearTimeout(t);
      clearTimeout(st);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, steps, menu, cheer, loading]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(nudgeTimer.current);
      cancelAnimationFrame(raf.current);
    },
    []
  );

  /* ---------------- Moments announced by the pages ---------------- */

  useEffect(() => {
    const on = (name, fn) => {
      window.addEventListener(name, fn);
      return () => window.removeEventListener(name, fn);
    };
    const offs = [
      on('mascot:task-start', () => perform(ACTS.taskStart, cornerSpot())),
      on('mascot:quiz-start', () => {
        thinkingRef.current = true;
        const spot = besideSpot('quiz');
        // Wish luck, then settle beside the quiz and think while they answer.
        perform(ACTS.quizStart, spot, () => {
          setAct({ pose: 'confused', motion: 'mc-think' });
          setLine(null);
          setPhase('think');
        });
      }),
      on('mascot:quiz-result', (e) => {
        thinkingRef.current = false;
        perform(e.detail?.passed ? ACTS.quizPass : ACTS.quizFail, besideSpot('quiz'));
      }),
      on('mascot:quiz-end', () => {
        thinkingRef.current = false;
        if (phase === 'think') leave();
      }),
      // A level briefing carries its own coach (the mascot in the card
      // explaining the game), so the guide does not turn up as well.
      on('mascot:game-start', () => {
        if (busy.current) leave();
      }),
      // A level's verdict is celebrated by the result card itself (the
      // mascot dances or encourages inside it), so the guide stays out of it
      // rather than turning up as a second copy.
      on('mascot:game-result', () => {
        if (busy.current) leave();
      }),
      on('mascot:section-complete', () => perform(ACTS.goodbye, cornerSpot()))
    ];
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, small]);

  // XP went up: clap, then dance.
  useEffect(() => {
    if (!cheer) return undefined;
    perform(ACTS.cheer(cheer), cornerSpot());
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheer]);

  // Help menu: appear at the corner with it; leave when it closes.
  useEffect(() => {
    if (menu) {
      clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
      busy.current = true;
      setFocus(null);
      setAct(null);
      setLine(null);
      posRef.current = cornerSpot();
      setPos(posRef.current);
      setPhase('menu');
    } else if (phase === 'menu') {
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  // While pointing, stay glued to the button; stop if it is clicked or gone.
  useEffect(() => {
    if (!focus) return undefined;
    const follow = () => {
      const rect = focus.el.getBoundingClientRect();
      if (!onScreen(rect)) {
        clearTimeout(timer.current);
        leave();
        return;
      }
      // Keep the relation chosen when it arrived rather than re-judging the
      // whole page on every scroll tick.
      const a = anchor.current;
      const spot = a ? { ...clamp(rect.left + a.dx, rect.top + a.dy), side: a.side } : standingSpot(rect);
      posRef.current = { x: spot.x, y: spot.y };
      setPos(posRef.current);
      setFocus((f) => (f ? { ...f, rect, side: spot.side } : f));
    };
    const onClick = () => {
      if (focus.key) clicked.current.add(focus.key);
      clearTimeout(timer.current);
      clearTimeout(nudgeTimer.current);
      leave();
    };
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    focus.el.addEventListener('click', onClick, { once: true });
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
      focus.el.removeEventListener('click', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.el]);

  /* ---------------- Its home in the sidebar ---------------- */

  const [home, setHome] = useState(null);
  useEffect(() => {
    const find = () => {
      const el = document.getElementById('mascot-home');
      setHome(el && el.offsetParent !== null ? el : null);
    };
    find();
    window.addEventListener('resize', find);
    const t = setInterval(find, 2000);
    return () => {
      window.removeEventListener('resize', find);
      clearInterval(t);
    };
  }, [pathname]);
  // The seated mascot in the sidebar card asks for help on tap.
  useEffect(() => {
    const ask = () => setMenu(true);
    window.addEventListener('mascot:ask', ask);
    return () => window.removeEventListener('mascot:ask', ask);
  }, [setMenu]);

  // Holding on a button: cycle the routine so the wait has life in it.
  useEffect(() => {
    if (phase !== 'point' || !focus?.hold) {
      setBeat(null);
      return undefined;
    }
    let i = 0;
    let t = null;
    const base = line;
    const tick = () => {
      const step = HOLD_ROUTINE[i % HOLD_ROUTINE.length];
      setBeat(step);
      setLine(step.line || base);
      i += 1;
      t = setTimeout(tick, step.ms);
    };
    tick();
    return () => {
      clearTimeout(t);
      setBeat(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focus?.key]);

  // Resting is never still: every so often it looks up and winks.
  useEffect(() => {
    if (present) return undefined;
    const t = setInterval(() => {
      setIdleWink(true);
      setTimeout(() => setIdleWink(false), 1800);
    }, 14000);
    return () => clearInterval(t);
  }, [present]);

  /* ---------------- What to show ---------------- */

  let pose = 'point';
  let motion = 'mc-idle';
  if (phase === 'act' && act) {
    pose = act.pose;
    motion = act.motion;
  } else if (phase === 'think') {
    pose = 'confused';
    motion = 'mc-think';
  } else if (phase === 'greet') {
    pose = 'point';
    motion = 'mc-wave-whole';
  } else if (phase === 'menu') {
    pose = 'heart';
    motion = 'mc-peek';
  } else if (phase === 'out') {
    pose = act ? act.pose : 'point';
    motion = 'mc-out';
  } else if (phase === 'in') {
    pose = 'point';
    motion = 'mc-pop';
  } else if (phase === 'point') {
    pose = beat?.pose || 'point';
    motion = beat?.motion || 'mc-point-pulse';
  }

  const flip = phase === 'point' || phase === 'act' || phase === 'think' ? focus?.side === 'right' || dir < 0 : false;
  const speech = phase === 'menu' ? null : line;
  const bubbleW = small ? Math.min(240, vw - 32) : 270;
  const bubbleLeft = Math.min(0, vw - pos.x - bubbleW - 12);
  // Where the bubble sits: the side chosen when it took its spot, else above
  // unless that would run off the top.
  const bubbleSide = (phase === 'point' && bubbleAt) || (pos.y > 150 ? 'above' : 'below');
  const bubbleClass = {
    above: 'bottom-full mb-2',
    below: 'top-full mt-2',
    right: 'left-full top-1 ml-2',
    left: 'right-full top-1 mr-2'
  }[bubbleSide];
  const arrowClass = {
    above: 'left-8 -bottom-2 border-r border-b',
    below: 'left-8 -top-2 border-t border-l',
    right: 'top-6 -left-2 border-b border-l',
    left: 'top-6 -right-2 border-t border-r'
  }[bubbleSide];
  const bubbleStyle = bubbleSide === 'above' || bubbleSide === 'below' ? { width: bubbleW, left: bubbleLeft } : { width: bubbleW };

  const homeAvatar = (
    <span
      data-mascot
      role="button"
      tabIndex={0}
      aria-label="CareerPath guide — need help?"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setMenu(true);
        }
      }}
      className="group relative inline-block cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <span aria-hidden className="mc-glow absolute inset-x-2 bottom-0 h-4 rounded-full bg-blue-400/40 blur-lg" />
      <Mascot pose={idleWink ? 'wink' : 'sit'} height={72} motion="mc-idle" className="relative transition-transform group-hover:scale-110" />
    </span>
  );

  return (
    <>
      {focus && (phase === 'point' || phase === 'act') && (
        <>
          <div
            aria-hidden
            className="mc-ring pointer-events-none fixed z-[45] rounded-2xl ring-2 ring-blue-500"
            style={{ top: focus.rect.top - 6, left: focus.rect.left - 6, width: focus.rect.width + 12, height: focus.rect.height + 12 }}
          />
          <span
            aria-hidden
            className="mc-tap pointer-events-none fixed z-[46] text-blue-600 drop-shadow"
            style={{ top: focus.rect.top + focus.rect.height / 2 - 4, left: focus.rect.left + focus.rect.width / 2 - 4 }}
          >
            <MousePointerClick className="h-7 w-7 fill-white" strokeWidth={2.2} />
          </span>
        </>
      )}

      {!present && !home && (
        <div data-mascot className="fixed z-40" style={{ left: 12, bottom: small ? 92 : 14 }}>
          {homeAvatar}
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide the guide for now"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow ring-1 ring-slate-200 transition-opacity hover:text-slate-700 [div:hover>&]:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {present && (
        <div
          data-mascot
          className="fixed z-40"
          style={{ left: pos.x, top: pos.y, width, height }}
        >
          {(speech || phase === 'menu') && (
            <div
              className={`mc-bubble absolute rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl ${bubbleClass}`}
              style={bubbleStyle}
            >
              <span aria-hidden className={`absolute h-4 w-4 rotate-45 border-blue-100 bg-white ${arrowClass}`} />
              {phase === 'menu' ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">Need help? I can guide you!</p>
                    <button type="button" onClick={() => setMenu(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">Where would you like to go?</p>
                  <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                    {HELP.map((o) => (
                      <li key={o.label}>
                        <button
                          type="button"
                          onClick={() => onGo(o)}
                          className="w-full rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-black text-blue-700 ring-1 ring-blue-100 ring-inset transition-colors hover:bg-blue-100"
                        >
                          {o.label}
                        </button>
                      </li>
                    ))}
                    {steps.length > 0 && (
                      <li className="col-span-2">
                        <button
                          type="button"
                          onClick={onStartTour}
                          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-md shadow-blue-500/30"
                        >
                          Show me around this page
                        </button>
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <p className={`text-sm font-bold ${phase === 'act' && /🎉|👏/.test(speech || '') ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {speech}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => (phase === 'menu' ? setMenu(false) : setMenu(true))}
            aria-label="CareerPath guide — need help?"
            aria-expanded={phase === 'menu'}
            className="relative block h-full w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden className="mc-glow absolute inset-x-3 bottom-0 h-8 rounded-full bg-blue-300/50 blur-xl" />
            <Mascot pose={pose} height={height} motion={motion} flip={flip} className="relative mx-auto" />
          </button>
        </div>
      )}
    </>
  );
}
