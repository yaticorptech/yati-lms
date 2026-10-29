/**
 * Linguistic Ability — a session: the screens of a lesson (or the placement
 * test, the daily challenge, revision) one at a time, full screen.
 *
 *   header   ✕ to quit, the progress bar, hearts (in a quiz), sound on/off
 *   screen   one exercise (exercises.jsx)
 *   footer   CHECK; once checked, a green or red sheet with the answer and
 *            why, and CONTINUE
 *
 * `mode`: 'each' checks every answer as it is given (`check` returns the
 * server's verdict); 'end' only collects the answers, judged when the
 * session is done (the placement test, the daily challenge). Practice answers
 * got wrong come back once at the end of the practice; a wrong quiz answer
 * costs a heart, and with none left the session ends. Enter checks and
 * continues; 1–9 pick an option.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Volume2, VolumeX, Check, Flame, RotateCcw, Send, ChevronsRight } from 'lucide-react';
import { useHideLoop } from '../../components/loopVisibility';
import { COLORS, chime, soundOn, setSoundOn, langFor } from '../meta';
import { tr, line } from '../say';
import { Chunky, Bar, Mascot } from '../ui';
import { Diff } from './Finish';
import { startValue, givenOf, answered, isInfo, sheetOf, xpIn } from './logic';
import { IntroStep, NotesStep, WordsStep, PassageStep, DialogueStep, PairsStep, QuestionStep, TranslateStep, WriteStep, SpeakStep, TalkStep, Corrections } from './exercises';
import '../lingo.css';

/** The session's own full screen, over the app's header and menus. */
export function SessionFrame({ children, label }) {
    useHideLoop();
    return createPortal(
        <div className="lingo fixed inset-0 z-[90] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={label} data-lingo-session>
            {children}
        </div>,
        document.body
    );
}

const SCREENS = { intro: IntroStep, notes: NotesStep, words: WordsStep, passage: PassageStep, dialogue: DialogueStep, pairs: PairsStep, question: QuestionStep, translate: TranslateStep, write: WriteStep, speak: SpeakStep, talk: TalkStep };
const TONE = { right: COLORS.green, wrong: COLORS.red, info: COLORS.blue };

/** The sheet under a checked answer. `T`: its words in the student's language (say.js). */
function Sheet({ sheet, onContinue, T }) {
    const c = TONE[sheet.tone];
    const Icon = sheet.tone === 'right' ? Check : sheet.tone === 'wrong' ? X : Send;
    return (
        <div className="lingo-sheet" style={{ background: c.light }} data-sheet={sheet.tone} role="status" aria-live="assertive">
            <div className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-end sm:px-10 sm:py-7">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white sm:flex"><Icon size={34} strokeWidth={3.5} style={{ color: c.face }} /></span>
                    <div className="max-h-[38dvh] min-w-0 flex-1 space-y-1.5 overflow-y-auto sm:max-h-[30dvh]">
                        <p className="flex items-center gap-2 text-[1.35rem] font-extrabold" style={{ color: c.ink }}>
                            <Icon size={24} strokeWidth={3.5} className="shrink-0 sm:hidden" /> {sheet.title}
                        </p>
                        {sheet.answer && <p className="break-words text-[17px] font-bold" style={{ color: c.ink }} lang={langFor(sheet.answer)} dir="auto" translate="no" data-sheet-answer>{sheet.answer}</p>}
                        {sheet.diff?.length > 0 && <Diff diff={sheet.diff} />}
                        {sheet.text && <p className="text-[15px] font-semibold" style={{ color: c.ink }}>{sheet.text}</p>}
                        {sheet.tips?.length > 0 && <ul className="space-y-0.5">{sheet.tips.map((t) => <li key={t} className="text-[15px] font-semibold text-[#4b4b4b]">• {t}</li>)}</ul>}
                        {sheet.good?.length > 0 && <ul className="space-y-0.5">{sheet.good.map((t) => <li key={t} className="text-[15px] font-semibold" style={{ color: COLORS.green.ink }}>✓ {t}</li>)}</ul>}
                        {sheet.model && (
                            <div className="rounded-xl bg-white/70 px-3 py-2">
                                <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: c.ink }}>{sheet.modelLabel || T('Model answer')}</p>
                                <p className="whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]" translate="no">{sheet.model}</p>
                            </div>
                        )}
                        {sheet.explanation && <p className="text-[15px] font-semibold leading-snug" style={{ color: c.ink }}><span className="font-extrabold">{T('Why: ')}</span>{sheet.explanation}</p>}
                    </div>
                </div>
                <Chunky color={sheet.tone === 'right' ? 'green' : sheet.tone === 'wrong' ? 'red' : 'blue'} onClick={onContinue} className="w-full shrink-0 sm:w-auto sm:min-w-[150px]" data-continue autoFocus>
                    {sheet.tone === 'wrong' ? T('Got it') : T('Continue')}
                </Chunky>
            </div>
        </div>
    );
}

/**
 * The grammar corrections of a piece of English (a paragraph, a sentence, a
 * passage, a talk) in a popup with an ✕ (asked 2026-10-27), in place of the
 * sheet at the bottom: how it went, the tips, each sentence put right, and
 * Continue. ✕ closes it; "Show corrections" opens it again.
 */
function GrammarPopup({ sheet, result, correction, said, onContinue, onClose, T }) {
    const c = TONE[sheet.tone];
    const Icon = sheet.tone === 'right' ? Check : sheet.tone === 'wrong' ? X : Send;
    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="lingo-pop flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-labelledby="lingo-grammar" data-grammar-popup data-sheet={sheet.tone}>
                <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-5" style={{ background: c.light }}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white"><Icon size={26} strokeWidth={3.5} style={{ color: c.face }} /></span>
                    <div className="min-w-0 flex-1">
                        <p id="lingo-grammar" className="text-xl font-extrabold leading-tight" style={{ color: c.ink }}>{sheet.title}</p>
                        {sheet.text && <p className="mt-1 text-[15px] font-semibold" style={{ color: c.ink }}>{sheet.text}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label={T('Close')} data-grammar-close className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#777] hover:bg-white/60"><X size={24} strokeWidth={3} /></button>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
                    {sheet.tips?.length > 0 && <ul className="space-y-1">{sheet.tips.map((t) => <li key={t} className="text-[15px] font-semibold text-[#4b4b4b]">• {t}</li>)}</ul>}
                    {sheet.good?.length > 0 && <ul className="space-y-1">{sheet.good.map((t) => <li key={t} className="text-[15px] font-semibold" style={{ color: COLORS.green.ink }}>✓ {t}</li>)}</ul>}
                    {result.sentences?.length > 0 && <Corrections r={result} T={T} said={said} />}
                    {correction && (
                        <div className="rounded-2xl px-4 py-3" style={{ background: COLORS.green.light }} data-correction-box>
                            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>{T('Correct solution:')}</p>
                            <p className="mt-0.5 whitespace-pre-line break-words text-[17px] font-extrabold" style={{ color: COLORS.green.ink }} lang={langFor(correction)} dir="auto" translate="no" data-correction>{correction}</p>
                        </div>
                    )}
                    {sheet.model && !correction && (
                        <div className="rounded-2xl bg-[#F7F7F7] px-4 py-3">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-[#777]">{sheet.modelLabel || T('Model answer')}</p>
                            <p className="mt-0.5 whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]" translate="no">{sheet.model}</p>
                        </div>
                    )}
                </div>
                <div className="shrink-0 border-t-2 border-[#E5E5E5] px-5 py-4">
                    <Chunky color={sheet.tone === 'right' ? 'green' : sheet.tone === 'wrong' ? 'red' : 'blue'} onClick={onContinue} className="w-full" data-continue autoFocus>
                        {sheet.tone === 'wrong' ? T('Got it') : T('Continue')}
                    </Chunky>
                </div>
            </div>
        </div>
    );
}

function QuitDialog({ onStay, onQuit, T }) {
    return (
        // A popup in the middle of the screen on a phone too (2026-10-29), not a sheet from the bottom.
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onStay}>
            <div className="lingo-pop max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 text-center shadow-2xl sm:max-w-md sm:p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="lingo-quit" data-quit>
                <Mascot pose="sad" className="mx-auto h-28 w-28" />
                <p id="lingo-quit" className="mt-2 text-xl font-extrabold text-[#3c3c3c]">{T("Wait, don't go!")}</p>
                <p className="mt-1 text-[15px] font-semibold text-[#777]">{T("You'll lose your progress in this session if you quit now.")}</p>
                <div className="mt-5 grid gap-2">
                    <Chunky color="blue" onClick={onStay} autoFocus>{T('Keep learning')}</Chunky>
                    <Chunky color="red" variant="ghost" onClick={onQuit} data-end-session>{T('End session')}</Chunky>
                </div>
            </div>
        </div>
    );
}

export default function Session({ steps, mode = 'each', hearts: startHearts = null, check, onEnterPart, onComplete, onQuit, label = 'Lesson' }) {
    const [queue, setQueue] = useState(steps);
    const [index, setIndex] = useState(0);
    const [value, setValue] = useState(() => startValue(steps[0]));
    const [sheet, setSheet] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [hearts, setHearts] = useState(startHearts);
    const [combo, setCombo] = useState(0);
    const [quitting, setQuitting] = useState(false);
    const [sound, setSound] = useState(soundOn);
    const [ending, setEnding] = useState(null);       // { outOfHearts } once the last screen is done
    // An answer got wrong (2026-10-27): the right one in green below it, while the student tries again.
    const [retry, setRetry] = useState(null);         // { answer, why }
    const [popup, setPopup] = useState(false);        // the grammar corrections' popup open
    const repeats = useRef(0);
    const answers = useRef({});
    const tally = useRef({ right: 0, wrong: 0, xp: 0, praise: 0 });
    const started = useRef(0);
    const primaryRef = useRef(() => {});
    useEffect(() => { started.current = Date.now(); }, []);

    const step = queue[index];
    const Screen = SCREENS[step.kind];
    const lastIndex = queue.length - 1;

    const finish = (outOfHearts) => {
        setEnding({ outOfHearts }); setBusy(true); setError(null);
        Promise.resolve(onComplete({ answers: { ...answers.current }, right: tally.current.right, wrong: tally.current.wrong, xp: tally.current.xp, outOfHearts, ms: Date.now() - started.current }))
            .catch((e) => { setError(e); setBusy(false); });
    };

    const goTo = (i) => {
        const next = queue[i];
        if (next.part !== step.part) onEnterPart?.(next.part);
        setIndex(i); setValue(startValue(next)); setSheet(null); setResult(null); setError(null); setRetry(null); setPopup(false);
    };
    const advance = () => {
        if (hearts === 0) return finish(true);
        if (index >= lastIndex) return finish(false);
        return goTo(index + 1);
    };

    const judged = (r, given) => {
        tally.current.xp += xpIn(r.events);
        // Grammar corrections: in the popup (2026-10-27).
        if (r.sentences?.length) setPopup(true);
        // Any question got wrong (asked 2026-10-27, for every question): no sheet — the student's answer
        // stays, the right one in green below it, and Continue; then the same question again, on its own
        // screen, until it is answered right; only then the next question. The first answer is the one that
        // counts (the answers sent, the tally, a heart).
        if (step.repeat && r.correct) { chime('right'); advance(); return; }
        if (r.correct === false && (r.answer || r.model)) {
            if (!step.repeat) {
                if (step.collect) answers.current[step.collect] = given;
                setCombo(0); tally.current.wrong += 1;
                if (step.part === 'quiz' && hearts !== null) setHearts((h) => Math.max(0, h - 1));
            }
            // The student's answer marked red where it stands (the screens' wrong tone), the right one green below.
            setResult(r); setRetry({ answer: r.answer || r.model, why: r.explanation || '', say: r.answerSay || null });
            chime('wrong');
            return;
        }
        const s = sheetOf(step, r, tally.current.praise);
        if (step.collect && !step.repeat) answers.current[step.collect] = given;
        // Right (2026-10-27, "go directly to the next question"): the chime, and straight on — no green
        // sheet. Kept: grammar corrections (their popup) and an answer right but for small differences (shown).
        if (s.tone === 'right' && !r.sentences?.length && !s.diff?.length) {
            chime('right'); setCombo((c) => c + 1); tally.current.right += 1; tally.current.praise += 1;
            advance();
            return;
        }
        setResult(r); setSheet(s);
        // A piece of writing or a passage with mistakes, or a talk not passed (2026-10-27, "everywhere the same
        // rule"): its corrections and Continue, then the same task again — the student's own text kept to put
        // right — until there is nothing left to correct.
        if (r.ok === false || (step.kind === 'talk' && r.passed === false)) {
            const open = (step.kind === 'write' && !['jumbled', 'sentence'].includes(step.task.type)) || (step.kind === 'translate' && step.item?.open);
            setRetry({ answer: null, keep: open && typeof value === 'string' ? value : null });
        }
        if (s.tone === 'wrong') {
            chime('wrong'); setCombo(0); tally.current.wrong += 1;
            if (step.part === 'quiz' && hearts !== null) setHearts((h) => Math.max(0, h - 1));
            // A practice question got wrong comes back once, before the quiz.
            if (step.part === 'practice' && step.retry && !step.again) {
                setQueue((q) => {
                    const at = q.findIndex((x, k) => k > index && x.part !== 'practice');
                    const pos = at === -1 ? q.length : at;
                    return [...q.slice(0, pos), { ...step, key: `${step.key}-again`, again: true }, ...q.slice(pos)];
                });
            }
        } else {
            chime('right');
            if (s.tone === 'right') { setCombo((c) => c + 1); tally.current.right += 1; tally.current.praise += 1; }
        }
    };

    // After a wrong answer, Continue: the same question again as the next screen, fresh, marked as a mistake.
    const askAgain = () => {
        repeats.current += 1;
        const again = { ...step, key: `${step.key}~${repeats.current}`, again: true, repeat: true };
        setQueue((q) => [...q.slice(0, index + 1), again, ...q.slice(index + 1)]);
        setIndex(index + 1); setValue(retry?.keep ?? startValue(again)); setSheet(null); setResult(null); setError(null); setRetry(null); setPopup(false);
    };

    const primary = () => {
        if (quitting) return;
        if (ending) { if (!busy) finish(ending.outOfHearts); return; }
        if (busy) return;
        if (retry) { askAgain(); return; }
        if (sheet || isInfo(step)) { advance(); return; }
        if (step.kind === 'pairs' || !answered(step, value)) return;
        const given = givenOf(step, value);
        if (mode === 'end') { if (step.collect) answers.current[step.collect] = given; advance(); return; }
        setBusy(true); setError(null);
        Promise.resolve(check(step, given, value)).then((r) => judged(r, given)).catch(setError).finally(() => setBusy(false));
    };
    useEffect(() => { primaryRef.current = primary; });

    // Enter checks and continues (but makes a new line in long writing, and still presses the app's other buttons).
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { setQuitting(false); return; }
            if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
            const t = e.target;
            if (t?.closest?.('[data-multiline], [data-quit]')) return;
            if ((t?.tagName === 'BUTTON' || t?.tagName === 'A') && !t.closest('[data-option], [data-pair], [data-tiles], [data-placed], [data-continue]')) return;
            e.preventDefault();
            primaryRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleSound = () => { setSoundOn(!sound); setSound(!sound); };
    const progress = ((index + (sheet || (isInfo(step) && index === lastIndex) ? 1 : 0)) / queue.length) * 100;
    const info = isInfo(step);
    // A result with grammar corrections (a paragraph, a sentence, a passage, a talk): shown in the popup.
    const grammar = result?.sentences?.length ? result : null;
    const ready = info || !!retry || (step.kind !== 'pairs' && answered(step, value));
    // The screen's own words in the student's language (say.js): Kannada for a Kannada speaker.
    const T = tr(step.language);
    const label2 = T(info || retry ? 'Continue' : mode === 'end' ? (index === lastIndex ? 'Finish' : 'Continue')
        : step.kind === 'speak' ? 'Save' : step.kind === 'write' && !['jumbled', 'sentence'].includes(step.task.type) ? 'Submit' : 'Check');

    return (
        <>
            <header className="mx-auto flex w-full max-w-[1000px] shrink-0 items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-4 sm:px-10 sm:pt-8">
                <button type="button" onClick={() => setQuitting(true)} aria-label="Quit" className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><X size={26} strokeWidth={3} /></button>
                <Bar value={progress} className="h-4 flex-1" label={`${label}: progress`} />
                {hearts !== null && (
                    <span className={`flex shrink-0 items-center gap-1 text-lg font-extrabold ${hearts === 0 ? 'lingo-shake' : ''}`} style={{ color: hearts ? COLORS.red.face : '#AFAFAF' }} aria-label={`${hearts} hearts left`} data-hearts={hearts}>
                        <Heart size={24} fill="currentColor" strokeWidth={0} /> {hearts}
                    </span>
                )}
                <button type="button" onClick={toggleSound} aria-pressed={!sound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]">
                    {sound ? <Volume2 size={22} /> : <VolumeX size={22} />}
                </button>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-answer-area>
                <div className="mx-auto w-full max-w-[600px] px-4 pb-8 pt-4 sm:pt-8">
                    <div className="mb-3 flex min-h-7 flex-wrap items-center gap-2">
                        {step.again && <span className="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: COLORS.orange.light, color: COLORS.orange.ink }} data-again><RotateCcw size={12} className="mr-1 inline" />{T('Previous mistake')}</span>}
                        {combo >= 3 && !step.again && <span key={combo} className="lingo-pop rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: COLORS.orange.light, color: COLORS.orange.ink }} data-combo={combo}><Flame size={13} className="mr-1 inline" />{line(step.language, 'inARow', combo)}</span>}
                    </div>
                    {/* The lesson itself stays as written, whatever the app's language. */}
                    <div translate="no"><Screen key={step.key} step={step} value={value} onChange={setValue} locked={!!sheet || busy || !!ending || !!retry} result={result} correction={retry && Array.isArray(value) ? retry.answer : null}
                        done={!!sheet} onDone={() => { tally.current.praise += 1; setCombo((c) => c + 1); chime('right'); setTimeout(advance, 450); }} />
                        {/* A wrong answer (2026-10-27): the right one in green, under the student's (in the answer box itself for word tiles). */}
                        {retry?.answer && !Array.isArray(value) && !grammar && (
                            <div className="lingo-in mt-5 rounded-2xl px-4 py-3" style={{ background: COLORS.green.light }} data-correction-box>
                                <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>{T('Correct solution:')}</p>
                                <p className="mt-0.5 whitespace-pre-line break-words text-[17px] font-extrabold" style={{ color: COLORS.green.ink }} lang={langFor(retry.answer)} dir="auto" data-correction>{retry.answer}</p>
                                {retry.say && <p className="mt-0.5 break-words text-sm font-bold" style={{ color: COLORS.green.ink }} data-correction-say>{retry.say}</p>}
                                {retry.why && <p className="mt-1 text-sm font-semibold" style={{ color: COLORS.green.ink }} data-correction-why>{T('Why: ')}{retry.why}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {error && (
                <p className="mx-auto w-full max-w-[1000px] shrink-0 px-4 pb-2 text-center text-[15px] font-bold sm:px-10" style={{ color: COLORS.red.ink }} role="alert">
                    {error.message || T('Something went wrong.')} {T('Press the button to try again.')}
                </p>
            )}

            <footer className="shrink-0">
                {grammar && !ending ? (
                    // The corrections are in the popup; closed, Show corrections opens it again.
                    <div className="border-t-2 border-[#E5E5E5]">
                        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                            <Chunky variant="outline" color="blue" onClick={() => setPopup(true)} className="flex-1 sm:flex-none" data-show-corrections>{T('Show corrections')}</Chunky>
                            <span className="hidden flex-1 sm:block" />
                            <Chunky color="green" onClick={() => primaryRef.current()} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>{T('Continue')}</Chunky>
                        </div>
                    </div>
                ) : sheet && !ending ? <Sheet sheet={sheet} onContinue={retry ? askAgain : advance} T={T} /> : (
                    <div className="border-t-2 border-[#E5E5E5]">
                        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                            <span className="hidden flex-1 sm:block" />
                            <Chunky color="green" onClick={() => primaryRef.current()} disabled={ending ? busy : (!ready || busy)} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>
                                {ending ? T(busy ? 'Saving…' : 'Try again') : busy ? T('Checking…') : label2}
                            </Chunky>
                        </div>
                    </div>
                )}
            </footer>

            {grammar && popup && !ending && !quitting && (
                <GrammarPopup sheet={sheet || sheetOf(step, result)} result={result} correction={retry?.answer || null}
                    said={step.kind === 'talk' ? 'You said' : 'You wrote'} onContinue={() => primaryRef.current()} onClose={() => setPopup(false)} T={T} />
            )}
            {quitting && <QuitDialog onStay={() => setQuitting(false)} onQuit={onQuit} T={T} />}
        </>
    );
}
