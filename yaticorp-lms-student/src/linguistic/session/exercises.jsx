/**
 * Linguistic Ability — the screens of a session, one at a time: what to read
 * (tips, new words, a passage, a conversation) and what to answer (choose,
 * type, tap the word tiles, match pairs, translate, write, speak). Each draws
 * a step from logic.js; the session around it holds the answer and checks it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Keyboard, LayoutGrid, Lightbulb, BookOpen, Headphones, ChevronDown, Square, Volume2, Eye } from 'lucide-react';
import { COLORS, directionLabel, langOf, langFor, isRtl, play, chime, soundOn, canSpeak } from '../meta';
import { Mascot, Speaker } from '../ui';
import { tilesOf, usesTiles } from './logic';
import { tr, line } from '../say';
import Dialogue from '../parts/Dialogue';
import VoiceRecorder from '../parts/VoiceRecorder';
import TalkRecorder from '../parts/TalkRecorder';
import LetterKeys from '../parts/LetterKeys';
import { hasLetters } from '../parts/letters';

/* ── Shared pieces ────────────────────────────────────────────────────── */

const Title = ({ children }) => <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#3c3c3c] sm:text-[1.75rem]" style={{ textWrap: 'balance' }}>{children}</h1>;

/** Text with its ___ blank drawn as a line, or filled with what the student typed. */
const Blanks = ({ text, fill = '' }) => String(text).split(/(_{3,})/).map((part, i) => (/^_{3,}$/.test(part)
    ? <span key={i} className={`mx-1 inline-block min-w-[4.5rem] border-b-[3px] px-1 text-center ${fill ? 'border-[#1CB0F6] text-[#1899D6]' : 'border-[#AFAFAF] text-transparent'}`}>{fill || '…'}</span>
    : <span key={i}>{part}</span>));

/** The mascot saying something, in a speech bubble. */
const Bubble = ({ pose = 'point-right', children, lang, speaker }) => (
    <div className="flex items-end gap-2 sm:gap-3">
        <Mascot pose={pose} className="h-24 w-20 shrink-0 sm:h-32 sm:w-28" />
        <div className="lingo-bubble mb-4 flex min-w-0 items-center gap-3 px-4 py-3">
            {speaker}
            <p className="min-w-0 break-words text-[17px] font-bold leading-snug text-[#4b4b4b] sm:text-lg" lang={lang} dir="auto">{children}</p>
        </div>
    </div>
);

/** A typed answer, in the grey box. Enter checks it (the session listens), except where noted `multiline`. */
function AnswerBox({ value, onChange, locked, placeholder, rows = 3, lang, multiline = false, label, center = false, inputRef }) {
    const own = useRef(null);
    const ref = inputRef || own;
    useEffect(() => { if (!locked) ref.current?.focus({ preventScroll: true }); }, [locked, ref]);
    return (
        <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} disabled={locked} rows={rows} lang={lang} dir={isRtl(lang) ? 'rtl' : undefined} aria-label={label || placeholder}
            data-multiline={multiline ? '' : undefined} autoCapitalize={lang && lang !== 'en' && !['es', 'fr', 'de', 'pt', 'ru'].includes(lang) ? 'none' : 'sentences'} autoCorrect="off" spellCheck={false} placeholder={placeholder}
            className={`w-full resize-none rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] px-4 py-3 text-[17px] font-semibold text-[#4b4b4b] placeholder:text-[#AFAFAF] focus:border-[#84D8FF] focus:bg-white focus:outline-none disabled:opacity-80 ${center ? 'text-center text-xl tracking-wide' : ''}`} />
    );
}

/* ── Read, then continue ──────────────────────────────────────────────── */

export function IntroStep({ step }) {
    return (
        <div className="lingo-in flex flex-col items-center gap-4 pt-6 text-center">
            <Mascot pose={step.mascot || 'wave-hi'} className="h-40 w-40 sm:h-48 sm:w-48" />
            <Title>{step.title}</Title>
            {step.text && <p className="max-w-md text-[17px] font-semibold leading-relaxed text-[#777]">{step.text}</p>}
            {step.facts?.length > 0 && (
                <ul className="flex flex-wrap justify-center gap-2">
                    {step.facts.map((f) => <li key={f} className="rounded-2xl border-2 border-[#E5E5E5] px-3 py-1.5 text-sm font-extrabold text-[#777]">{f}</li>)}
                </ul>
            )}
        </div>
    );
}

export function NotesStep({ step }) {
    const l = step.learn;
    const T = tr(step.language);
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Learn')}</p>
            <Title>{step.title}</Title>
            {l.intro && <p className="text-[17px] font-semibold leading-relaxed text-[#4b4b4b]">{l.intro}</p>}
            {l.points?.length > 0 && (
                <ul className="space-y-2.5 rounded-2xl border-2 border-[#E5E5E5] p-4">
                    {l.points.map((p) => (
                        <li key={p} className="flex items-start gap-3 text-[16px] font-semibold leading-relaxed text-[#4b4b4b]">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: COLORS.green.face }}><Check size={14} strokeWidth={4} className="text-white" /></span>
                            <span className="min-w-0 break-words">{p}</span>
                        </li>
                    ))}
                </ul>
            )}
            {l.examples?.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Examples')}</p>
                    <ul className="space-y-2">
                        {l.examples.map((e) => (
                            <li key={e} className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-3 py-2.5">
                                <Speaker text={e} size="sm" />
                                <span className="min-w-0 break-words text-[16px] font-bold text-[#4b4b4b]">{e}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {l.kannadaNote && (
                <p className="flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold leading-relaxed text-[#4b4b4b]" style={{ background: COLORS.gold.light }}>
                    <Lightbulb size={20} className="mt-0.5 shrink-0" style={{ color: COLORS.gold.edge }} /> <span className="min-w-0">{l.kannadaNote}</span>
                </p>
            )}
        </div>
    );
}

/** New words as flashcards: the word learnt (English, or a course's), tap to see its meaning in the student's language and an example. */
export function WordsStep({ step }) {
    const words = step.words;
    const target = step.target || 'en';
    const T = tr(step.language);
    const [i, setI] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const w = words[i];
    const go = (d) => { setFlipped(false); setI((n) => (n + d + words.length) % words.length); };
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>{T('New words')} · {step.language === 'kn' ? `${i + 1}/${words.length}` : `${i + 1} of ${words.length}`}</p>
            <Title>{T('Tap the card to see what it means')}</Title>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => go(-1)} aria-label="Previous word" className="lingo-tile flex h-12 w-12 shrink-0 items-center justify-center text-[#AFAFAF]"><ChevronLeft size={24} /></button>
                <button type="button" onClick={() => setFlipped((f) => !f)} data-flashcard={flipped ? 'back' : 'front'}
                    aria-label={flipped ? `${w.word}: ${w.kannada}. Tap to see the ${langOf(target).name} word.` : `${w.word}. Tap to see the meaning.`}
                    className="lingo-tile flex min-h-60 min-w-0 flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
                    {!flipped ? (
                        <>
                            <span className="text-xs font-extrabold uppercase tracking-widest text-[#AFAFAF]">{w.pos || 'word'}</span>
                            <span className="break-words text-4xl font-black text-[#3c3c3c]" lang={target === 'en' ? undefined : target} dir="auto">{w.word}</span>
                            <span className="mt-1 text-sm font-bold text-[#AFAFAF]">{T('Tap to flip')}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl font-black" lang={step.language || 'kn'} dir="auto" style={{ color: COLORS.green.ink }}>{w.kannada}</span>
                            {w.example && <span className="max-w-sm text-[15px] font-semibold italic text-[#777]">“{w.example}”</span>}
                            {(w.synonyms?.length > 0 || w.antonyms?.length > 0) && (
                                <span className="mt-1 flex flex-wrap justify-center gap-1.5 text-xs font-extrabold">
                                    {w.synonyms?.length > 0 && <span className="rounded-full px-2.5 py-1" style={{ background: COLORS.green.light, color: COLORS.green.ink }}>Same: {w.synonyms.join(', ')}</span>}
                                    {w.antonyms?.length > 0 && <span className="rounded-full px-2.5 py-1" style={{ background: COLORS.red.light, color: COLORS.red.ink }}>Opposite: {w.antonyms.join(', ')}</span>}
                                </span>
                            )}
                        </>
                    )}
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next word" className="lingo-tile flex h-12 w-12 shrink-0 items-center justify-center text-[#AFAFAF]"><ChevronRight size={24} /></button>
            </div>
            <div className="flex items-center justify-center gap-3">
                <Speaker src={w.audio} text={w.word} lang={step.targetLocale || 'en-IN'} />
                <span className="flex gap-1.5" aria-hidden="true">{words.map((x, k) => <span key={x.word} className="h-2.5 w-2.5 rounded-full" style={{ background: k === i ? COLORS.green.face : '#E5E5E5' }} />)}</span>
            </div>
        </div>
    );
}

/** The reading passage; the browser can read it aloud. */
export function PassageStep({ step }) {
    const T = tr(step.language);
    const [reading, setReading] = useState(false);
    const p = step.passage;
    useEffect(() => () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);
    const toggle = () => {
        if (!window.speechSynthesis) return;
        if (reading) { window.speechSynthesis.cancel(); setReading(false); return; }
        const u = new SpeechSynthesisUtterance(p.text);
        u.lang = 'en-IN'; u.rate = 0.95; u.onend = () => setReading(false); u.onerror = () => setReading(false);
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setReading(true);
    };
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>{T('Read')}</p>
            <div className="flex items-start justify-between gap-3">
                <Title>{p.title}</Title>
                {typeof window !== 'undefined' && window.speechSynthesis && (
                    <button type="button" onClick={toggle} aria-pressed={reading} className="lingo-btn inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.ink }}>
                        {reading ? <><Square size={15} /> {T('Stop')}</> : <><Headphones size={17} /> {T('Read aloud')}</>}
                    </button>
                )}
            </div>
            <div className="space-y-3 rounded-2xl border-2 border-[#E5E5E5] p-4 text-[17px] font-semibold leading-8 text-[#4b4b4b] sm:p-5" data-passage>
                {String(p.text).split(/\n+/).map((x, i) => <p key={i}>{x}</p>)}
            </div>
        </div>
    );
}

export function DialogueStep({ step }) {
    const T = tr(step.language);
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.orange.ink }}>{T('Listen')}</p>
            <Title>{T('Listen to the conversation')}</Title>
            <Dialogue dialogue={step.dialogue} audio={step.audio} />
            {step.phrases?.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Useful phrases')}</p>
                    <ul className="flex flex-wrap gap-2">{step.phrases.map((p) => <li key={p}><button type="button" onClick={() => play(null, p)} className="lingo-tile px-3 py-2 text-[15px] text-[#4b4b4b]">{p}</button></li>)}</ul>
                </div>
            )}
        </div>
    );
}

/* ── Answer pieces ────────────────────────────────────────────────────── */

const isTyping = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;

/** Options as tall cards, numbered for the keyboard (1, 2, 3…). After checking: the right one green, a wrong pick red. */
function Choices({ options, value, onChange, locked, result, language }) {
    useEffect(() => {
        if (locked) return undefined;
        const onKey = (e) => {
            if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            const n = Number(e.key);
            if (n >= 1 && n <= options.length) { e.preventDefault(); onChange(options[n - 1]); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [locked, options, onChange]);
    return (
        <div className="grid gap-2.5" role="radiogroup">
            {options.map((o, i) => {
                const chosen = value === o;
                const right = result && o === result.answer;
                const wrong = result && chosen && !result.correct;
                const look = right ? { borderColor: COLORS.green.face, background: COLORS.green.light, color: COLORS.green.ink }
                    : wrong ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink }
                        : chosen ? { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink } : {};
                return (
                    <button key={o} type="button" role="radio" aria-checked={chosen} disabled={locked} onClick={() => onChange(o)} data-option={i}
                        className={`lingo-tile flex min-h-14 items-center gap-3 px-3 py-2.5 text-left text-[17px] text-[#4b4b4b] ${locked && !right && !wrong ? 'opacity-60' : ''}`} style={look}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold" style={{ borderColor: chosen || right || wrong ? 'currentColor' : '#E5E5E5', color: chosen || right || wrong ? undefined : '#AFAFAF' }}>{i + 1}</span>
                        <span className="min-w-0 flex-1 break-words" lang={langFor(o, language)} dir="auto">{o}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Word tiles: tap one to move it onto the answer lines; tap it there to take
 * it back. A tile used leaves its shape behind in the bank, as a grey slot.
 * `value` is the tiles' places in `words`, in the order chosen.
 */
function Tiles({ words, value, onChange, locked, tone, language }) {
    const placed = value;
    // Tiles in Urdu or Arabic are placed right to left.
    const dir = words.some((w) => langFor(w, language) && isRtl(langFor(w, language))) ? 'rtl' : undefined;
    const line = tone === 'right' ? COLORS.green.face : tone === 'wrong' ? COLORS.red.face : '#E5E5E5';
    return (
        <div className="space-y-6">
            <div className="flex min-h-[7.5rem] flex-wrap content-start gap-2 py-2" aria-label="Your answer" data-placed dir={dir}
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 3.45rem, ${line} 3.45rem, ${line} 3.6rem)` }}>
                {placed.map((i, k) => (
                    <button key={`${i}-${k}`} type="button" disabled={locked} onClick={() => onChange(placed.filter((_, x) => x !== k))}
                        className="lingo-tile lingo-pop h-12 px-3.5 text-[17px] text-[#4b4b4b]" lang={langFor(words[i], language)}>{words[i]}</button>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2" data-tiles dir={dir}>
                {words.map((w, i) => {
                    const used = placed.includes(i);
                    return (
                        <span key={`${w}-${i}`} className="inline-flex rounded-[0.9rem] bg-[#E5E5E5]">
                            <button type="button" disabled={locked || used} onClick={() => onChange([...placed, i])} aria-hidden={used ? 'true' : undefined} tabIndex={used ? -1 : 0}
                                className={`lingo-tile h-12 px-3.5 text-[17px] text-[#4b4b4b] ${used ? 'invisible' : ''}`} lang={langFor(w, language)}>{w}</button>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

/** A reading or listening question can show its passage or conversation again. */
function ContextPeek({ context, T = (x) => x }) {
    const [open, setOpen] = useState(false);
    if (!context) return null;
    return (
        <div className="rounded-2xl border-2 border-[#E5E5E5]">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-[15px] font-extrabold" style={{ color: COLORS.blue.ink }}>
                {context.passage ? <BookOpen size={18} /> : <Headphones size={18} />}
                <span className="flex-1">{context.passage ? `Read “${context.passage.title}” again` : T('Hear the conversation again')}</span>
                <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="border-t-2 border-[#E5E5E5] p-4">
                    {context.passage
                        ? <div className="space-y-2 text-[15px] font-semibold leading-7 text-[#4b4b4b]">{String(context.passage.text).split(/\n+/).map((x, i) => <p key={i}>{x}</p>)}</div>
                        : <Dialogue dialogue={context.dialogue} compact />}
                </div>
            )}
        </div>
    );
}

/* ── Answer screens ───────────────────────────────────────────────────── */

/** Split "Choose the word that fits: The ___ dog." into a title and the sentence. */
const splitPrompt = (prompt) => {
    const m = String(prompt).match(/^([^:]{4,60}):\s+(.+)$/);
    return m && /_{3,}/.test(m[2]) ? [m[1], m[2]] : [prompt, null];
};

/**
 * A listening question's sound (a level's "Listen and pick"): played once as
 * it opens (when sound is on), again on the big speaker; and, for a device
 * with no voice for the language, the meaning to read instead.
 */
function ListenPrompt({ q }) {
    const [shown, setShown] = useState(false);
    const hear = () => play(q.audio, q.say, q.sayLang || 'en-IN');
    useEffect(() => {
        if (soundOn()) play(q.audio, q.say, q.sayLang || 'en-IN');
        return () => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); };
    }, [q.id, q.audio, q.say, q.sayLang]);
    return (
        <div className="flex flex-col items-center gap-3" data-listen>
            {canSpeak(q.audio) && (
                <button type="button" onClick={hear} aria-label="Hear the word again" data-listen-play
                    className="lingo-btn flex h-24 w-24 items-center justify-center !rounded-3xl" style={{ background: COLORS.blue.face, borderColor: COLORS.blue.edge, color: '#fff' }}>
                    <Volume2 size={44} strokeWidth={2.5} />
                </button>
            )}
            {/* Can't hear it: the meaning — or, when the meaning is the answer (hear it, pick its meaning), the word written. */}
            {shown
                ? <p className="rounded-2xl bg-[#F7F7F7] px-4 py-2 text-center text-lg font-extrabold text-[#4b4b4b]" dir="auto" data-listen-meaning>{q.written || q.meaning}</p>
                : <button type="button" onClick={() => setShown(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }} data-listen-show>
                    <Eye size={16} /> {q.written ? 'Can’t hear it? Show the word' : 'Can’t hear it? Show the meaning'}
                </button>}
        </div>
    );
}

export function QuestionStep({ step, value, onChange, locked, result }) {
    const q = step.q;
    const T = tr(step.language);
    const tone = result ? (result.correct ? 'right' : 'wrong') : null;
    let body;
    if (q.type === 'mcq') {
        const [title, sentence] = splitPrompt(q.prompt);
        body = (
            <>
                <Title><Blanks text={title} /></Title>
                {q.say && <ListenPrompt q={q} />}
                {sentence && <p className="rounded-2xl border-2 border-[#E5E5E5] px-4 py-3 text-lg font-bold text-[#4b4b4b]"><Blanks text={sentence} fill={value} /></p>}
                <Choices options={q.options || []} value={value} onChange={onChange} locked={locked} result={result} language={step.language} />
            </>
        );
    } else if (q.type === 'rearrange') {
        body = <><Title>{q.prompt}</Title><Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={tone} language={step.language} /></>;
    } else if (q.type === 'fill') {
        body = (
            <>
                <Title>{T('Fill in the blank')}</Title>
                <Bubble pose="thinking"><Blanks text={q.prompt} fill={value} /></Bubble>
                <AnswerBox value={value} onChange={onChange} locked={locked} rows={1} placeholder={T('Type the missing word')} />
            </>
        );
    } else if (q.type === 'correction') {
        body = (
            <>
                <Title>{T('Correct this sentence')}</Title>
                <Bubble pose="curious-question">{q.prompt}</Bubble>
                <AnswerBox value={value} onChange={onChange} locked={locked} rows={2} placeholder={T('Write the correct sentence')} label="Your corrected sentence" />
            </>
        );
    } else {
        // Spelling: the word in the student's language (and its English sound) when the lesson gives it.
        body = (
            <>
                <Title>{q.prompt}</Title>
                {q.kannada && <Bubble pose="point-right" lang={step.language || 'kn'} speaker={<Speaker src={q.audio} text={step.word?.word} size="sm" label={T('Hear it in English')} />}><span className="text-2xl">{q.kannada}</span></Bubble>}
                {q.hint && <p className="text-center font-mono text-lg font-bold tracking-[0.3em] text-[#AFAFAF]" aria-label={`Hint: ${q.hint}`}>{q.hint}</p>}
                <AnswerBox value={value} onChange={onChange} locked={locked} rows={1} placeholder={T('Type in English')} center />
            </>
        );
    }
    return (
        <div className="lingo-in space-y-5" data-question={q.id}>
            {q.hint && q.type !== 'spelling' && <p className="text-sm font-bold text-[#AFAFAF]">{T('Hint: ')}{q.hint}</p>}
            {body}
            <ContextPeek context={step.context} T={T} />
        </div>
    );
}

export function TranslateStep({ step, value, onChange, locked, result }) {
    const it = step.item;
    // 'en-kn' is always "the language learnt → the student's language", whichever they are.
    const toHelper = step.direction === 'en-kn';
    const code = step.language || 'kn';
    const L = langOf(code);
    const target = step.target || 'en';
    const T = langOf(target);
    const writeIn = toHelper ? code : target;
    const Tr = tr(code);
    const bank = usesTiles(step);
    const ref = useRef(null);
    const [keys, setKeys] = useState(false);
    const typing = !Array.isArray(value);
    const tone = result ? (result.correct ? 'right' : 'wrong') : null;
    const swap = () => onChange(typing ? [] : '');
    return (
        <div className="lingo-in space-y-5" data-translation={it.id}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: COLORS.red.light, color: COLORS.red.ink }}>{directionLabel(step.direction, code, target)}</span>
                {it.topic && <span className="rounded-full bg-[#F7F7F7] px-3 py-1 text-xs font-extrabold capitalize text-[#777]">{it.topic}</span>}
            </div>
            <Title>{it.open ? Tr('Translate this passage') : line(code, 'writeIn', (toHelper ? L : T).name)}</Title>
            <Bubble pose="point-right" lang={toHelper ? target : code} speaker={toHelper ? <Speaker text={it.source} lang={step.targetLocale || 'en-IN'} size="sm" /> : null}>
                <span data-source>{it.source}</span>
            </Bubble>
            {!typing
                ? <Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={tone} language={writeIn} />
                : <AnswerBox inputRef={ref} value={value} onChange={onChange} locked={locked} rows={it.open ? 7 : 3} multiline={!!it.open} lang={writeIn}
                    placeholder={writeIn === 'en' ? Tr('Type in English') : langOf(writeIn).placeholder} label={`Your translation of: ${it.source}`} />}
            {!locked && (
                <div className="flex flex-wrap gap-2">
                    {bank && (
                        <button type="button" onClick={swap} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#777' }} data-swap-input>
                            {typing ? <><LayoutGrid size={15} /> {Tr('Use word bank')}</> : <><Keyboard size={15} /> {Tr('Use keyboard')}</>}
                        </button>
                    )}
                    {typing && writeIn !== 'en' && hasLetters(writeIn) && (
                        <button type="button" onClick={() => setKeys((k) => !k)} aria-expanded={keys} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.red.ink }} data-letters-toggle>
                            <Keyboard size={15} /> {line(code, 'letters', langOf(writeIn).name, keys)}
                        </button>
                    )}
                </div>
            )}
            {typing && keys && !locked && writeIn !== 'en' && <LetterKeys code={writeIn} inputRef={ref} value={value} onChange={onChange} />}
            {it.open && !locked && <p className="text-sm font-bold text-[#AFAFAF]">A passage is not marked by the computer: you will see the model{writeIn === 'en' ? ', and your English is checked sentence by sentence' : ''}.</p>}
            {result?.sentences?.length > 0 && <Corrections r={result} T={Tr} />}
        </div>
    );
}

const WRITE_LABEL = { jumbled: 'Put the words in order', sentence: 'Make a sentence', paragraph: 'Write a paragraph', email: 'Write an email', letter: 'Write a letter' };
const wordCount = (t) => (String(t).trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;

export function WriteStep({ step, value, onChange, locked, result }) {
    const t = step.task;
    const T = tr(step.language);
    if (t.type === 'jumbled') {
        return (
            <div className="lingo-in space-y-5" data-writing={t.id}>
                <Title>{T(WRITE_LABEL.jumbled)}</Title>
                <Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={result ? (result.correct ? 'right' : 'wrong') : null} />
            </div>
        );
    }
    const open = ['paragraph', 'email', 'letter'].includes(t.type);
    const n = wordCount(value);
    return (
        <div className="lingo-in space-y-4" data-writing={t.id}>
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>{T(WRITE_LABEL[t.type] || 'Write')}</p>
            <Title>{t.prompt}</Title>
            {t.mustInclude?.length > 0 && <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#777]">Use: {t.mustInclude.map((w) => <span key={w} className="rounded-lg px-2 py-0.5 font-extrabold" style={{ background: COLORS.green.light, color: COLORS.green.ink }}>{w}</span>)}</p>}
            <AnswerBox value={value} onChange={onChange} locked={locked} rows={open ? (t.type === 'paragraph' ? 7 : 10) : 3} multiline={open}
                placeholder={t.type === 'email' ? 'Subject: …\n\nDear …,\n\n…\n\nRegards,\nYour name' : t.type === 'letter' ? 'To\n…\n\nDate\n\nSubject: …\n\nRespected Sir / Madam,\n\n…\n\nYours faithfully,\nYour name' : 'Write here…'}
                label={t.prompt} />
            <div className="flex flex-wrap items-start justify-between gap-2">
                {t.checklist?.length > 0 ? <ul className="space-y-0.5 text-sm font-semibold text-[#777]">{t.checklist.map((c) => <li key={c}>☐ {c}</li>)}</ul> : <span />}
                <span className="text-sm font-extrabold tabular-nums" style={{ color: t.minWords && n < t.minWords ? '#AFAFAF' : COLORS.green.ink }}>{n} word{n === 1 ? '' : 's'}{t.minWords ? ` · at least ${t.minWords}` : ''}</span>
            </div>
            {/* Checked here (2026-10-26), not sent to a teacher: each sentence, its grammar corrected. */}
            {result?.sentences?.length > 0 && <Corrections r={result} T={T} said="You wrote" />}
        </div>
    );
}

export function SpeakStep({ step, value, onChange, locked }) {
    const s = step.speaking;
    const T = tr(step.language);
    const [sample, setSample] = useState(false);
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.orange.ink }}>{T('Speak')}</p>
            <Title>{T('Your turn to speak')}</Title>
            <Bubble pose="presenting">{s.prompt}</Bubble>
            <VoiceRecorder onRecorded={() => onChange({ ...value, recorded: true })} disabled={locked} />
            {s.sample && (
                <div>
                    <button type="button" onClick={() => setSample((v) => !v)} aria-expanded={sample} className="inline-flex min-h-10 items-center gap-1.5 text-[15px] font-extrabold" style={{ color: COLORS.blue.ink }}>
                        <ChevronDown size={17} className={`transition-transform ${sample ? 'rotate-180' : ''}`} /> {T(sample ? 'Hide the sample answer' : 'Show a sample answer')}
                    </button>
                    {sample && (
                        <div className="mt-2 flex items-start gap-3 rounded-2xl p-3" style={{ background: COLORS.blue.light }}>
                            <Speaker text={s.sample} size="sm" label={T('Hear the sample')} />
                            <p className="text-[15px] font-semibold leading-relaxed text-[#4b4b4b]">{s.sample}</p>
                        </div>
                    )}
                </div>
            )}
            {s.checklist?.length > 0 && (
                <fieldset>
                    <legend className="mb-2 text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('After you listen back, tick what you did')}</legend>
                    <div className="grid gap-2">
                        {s.checklist.map((c, i) => {
                            const on = value.ticks[i];
                            return (
                                <button key={c} type="button" role="checkbox" aria-checked={on} disabled={locked} onClick={() => onChange({ ...value, ticks: value.ticks.map((x, k) => (k === i ? !x : x)) })}
                                    className="lingo-tile flex min-h-12 items-center gap-3 px-3 text-left text-[15px] text-[#4b4b4b]" style={on ? { borderColor: COLORS.green.face, background: COLORS.green.light } : undefined}>
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2" style={{ borderColor: on ? COLORS.green.face : '#E5E5E5', background: on ? COLORS.green.face : '#fff' }}>{on && <Check size={15} strokeWidth={4} className="text-white" />}</span>
                                    {c}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}
            <p className="text-sm font-semibold text-[#AFAFAF]">Nothing marks your pronunciation automatically: listen to yourself and be honest.</p>
        </div>
    );
}

/* ── Speak on a topic (Advanced) ──────────────────────────────────────── */

const wordsIn = (text) => (String(text).trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;

/** `text` with `parts` (each found once, in order) marked. */
function Marked({ text, parts, color, strike = false }) {
    const out = [];
    let rest = text, k = 0;
    for (const p of parts) {
        const at = p ? rest.indexOf(p) : -1;
        if (at < 0) continue;
        if (at) out.push(<span key={k++}>{rest.slice(0, at)}</span>);
        out.push(<mark key={k++} className={`rounded px-0.5 font-extrabold ${strike ? 'line-through' : ''}`} style={{ background: 'transparent', color }}>{p}</mark>);
        rest = rest.slice(at + p.length);
    }
    out.push(<span key={k}>{rest}</span>);
    return out;
}

/** What was said (or written), sentence by sentence: each one with a mistake put right, and why. */
export function Corrections({ r, T, said = 'You said' }) {
    return (
        <section className="space-y-2" data-talk-corrections>
            <p className="text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Your sentences, corrected')}</p>
            <ol className="space-y-2">
                {r.sentences.map((s, i) => (s.mistakes.length ? (
                    <li key={i} className="space-y-1 rounded-2xl border-2 p-3 text-[15px] font-semibold leading-relaxed" style={{ borderColor: COLORS.red.light }} data-talk-sentence="fixed">
                        <p className="text-[#777]"><span className="text-xs font-extrabold uppercase tracking-wider">{T(said)}: </span><Marked text={s.text} parts={s.mistakes.map((m) => m.wrong)} color={COLORS.red.ink} strike /></p>
                        <p className="text-[#4b4b4b]"><span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>{T('Better')}: </span><Marked text={s.corrected} parts={s.mistakes.map((m) => m.right)} color={COLORS.green.ink} /></p>
                        <ul className="space-y-0.5 pt-0.5">{[...new Set(s.mistakes.map((m) => m.why))].map((w) => <li key={w} className="text-sm text-[#777]">• {w}</li>)}</ul>
                    </li>
                ) : (
                    <li key={i} className="flex items-start gap-2 px-1 text-[15px] font-semibold text-[#4b4b4b]" data-talk-sentence="ok">
                        <Check size={18} strokeWidth={3.5} className="mt-0.5 shrink-0" style={{ color: COLORS.green.face }} aria-label={T('No mistakes found')} /> <span className="min-w-0 break-words">{s.text}</span>
                    </li>
                )))}
            </ol>
        </section>
    );
}

/**
 * Speak on a topic (asked 2026-10-24): the topic and what to cover, the
 * microphone (TalkRecorder writes down what is said), the talk as text to
 * fix, and once checked, each sentence corrected with the reason.
 */
export function TalkStep({ step, value, onChange, locked, result }) {
    const t = step.talk;
    const T = tr(step.language);
    const [listening, setListening] = useState(false);
    const n = wordsIn(value);
    return (
        <div className="lingo-in space-y-4" data-talk>
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.orange.ink }}>{T('Speak on a topic')}</p>
            <Bubble pose="presenting">{t.prompt}</Bubble>
            {!result && (
                <>
                    <details className="rounded-2xl border-2 border-[#E5E5E5] px-4 py-3" open>
                        <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('What to talk about')}</summary>
                        <ul className="mt-2 space-y-1.5">{t.points.map((p) => <li key={p} className="text-[15px] font-semibold leading-relaxed text-[#4b4b4b]">• {p}</li>)}</ul>
                        {t.words?.length > 0 && (
                            <div className="mt-3">
                                <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Try to use')}</p>
                                <div className="flex flex-wrap gap-1.5">{t.words.map((w) => <span key={w} className="rounded-xl px-2.5 py-1 text-sm font-extrabold" style={{ background: COLORS.blue.light, color: COLORS.blue.ink }}>{w}</span>)}</div>
                            </div>
                        )}
                        {t.phrases?.length > 0 && (
                            <div className="mt-3">
                                <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Useful ways to start')}</p>
                                <ul className="space-y-0.5">{t.phrases.map((p) => <li key={p} className="text-[15px] font-semibold text-[#4b4b4b]">{p}</li>)}</ul>
                            </div>
                        )}
                    </details>
                    <TalkRecorder value={value} onChange={onChange} disabled={locked} onListening={setListening} T={T} />
                </>
            )}
            <label className="block">
                <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">
                    {T('Your talk')}
                    <span className="tabular-nums" style={{ color: n >= t.minWords ? COLORS.green.ink : '#AFAFAF' }} data-talk-words={n}>{n} / {t.minWords} {T('words')}</span>
                </span>
                <textarea value={value} onChange={(e) => onChange(e.target.value)} readOnly={listening} disabled={locked} rows={6} data-multiline lang="en" autoCapitalize="sentences" spellCheck={false}
                    placeholder={T('Fix any words the microphone heard wrong, or type here.')} aria-label={T('Your talk')}
                    className="w-full resize-y rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] px-4 py-3 text-[17px] font-semibold leading-relaxed text-[#4b4b4b] placeholder:text-[#AFAFAF] focus:border-[#84D8FF] focus:bg-white focus:outline-none disabled:opacity-80" data-talk-text />
            </label>
            {result?.sentences && <Corrections r={result} T={T} />}
        </div>
    );
}

/** A small seeded shuffle, so the meanings column is mixed the same way every time. */
const mixed = (n, seed) => {
    const a = Array.from({ length: n }, (_, i) => i);
    let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    if (n > 1 && a.every((x, i) => x === i)) a.push(a.shift());
    return a;
};

/** Tap the matching pairs: a word learnt (English, or a course's) and its meaning in the student's language, in either order. */
export function PairsStep({ step, done, onDone }) {
    const words = step.words;
    const right = useMemo(() => mixed(words.length, words.map((w) => w.word).join('|')), [words]);
    const [pick, setPick] = useState(null);         // { side: 'en' | 'kn', i } (i is the word's place)
    const [matched, setMatched] = useState([]);
    const [wrong, setWrong] = useState(null);       // [enWord, knWord] flashing red
    const flash = useRef(null);
    useEffect(() => () => clearTimeout(flash.current), []);

    const tap = (side, i) => {
        if (done || matched.includes(i)) return;
        // The word heard as it is tapped: its recording, or the browser's voice (sound on).
        if (side === 'en' && (words[i].audio || soundOn())) play(words[i].audio, words[i].word, words[i].locale || step.targetLocale || 'en-IN');
        if (!pick || pick.side === side) { setPick({ side, i }); return; }
        const en = side === 'en' ? i : pick.i;
        const kn = side === 'kn' ? i : pick.i;
        setPick(null);
        if (en === kn) {
            const next = [...matched, en];
            setMatched(next);
            if (next.length === words.length) onDone(); else chime('right');
        } else {
            chime('wrong');
            setWrong([en, kn]);
            clearTimeout(flash.current);
            flash.current = setTimeout(() => setWrong(null), 600);
        }
    };
    useEffect(() => {
        if (done) return undefined;
        const onKey = (e) => {
            if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            const n = Number(e.key === '0' ? 10 : e.key);
            if (!(n >= 1 && n <= words.length * 2)) return;
            e.preventDefault();
            if (n <= words.length) tap('en', n - 1); else tap('kn', right[n - words.length - 1]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const cell = (side, i, label, number) => {
        const isDone = matched.includes(i);
        const isPick = pick && pick.side === side && pick.i === i;
        const isWrong = wrong && wrong[side === 'en' ? 0 : 1] === i;
        const look = isWrong ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink }
            : isPick ? { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink } : {};
        return (
            <button key={`${side}-${i}`} type="button" disabled={isDone || done} onClick={() => tap(side, i)} aria-pressed={isPick} data-pair={side}
                className={`lingo-tile flex min-h-14 w-full items-center gap-2 px-2.5 text-left text-[16px] text-[#4b4b4b] sm:px-3 ${isWrong ? 'lingo-shake' : ''} ${isDone ? '!border-[#E5E5E5] !bg-white text-[#E5E5E5]' : ''}`} style={look}>
                <span className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-extrabold sm:flex ${isDone ? 'border-[#E5E5E5] text-[#E5E5E5]' : 'border-[#E5E5E5] text-[#AFAFAF]'}`}>{number}</span>
                <span className="min-w-0 flex-1 break-words text-center" lang={side === 'kn' ? step.language || 'kn' : step.target && step.target !== 'en' ? step.target : undefined} dir="auto">{label}</span>
            </button>
        );
    };
    return (
        <div className="lingo-in space-y-5" data-pairs>
            {step.warmup && <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }} data-warmup>{tr(step.language)('Warm up: this unit’s words')}</p>}
            <Title>{tr(step.language)('Tap the matching pairs')}</Title>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2.5">{words.map((w, i) => cell('en', i, w.word, i + 1))}</div>
                <div className="space-y-2.5">{right.map((i, k) => cell('kn', i, words[i].kannada, words.length + k + 1))}</div>
            </div>
        </div>
    );
}
