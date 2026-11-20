import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { ROLE_LABEL, argumentConfig, argumentRoundMax, makeArgumentLevel, scoreTags } from '../../data/bands/gArgument';
import { Eyebrow, Panel, Status, btnPrimary } from './GVerbalKit';
import { freshSeed } from './gDrag';

const ROLE_TONE = {
  premise: 'bg-sky-50 text-sky-800 ring-sky-300',
  conclusion: 'bg-violet-100 text-violet-800 ring-violet-400',
  assumption: 'bg-amber-50 text-amber-800 ring-amber-300',
  irrelevant: 'bg-slate-100 text-slate-600 ring-slate-300'
};

/** Argument Analyzer: tag each line of an argument, then pick the statement that would weaken (or strengthen) it. */
export default function ArgumentAnalyzer({ onExit }) {
  const progress = useGameProgress('argument-analyzer', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = argumentConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeArgumentLevel(seeded(freshSeed()), config));
  const max = rounds.reduce((n, r) => n + argumentRoundMax(r), 0);
  const pass = Math.ceil(max * 0.65);
  const [index, setIndex] = useState(0);
  const [tags, setTags] = useState([]);
  const [phase, setPhase] = useState('tag'); // tag → choose → done
  const [choice, setChoice] = useState(null);
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  const over = index >= rounds.length;
  const round = over ? null : rounds[index];
  const all = round ? [...round.lines, ...round.unstated] : [];
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points });

  const cycle = (i) => {
    if (phase !== 'tag') return;
    const next = [...tags];
    const at = config.roles.indexOf(next[i]);
    next[i] = config.roles[(at + 1) % config.roles.length];
    setTags(next);
  };

  const checkTags = () => {
    const right = scoreTags(round, tags);
    if (right === all.length) sfx.right(); else sfx.wrong();
    setPoints(points + right);
    setTally({ correct: tally.correct + right, wrong: tally.wrong + all.length - right });
    setPhase('choose');
  };

  const pick = (opt) => {
    if (phase !== 'choose') return;
    const ok = opt === round.answer;
    if (ok) sfx.right(); else sfx.wrong();
    setChoice(opt);
    setPoints(points + (ok ? 2 : 0));
    setTally({ correct: tally.correct + (ok ? 1 : 0), wrong: tally.wrong + (ok ? 0 : 1) });
    setPhase('done');
  };

  const next = () => { setIndex(index + 1); setTags([]); setChoice(null); setPhase('tag'); };

  const tagsRight = round && phase !== 'tag' ? scoreTags(round, tags) : 0;
  const allTagged = all.every((_, i) => tags[i]);

  const line = (l, i, unstated) => {
    const tag = tags[i];
    const judged = phase !== 'tag';
    const ok = judged && tag === l.role;
    return (
      <li key={i} className={`flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:items-center sm:gap-3 ${unstated ? 'border border-dashed border-slate-300 bg-slate-50/60' : 'bg-[#f7f6fd]'}`}>
        <p className={`flex-1 text-sm leading-relaxed text-[#1b2456] sm:text-base ${unstated ? 'italic' : ''}`}>{l.text}</p>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={() => cycle(i)}
            disabled={judged}
            aria-label={`Tag for: ${l.text}. Now ${tag ? ROLE_LABEL[tag] : 'untagged'}. Tap to change.`}
            className={`fp-press min-h-11 min-w-[9.5rem] rounded-xl px-3 py-2 text-sm font-bold ring-2 ring-inset transition ${
              tag ? ROLE_TONE[tag] : 'bg-white text-slate-400 ring-[#d9d4f3] hover:ring-indigo-400'
            } ${judged ? (ok ? 'outline-2 outline-offset-2 outline-emerald-500' : 'gs-wrong outline-2 outline-offset-2 outline-rose-400') : ''}`}
          >
            {tag ? ROLE_LABEL[tag] : 'Tap to tag'}
          </button>
          {judged && !ok && <span className="text-xs font-semibold text-emerald-700">It is: {ROLE_LABEL[l.role]}</span>}
        </div>
      </li>
    );
  };

  const kindWord = round?.kind === 'weaken' ? 'WEAKEN' : 'STRENGTHEN';
  const status = !round
    ? ''
    : phase === 'tag'
      ? allTagged ? 'All lines tagged — check them when ready.' : 'Tap each tag to cycle: ' + config.roles.map((r) => ROLE_LABEL[r]).join(' → ') + '.'
      : phase === 'choose'
        ? `${tagsRight} of ${all.length} tags right. Now: which statement would most ${round.kind} the argument?`
        : choice === round.answer ? 'Exactly — that statement attacks (or shores up) the gap the argument depends on.' : 'Not that one. The highlighted statement targets the argument\'s hidden assumption.';

  return (
    <GameShell
      title="Argument Analyzer"
      blurb="Take an argument apart, then find its weak point."
      tone="bg-gradient-to-br from-violet-700 to-slate-900"
      variant="premium"
      score={`${points}/${max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Read each short argument. Tap every line to tag it as ${config.roles.map((r) => ROLE_LABEL[r].toLowerCase()).join(', ')}${config.assumption ? ' (dashed lines are not in the passage: decide whether the argument needs them)' : ''}. Then pick the one added statement that would most weaken — or strengthen — it. 1 point per tag, 2 for the statement; ${pass} of ${max} clears the level.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: points >= pass,
              stars,
              headline: points >= pass ? `Level ${progress.level} cleared` : 'The logic slipped',
              detail: `${points} of ${max} points across ${rounds.length} arguments`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-slate-500">Argument {Math.min(index + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && round && (
        <div className="mx-auto grid w-full max-w-3xl gap-3">
          <Panel label="Argument">
            <Eyebrow>The argument</Eyebrow>
            <ol className="grid gap-2">{round.lines.map((l, i) => line(l, i, false))}</ol>
            {round.unstated.length > 0 && (
              <>
                <p className="mt-3 mb-2 text-[0.65rem] font-bold tracking-[0.14em] text-slate-500 uppercase">Not stated in the argument</p>
                <ol className="grid gap-2">{round.unstated.map((l, j) => line(l, round.lines.length + j, true))}</ol>
              </>
            )}
            {phase === 'tag' && (
              <div className="mt-3 flex justify-center">
                <button type="button" className={btnPrimary} disabled={!allTagged} onClick={checkTags}>Check tags</button>
              </div>
            )}
          </Panel>

          {phase !== 'tag' && (
            <Panel label="Evaluate">
              <Eyebrow>
                Which statement, if true, would most <span className={round.kind === 'weaken' ? 'text-rose-600' : 'text-emerald-600'}>{kindWord}</span> the argument?
              </Eyebrow>
              <div className="grid gap-2">
                {round.options.map((o, i) => {
                  const right = o === round.answer;
                  const cls = phase === 'done'
                    ? right ? 'bg-emerald-50 text-emerald-800 ring-emerald-400' : choice === o ? 'bg-rose-50 text-rose-700 ring-rose-300' : 'bg-white text-slate-400 ring-[#e4e1f5]'
                    : 'bg-white text-[#1b2456] ring-[#d9d4f3] hover:ring-indigo-400';
                  return (
                    <button key={o} type="button" disabled={phase !== 'choose'} onClick={() => pick(o)} className={`fp-press flex min-h-11 gap-2 rounded-xl px-3 py-2 text-left text-sm ring-2 ring-inset sm:text-base ${cls}`}>
                      <span className="font-black text-slate-400">{String.fromCharCode(65 + i)}</span>
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {phase === 'done' && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span className="font-bold">Hidden assumption:</span> {round.arg.a}
                </p>
              )}
            </Panel>
          )}

          <Status tone={phase === 'done' ? (choice === round.answer ? 'good' : 'bad') : 'idle'}>{status}</Status>
          {phase === 'done' && (
            <div className="flex justify-center">
              <button type="button" className={btnPrimary} onClick={next} autoFocus>
                {index + 1 >= rounds.length ? 'See result' : 'Next argument'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
