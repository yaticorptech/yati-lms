import { useEffect, useState } from 'react';
import MascotRenderer from '../components/mascot/MascotRenderer';
import mascot from '../components/mascot/mascotBus';
import { CLIPS, CANONICAL, INPUTS, RIVE_SRC, STATE_MACHINE, riveEnabled } from '../components/mascot/riveConfig';
import { STATES } from '../components/mascot/mascotStates';

/**
 * 🔬 The mascot lab: the rig on a bench, on its own, before it goes anywhere
 * near a Career Path page.
 *
 * Two jobs. It drives every animation the rig is meant to have, so each one
 * can be watched and the transitions between them judged. And it runs the
 * identity checkpoint: the rig held in its canonical pose, laid directly over
 * point.png, with a slider to fade between them and a difference mode that
 * makes any drift glow. If the two do not sit on top of one another, the rig
 * is wrong and nothing ships.
 *
 * Reached at /career/mascot-lab. Nothing else links to it and nothing else
 * imports it: it is a workbench, not a feature.
 */

/* The eight the rig has to prove first, then everything else it must support. */
const FIRST_EIGHT = [
  ['idle', 'Idle breathing'],
  ['idle', 'Blink'],
  ['walking', 'Walk'],
  ['pointing', 'Point'],
  ['welcoming', 'Wave'],
  ['celebrating', 'Celebrate'],
  ['thinking', 'Thinking'],
  ['talking', 'Talking']
];

const REST = ['confused', 'encouraging', 'sad', 'tired', 'reading', 'focus', 'levelUp'];

/** The three things that must be the same picture. */
const ORIGINAL_SRC = '/mascot/point.png';
const PREPARED_SRC = '/mascot/prepared/canonical.png';

const STAGES = [
  { key: 'original', label: 'Original' },
  { key: 'prepared', label: 'Prepared' },
  { key: 'rive', label: 'Rig' }
];

const PAIRS = [
  { key: 'original-rive', label: 'Original against the rig' },
  { key: 'original-prepared', label: 'Original against the prepared stack' },
  { key: 'prepared-rive', label: 'Prepared stack against the rig' }
];

const Chip = ({ on, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${
      on ? 'bg-journey-600 text-white' : 'bg-surface text-ink-600 ring-1 ring-line-200 ring-inset hover:bg-surface-50'
    }`}
  >
    {children}
  </button>
);

export default function MascotLab() {
  /*
   * The bench drives its own renderer, which would otherwise be a second
   * mascot alongside the global one docked somewhere on the page. The rule is
   * at most one anywhere, so the global character stands down while the lab is
   * open and comes back the moment it closes.
   */
  useEffect(() => {
    mascot.hide();
    return () => mascot.dock();
  }, []);

  const [state, setState] = useState('idle');
  const [talking, setTalking] = useState(false);
  const [flip, setFlip] = useState(false);
  const [height, setHeight] = useState(300);

  // Identity checkpoint controls.
  const [overlay, setOverlay] = useState(0);
  const [difference, setDifference] = useState(false);
  const [pair, setPair] = useState('original-rive');
  const [present, setPresent] = useState({ original: true, prepared: false, rive: false });

  // Probe for the two artefacts that do not exist yet, so the tiles tell the
  // truth about what is actually on disk rather than assuming.
  useEffect(() => {
    let alive = true;
    const probe = (url) => fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    Promise.all([probe(PREPARED_SRC), probe('/mascot/mascot.riv')]).then(([prepared, rive]) => {
      if (alive) setPresent({ original: true, prepared, rive });
    });
    return () => {
      alive = false;
    };
  }, []);

  // The overlay image for the chosen pair. The rig is the live render
  // underneath, so comparing against it means laying nothing on top.
  const overlaySrc = pair === 'prepared-rive' ? PREPARED_SRC : ORIGINAL_SRC;

  const clip = STATES[state]?.clip;

  return (
    <div className="space-y-6 py-4">
      <header>
        <p className="text-[0.7rem] font-black tracking-[0.12em] text-journey-600 uppercase">Mascot lab</p>
        <h1 className="mt-1 text-2xl font-black text-ink-900">The rig on the bench</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Every animation the rig must have, driven one at a time, plus the identity checkpoint. Nothing
          here is wired to a Career Path page.
        </p>
      </header>

      {/* ---- Is there a rig at all? ------------------------------------- */}
      <section className="rounded-2xl border border-line-200 bg-surface p-4 shadow-card">
        <h2 className="text-xs font-black text-ink-900">Rig status</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {[
            ['Asset', RIVE_SRC],
            ['State machine', STATE_MACHINE],
            ['Inputs', Object.values(INPUTS).join(', ')],
            ['Clips expected', `${CLIPS.length}`],
            ['Canonical canvas', `${CANONICAL.width} x ${CANONICAL.height}`],
            ['Flag VITE_MASCOT_RIVE', riveEnabled() ? 'on' : 'off']
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 font-semibold text-ink-400">{k}</dt>
              <dd className="min-w-0 truncate font-mono text-ink-800">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
          If <span className="font-mono">mascot.riv</span> is not present the bench falls back to the
          official PNG artwork and the animation buttons will not move the character. That fallback is
          deliberate: the mascot must never break because a rig is missing.
        </p>
      </section>

      {/* ---- The bench --------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-2xl border border-line-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,transparent_0_50%)] bg-surface [background-size:20px_20px] p-6">
          <div className="relative mx-auto flex items-end justify-center" style={{ minHeight: height + 40 }}>
            {/* The rig, forced on so the bench works without setting the flag. */}
            <MascotRenderer
              state={state}
              height={height}
              flip={flip}
              talking={talking}
              forceRive
            />

            {/* Whichever of the three is being laid over the live render. */}
            {overlay > 0 && overlaySrc && (
              <img
                src={overlaySrc}
                alt=""
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{
                  height,
                  opacity: overlay / 100,
                  mixBlendMode: difference ? 'difference' : 'normal'
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line-200 bg-surface p-4 shadow-card">
            <h2 className="mb-2 text-xs font-black text-ink-900">The eight to prove first</h2>
            <div className="flex flex-wrap gap-1.5">
              {FIRST_EIGHT.map(([s, label]) => (
                <Chip
                  key={label}
                  on={state === s && (label !== 'Talking' || talking)}
                  onClick={() => {
                    setState(s);
                    setTalking(label === 'Talking');
                  }}
                >
                  {label}
                </Chip>
              ))}
            </div>

            <h2 className="mt-4 mb-2 text-xs font-black text-ink-900">The rest</h2>
            <div className="flex flex-wrap gap-1.5">
              {REST.map((s) => (
                <Chip key={s} on={state === s} onClick={() => { setState(s); setTalking(false); }}>
                  {s}
                </Chip>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip on={talking} onClick={() => setTalking((t) => !t)}>Mouth: {talking ? 'talking' : 'closed'}</Chip>
              <Chip on={flip} onClick={() => setFlip((f) => !f)}>Facing: {flip ? 'left' : 'right'}</Chip>
            </div>

            <label className="mt-4 block text-xs font-semibold text-ink-500">
              Size {height}px
              <input
                type="range"
                min="120"
                max="480"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="mt-1 w-full accent-journey-600"
              />
            </label>

            <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-400">
              State <span className="font-mono text-ink-600">{state}</span> plays clip{' '}
              <span className="font-mono text-ink-600">{clip}</span>. Changing a button sets one number
              on the state machine; Rive blends the skeleton from wherever it is to wherever that clip
              puts it. No image is swapped.
            </p>
          </div>

          {/* ---- The gate everything has to pass ------------------------- */}
          <div className="rounded-2xl border-2 border-journey-200 bg-journey-50/40 p-4">
            <h2 className="text-xs font-black text-journey-800">Identity checkpoint</h2>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-ink-600">
              Three things must be the same picture: the original artwork, the prepared layer stack
              flattened back to the canonical pose, and the rig holding that pose. Compare them in
              pairs. In difference mode a perfect match goes black; anything that glows has moved.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {STAGES.map((st) => (
                <div key={st.key} className="rounded-lg bg-surface p-2 text-center ring-1 ring-line-200 ring-inset">
                  <p className="text-[0.6rem] font-black text-ink-900">{st.label}</p>
                  <p className={`mt-0.5 text-[0.58rem] font-bold ${present[st.key] ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {present[st.key] ? 'present' : 'awaiting'}
                  </p>
                </div>
              ))}
            </div>

            <label className="mt-3 block text-xs font-semibold text-ink-600">
              Compare
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line-200 bg-surface px-2 py-1 text-[0.68rem] font-bold text-ink-700"
              >
                {PAIRS.map((p2) => (
                  <option key={p2.key} value={p2.key}>
                    {p2.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-semibold text-ink-600">
              Overlay {overlay}%
              <input
                type="range"
                min="0"
                max="100"
                value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="mt-1 w-full accent-journey-600"
              />
            </label>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip on={difference} onClick={() => setDifference((d) => !d)}>
                Difference {difference ? 'on' : 'off'}
              </Chip>
              <Chip on={false} onClick={() => { setState('pointing'); setOverlay(50); setTalking(false); setFlip(false); }}>
                Hold canonical pose
              </Chip>
              <Chip on={false} onClick={() => { setOverlay(0); setDifference(false); }}>Clear</Chip>
            </div>

            <p className="mt-3 text-[0.68rem] font-bold text-journey-800">
              If the three do not match, nothing ships. There is no partial pass here.
            </p>
            <p className="mt-1.5 text-[0.6rem] leading-relaxed text-ink-400">
              The prepared stack is expected at <span className="font-mono">{PREPARED_SRC}</span> and the
              rig at <span className="font-mono">/mascot/mascot.riv</span>. Neither exists yet, so those
              two tiles read as awaiting.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
