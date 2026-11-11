/**
 * Linguistic Ability — the screens of a session, one at a time: what to read
 * (tips, new words, a passage, a conversation) and what to answer (choose,
 * type, tap the word tiles, match pairs, translate, write, speak). Each draws
 * a step from logic.js; the session around it holds the answer and checks it.
 */
import { Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MoodContext, poseFor } from './mood';
import { Check, ChevronLeft, ChevronRight, Keyboard, LayoutGrid, Lightbulb, BookOpen, Headphones, ChevronDown, Square, Volume2, Eye, Turtle, Mic } from 'lucide-react';
import { COLORS, directionLabel, langOf, langFor, isRtl, play, chime, soundOn, canSpeak, tileVoice } from '../meta';
import { Mascot, Speaker } from '../ui';
import { tilesOf, usesTiles, OPEN_WRITING, LEAST_SENTENCES, sentenceCount, saidRight } from './logic';
import { tr, line, writeWord } from '../say';
import Dialogue from '../parts/Dialogue';
import TalkRecorder from '../parts/TalkRecorder';
import { ticksOf, needOf, canTranscribe, writeTicksOf } from '../parts/speakTicks';
import { KeysPopup } from '../parts/LetterKeys';
import { hasLetters } from '../parts/letters';
import Comic from '../parts/Comic';

/* ── Shared pieces ────────────────────────────────────────────────────── */

const Title = ({ children }) => <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#3c3c3c] sm:text-[1.75rem]" style={{ textWrap: 'balance' }}>{children}</h1>;

/** Text with its ___ blank drawn as a line, or filled with what the student typed. */
const Blanks = ({ text, fill = '' }) => String(text).split(/(_{3,})/).map((part, i) => (/^_{3,}$/.test(part)
    ? <span key={i} className={`mx-1 inline-block min-w-[4.5rem] border-b-[3px] px-1 text-center ${fill ? 'border-[#1CB0F6] text-[#1899D6]' : 'border-[#AFAFAF] text-transparent'}`}>{fill || '…'}</span>
    : <span key={i}>{part}</span>));

/** The mascot saying something, in a speech bubble. */
/**
 * The character on a question screen: after an answer, thumbs up (right) or sad (wrong), popping as it changes
 * (2026-11-06, the user's Duolingo picture: "right — thumbs up; wrong — sad"); else its own pose.
 */
export function MoodMascot({ pose, className }) {
    const mood = useContext(MoodContext);
    return (
        <span key={mood || 'calm'} className={`inline-flex shrink-0 ${mood ? 'lingo-pop' : ''}`} data-mood-mascot={mood || 'calm'}>
            <Mascot pose={poseFor(mood, pose)} className={className} talk />
        </span>
    );
}

const Bubble = ({ pose = 'point-right', children, lang, speaker }) => (
    <div className="flex items-end gap-2 sm:gap-3">
        <MoodMascot pose={pose} className="h-24 w-20 shrink-0 sm:h-32 sm:w-28" />
        <div className="lingo-bubble mb-4 flex min-w-0 items-center gap-3 px-4 py-3">
            {speaker}
            <p className="min-w-0 break-words text-[17px] font-bold leading-snug text-[#4b4b4b] sm:text-lg" lang={lang} dir="auto">{children}</p>
        </div>
    </div>
);

/** A typed answer, in the grey box. Enter checks it (the session listens), except where noted `multiline`. */
function AnswerBox({ value, onChange, locked, placeholder, rows = 3, lang, multiline = false, label, center = false, inputRef, wrong = false }) {
    const own = useRef(null);
    const ref = inputRef || own;
    useEffect(() => { if (!locked) ref.current?.focus({ preventScroll: true }); }, [locked, ref]);
    return (
        <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} disabled={locked} rows={rows} lang={lang} dir={isRtl(lang) ? 'rtl' : undefined} aria-label={label || placeholder}
            data-multiline={multiline ? '' : undefined} autoCapitalize={lang && lang !== 'en' && !['es', 'fr', 'de', 'pt', 'ru'].includes(lang) ? 'none' : 'sentences'} autoCorrect="off" spellCheck={false} placeholder={placeholder}
            className={`w-full resize-none rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] px-4 py-3 text-[17px] font-semibold text-[#4b4b4b] placeholder:text-[#AFAFAF] focus:border-[#84D8FF] focus:bg-white focus:outline-none disabled:opacity-80 ${center ? 'text-center text-xl tracking-wide' : ''}`}
            style={wrong ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink, opacity: 1 } : undefined} data-wrong={wrong || undefined} />
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

/**
 * A word or phrase that must fit its card (2026-11-03: a long Tamil phrase ran past both sides of the card on a
 * phone): set as large as asked, smaller when its longest word is wider than the card, and only as a last resort
 * broken inside a word.
 */
function FitWord({ text, className = '', min = 18, ...rest }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.fontSize = '';
        el.style.overflowWrap = 'normal';
        const over = el.scrollWidth / Math.max(1, el.clientWidth);
        if (over > 1.01) el.style.fontSize = `${Math.max(min, Math.floor(parseFloat(getComputedStyle(el).fontSize) / over))}px`;
        el.style.overflowWrap = 'anywhere';
    }, [text, min]);
    return <span ref={ref} className={`block max-w-full ${className}`} {...rest}>{text}</span>;
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
                            {/* How the word sounds, in English letters, in place of "noun" for a language not written
                                in English, Hindi or Kannada letters (2026-10-27). */}
                            {w.say
                                ? <span className="break-words text-lg font-extrabold" style={{ color: COLORS.blue.ink }} data-say>{w.say}</span>
                                : <span className="text-xs font-extrabold uppercase tracking-widest text-[#AFAFAF]">{w.pos || 'word'}</span>}
                            <FitWord text={w.word} className="text-4xl font-black text-[#3c3c3c]" lang={target === 'en' ? undefined : target} dir="auto" data-card-word />
                            <span className="mt-1 text-sm font-bold text-[#AFAFAF]">{T('Tap to flip')}</span>
                        </>
                    ) : (
                        <>
                            <FitWord text={w.kannada} className="text-3xl font-black" lang={step.language || 'kn'} dir="auto" style={{ color: COLORS.green.ink }} data-card-meaning />
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
                {/* A letter's speakable form where it has one (an English letter's name, a Korean letter with its vowel). */}
                <Speaker src={w.audio} text={w.speak || w.word} lang={step.targetLocale || 'en-IN'} />
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

/**
 * A Letters lesson's letters, each with a word that starts with it and its picture — "A for 🍎 apple" (2026-10-31:
 * "not the matching question; give one word, like A for apple, for every letter"). Tapped, the card is read aloud.
 */
/**
 * A word with its letter inside it (2026-11-04, ಙ in ವಾಙ್ಮಯ): that letter coloured — with the whole joined syllable it
 * is part of (ಙ್ಮ, ಣ್ಣು), so the letters joined to it are still drawn joined.
 */
const VIRAMA = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D\u200D]$/;
function InWord({ text, mark }) {
    const at = mark ? text.toLocaleLowerCase().indexOf(mark.toLocaleLowerCase()) : -1;
    if (at < 0 || typeof Intl === 'undefined' || !Intl.Segmenter) return text;
    const parts = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((x) => [x.index, x.index + x.segment.length, x.segment]);
    let a = parts.findIndex(([, end]) => end > at), b = parts.findIndex(([, end]) => end >= at + mark.length);
    while (a > 0 && VIRAMA.test(parts[a - 1][2])) a -= 1;
    while (b < parts.length - 1 && VIRAMA.test(parts[b][2])) b += 1;
    const from = parts[a][0], to = parts[b][1];
    return (
        <>
            {text.slice(0, from)}
            <span className="underline decoration-2 underline-offset-4" style={{ color: COLORS.orange.ink }} data-letter-inside={mark}>{text.slice(from, to)}</span>
            {text.slice(to)}
        </>
    );
}

export function LetterWordsStep({ step }) {
    const [heard, setHeard] = useState('');
    const hear = (w) => { setHeard(w.word); play(null, [w.forSay || `${w.word} for ${w.for}`, w.sentence].filter(Boolean).join('. '), w.locale || 'en-IN'); };
    // English says "A for apple"; another language shows its word with how it sounds (ಅ — ಅಮ್ಮ, amma).
    const english = (step.words[0]?.locale || 'en').startsWith('en');
    const first = step.words[0];
    const lang = (w) => (w.locale || 'en-IN').split('-')[0];
    return (
        <div className="lingo-in space-y-4">
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>
                <Volume2 size={16} /> {english ? 'A for apple' : <span className="normal-case" lang={lang(first)}>{first.word} — {first.for}</span>}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" data-letter-words>
                {step.words.map((w) => (
                    <button key={w.word} type="button" onClick={() => hear(w)} aria-label={`${w.word} for ${w.for}`} data-letter-word={w.word}
                        className="lingo-tile flex flex-col gap-1.5 px-3 py-3 text-left transition-transform active:scale-95"
                        style={heard === w.word ? { borderColor: COLORS.green.face, background: COLORS.green.light } : undefined}>
                        <span className="flex w-full items-center justify-between gap-2">
                            <span className="text-3xl font-extrabold leading-none text-[#3c3c3c]" lang={lang(w)}>{w.word}{w.word.toLowerCase() !== w.word && <span className="text-[#AFAFAF]">{w.word.toLowerCase()}</span>}</span>
                            <span className="text-4xl leading-none" aria-hidden="true">{w.pic}</span>
                        </span>
                        {english
                            ? <span className="text-[15px] font-bold leading-tight text-[#4b4b4b]" lang="en">{w.word} <span className="text-[#AFAFAF]">for</span> {w.for}</span>
                            : (
                                <span className="text-[15px] font-bold leading-tight text-[#4b4b4b]">
                                    <span lang={lang(w)}>{w.word} — <InWord text={w.for} mark={w.inside} /></span>
                                    {w.forSound && <span className="ml-1 text-[13px] font-bold" style={{ color: COLORS.blue.ink }} lang="en" data-letter-word-say>{w.forSound}</span>}
                                </span>
                            )}
                        {/* The word in a sentence, as the quiz asks it (2026-10-31); in another language, how it sounds and what it means. */}
                        {w.sentence && <span className="text-[13px] font-semibold italic leading-snug text-[#777]" lang={lang(w)} data-letter-sentence>{w.sentence}</span>}
                        {w.sentenceSound && <span className="text-[12px] font-bold leading-snug" style={{ color: COLORS.blue.ink }} lang="en" data-letter-sentence-say>{w.sentenceSound}</span>}
                        {w.sentenceEn && <span className="text-[12px] font-semibold leading-snug text-[#AFAFAF]" lang="en" data-letter-sentence-en>{w.sentenceEn}</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Before the quiz, every answer given before it (2026-11-04, the user: "before Quiz time! show the review of the
 * answers", every language): each practice question with the student's first answer — green if right, crossed out
 * with the right one and why if not — and each matching round's words, with any wrong picks.
 */
export function PracticeReviewStep({ step }) {
    const T = tr(step.language);
    const right = step.items.filter((x) => x.correct).length;
    return (
        <div className="lingo-in space-y-4" data-practice-review={step.items.length}>
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }} data-practice-score>{right} / {step.items.length}</p>
            <Title>{T('Review your answers')}</Title>
            <ul className="space-y-3">
                {step.items.map((m) => (
                    <li key={m.id} className="rounded-2xl border-2 bg-white px-4 py-3" style={{ borderColor: m.correct ? COLORS.green.light : COLORS.red.light }} data-review-entry={m.correct ? 'right' : 'wrong'}>
                        {m.kind === 'pairs' ? (
                            <>
                                <p className="text-[15px] font-extrabold text-[#3c3c3c]">{T('Tap the matching pairs')}</p>
                                <ul className="mt-2 space-y-1.5">
                                    {m.rows.map((r) => (
                                        <li key={r.word} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] font-bold" data-review-pair={r.chosen.length ? 'wrong' : 'right'}>
                                            <span className="text-[#3c3c3c]" lang={langFor(r.word)} dir="auto">{r.word}</span>
                                            {r.chosen.map((c) => <span key={c} className="line-through decoration-2" style={{ color: COLORS.red.ink }} lang={langFor(c)} dir="auto">{c}</span>)}
                                            <span className="inline-flex items-center gap-1" style={{ color: COLORS.green.ink }}><Check size={15} strokeWidth={3} aria-hidden="true" /><span lang={langFor(r.right)} dir="auto">{r.right}</span></span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <>
                                <p className="break-words text-[16px] font-extrabold text-[#3c3c3c]" lang={langFor(m.prompt)} dir="auto" data-review-prompt>{m.prompt}</p>
                                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold">
                                    <span className="text-[#AFAFAF]">{T('Your answer')}:</span>
                                    <span className={`break-words ${m.correct ? '' : 'line-through decoration-2'}`} style={{ color: m.correct ? COLORS.green.ink : COLORS.red.ink }} lang={langFor(m.given)} dir="auto" data-review-given>{m.given || '—'}</span>
                                    {m.correct && <Check size={16} strokeWidth={3} className="self-center" style={{ color: COLORS.green.ink }} aria-label="Right" />}
                                </p>
                                {!m.correct && (
                                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold" style={{ color: COLORS.green.ink }}>
                                        <Check size={16} strokeWidth={3} className="shrink-0 self-center" aria-hidden="true" />
                                        <span>{T('Right answer')}:</span>
                                        <span className="break-words" lang={langFor(m.answer)} dir="auto" data-review-answer>{m.answer}</span>
                                    </p>
                                )}
                                {!m.correct && m.explanation && <p className="mt-1 break-words text-sm font-semibold text-[#777]" data-review-why>{T('Why: ')}{m.explanation}</p>}
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Say this sentence (2026-11-06, the user's Duolingo pictures: "ಈ ವಾಕ್ಯವನ್ನು ಹೇಳಿ", the sentence with its speaker, a wide "click to
 * speak" button that turns into a green tick when it is said right; else a message): the browser writes down what is said
 * (its speech-to-text, as "Speak on a topic"), and its words are compared with the sentence's (logic.js saidRight). Right:
 * the tick, then on by itself (Session's onDone); not: what was heard, and again.
 */
export function SayItStep({ step, locked, onDone }) {
    const q = step.q;
    const T = tr(step.language);
    const [state, setState] = useState('idle');   // idle | listening | right | wrong | nothing | blocked
    const [heard, setHeard] = useState('');
    const rec = useRef(null);
    useEffect(() => () => { try { rec.current?.abort(); } catch { /* not listening */ } }, []);
    const lang = q.sayLang || 'en-IN';
    const listen = () => {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition || locked || state === 'listening' || state === 'right') return;
        const r = new Recognition();
        rec.current = r;
        r.lang = lang; r.interimResults = false; r.continuous = false; r.maxAlternatives = 5;
        r.onresult = (e) => {
            const said = [...(e.results?.[0] || [])].map((a) => a.transcript);
            setHeard(said[0] || '');
            if (said.some((t) => saidRight(t, q.say, lang))) { setState('right'); setTimeout(() => onDone?.([]), 500); }
            else { setState('wrong'); chime('wrong'); }
        };
        r.onerror = (e) => setState(['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error) ? 'blocked' : 'nothing');
        r.onend = () => setState((s) => (s === 'listening' ? 'nothing' : s));
        setHeard(''); setState('listening');
        try { r.start(); } catch { setState('blocked'); }
    };
    const tone = state === 'right' ? COLORS.green : state === 'wrong' ? COLORS.red : null;
    return (
        <div className="lingo-in space-y-6" data-sayit={q.id}>
            <Title>{T('Say this sentence')}</Title>
            <Bubble pose="point-right" lang={lang.split('-')[0]} speaker={<Speaker text={q.say} lang={lang} size="sm" />}>
                <span data-sayit-text>{q.say}</span>
            </Bubble>
            <button type="button" onClick={listen} disabled={locked || state === 'right'} aria-label={T('Click to speak')}
                className="lingo-tile flex min-h-16 w-full items-center justify-center gap-2.5 px-4 text-[17px] font-extrabold disabled:opacity-100"
                style={tone ? { borderColor: tone.face, background: tone.light, color: tone.ink } : { color: COLORS.blue.ink }} data-sayit-mic={state}>
                {state === 'right' ? <Check size={36} strokeWidth={4} style={{ color: COLORS.green.face }} />
                    : state === 'listening' ? <><Mic size={24} className="animate-pulse" /> {T('Listening…')}</>
                        : <><Mic size={24} /> {T('Click to speak')}</>}
            </button>
            {state === 'wrong' && <p className="text-center text-[15px] font-bold" style={{ color: COLORS.red.ink }} role="status" data-sayit-message="wrong">{T('Not quite — try again.')} {heard && <span className="block font-semibold text-[#777]">{T('We heard:')} “<span dir="auto">{heard}</span>”</span>}</p>}
            {state === 'nothing' && <p className="text-center text-[15px] font-bold text-[#777]" role="status" data-sayit-message="nothing">{T('We did not hear anything. Tap and speak again.')}</p>}
            {state === 'blocked' && <p className="text-center text-[15px] font-bold" style={{ color: COLORS.red.ink }} role="status" data-sayit-message="blocked">{T('Allow the microphone, then tap and speak.')}</p>}
        </div>
    );
}

/** A picture story (2026-10-31, the server's comics.js): its comic page, read before its questions. */
export function ComicStep({ step }) {
    return (
        <div className="lingo-in space-y-3">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.purple.ink }}>Picture story</p>
            <p className="text-[15px] font-semibold text-[#777]">Read the story panel by panel, then answer the questions on it.</p>
            <Comic comic={step.comic} />
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
/** `meanings` { choice: its English } (2026-11-06, a course's story question): a choice tapped is chosen and shows its English. */
function Choices({ options, value, onChange, locked, result, language, says = null, meanings = null, hint = null, meaningLang = 'en' }) {
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
                    <button key={o} type="button" role="radio" aria-checked={chosen} disabled={locked} onClick={(e) => { onChange(o); if (meanings?.[o]) hint?.show(`o${i}`, [meanings[o]], e, meaningLang, { toggle: false }); }} data-option={i}
                        className={`lingo-tile flex min-h-14 items-center gap-3 px-3 py-2.5 text-left text-[17px] text-[#4b4b4b] ${locked && !right && !wrong ? 'opacity-60' : ''}`} style={look}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold" style={{ borderColor: chosen || right || wrong ? 'currentColor' : '#E5E5E5', color: chosen || right || wrong ? undefined : '#AFAFAF' }}>{i + 1}</span>
                        <span className="min-w-0 flex-1">
                            <span className="block break-words" lang={langFor(o, language)} dir="auto">{o}</span>
                            {/* How the choice sounds, in English letters (a course's language, 2026-10-27). */}
                            {says?.[o] && <span className="mt-0.5 block break-words text-sm font-bold" style={{ color: right || wrong ? undefined : COLORS.blue.ink }} data-say>{says[o]}</span>}
                        </span>
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
/**
 * Word tiles to put in order. `correction`: after a wrong answer, the right
 * one in green inside the answer box, on its own line under the tiles
 * (2026-10-27), while the student puts the words in order again. `meanings` { tile: [meanings] } (2026-11-06): a tile
 * tapped shows its meaning in `meaningLang` where it was, as it goes into the answer.
 */
function Tiles({ words, value, onChange, locked, tone, language, correction = null, says = null, correctionSay = null, meanings = null, meaningLang = 'en', speak = null }) {
    const [hintRef, hint] = useHint();
    // How each tile sounds, in English letters, under it (a course's language, 2026-10-27).
    const face = (w) => (says?.[w] ? <><span className="block">{w}</span><span className="block text-[11px] font-bold" style={{ color: COLORS.blue.ink }} data-tile-say>{says[w]}</span></> : w);
    const placed = value;
    // Tiles in Urdu or Arabic are placed right to left.
    const dir = words.some((w) => langFor(w, language) && isRtl(langFor(w, language))) ? 'rtl' : undefined;
    const line = tone === 'right' ? COLORS.green.face : tone === 'wrong' ? COLORS.red.face : '#E5E5E5';
    // A tile tapped shows its meaning and stays; tapped again, it goes into the answer (2026-11-06, the user: "only show
    // the meaning, don't send the tile up"; chose "tap again to place"). One with no meaning goes in at once.
    const tap = (i, e) => {
        const w = words[i];
        // Every tile heard as it is first tapped (2026-11-06, the user: "the voice for all tile words"), in its own language
        // (`speak`: the voice given — tap what you hear); the second tap that puts it in, after its meaning, is not read again.
        if (hint.open !== `t${i}` && soundOn()) play(null, w, speak || tileVoice(w, language));
        if (meanings?.[w] && hint.open !== `t${i}`) { hint.show(`t${i}`, meanings[w], e, meaningLang, { toggle: false }); return; }
        hint.close();
        onChange([...placed, i]);
    };
    return (
        <div className="relative space-y-6" ref={hintRef}>
            <div className="flex min-h-[7.5rem] flex-wrap content-start gap-2 py-2" aria-label="Your answer" data-placed dir={dir}
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 3.45rem, ${line} 3.45rem, ${line} 3.6rem)` }}>
                {placed.map((i, k) => (
                    <button key={`${i}-${k}`} type="button" disabled={locked} onClick={() => { hint.close(); onChange(placed.filter((_, x) => x !== k)); }}
                        className={`lingo-tile lingo-pop h-12 px-3.5 text-[17px] text-[#4b4b4b] ${says ? 'flex flex-col items-center justify-center leading-tight' : ''}`} lang={langFor(words[i], language)}
                        style={tone === 'wrong' ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink } : undefined}>{face(words[i])}</button>
                ))}
                {/* Full width, so always a line of its own: the second line while the first is still empty. */}
                {correction && !placed.length && <span aria-hidden="true" className="h-12 basis-full" />}
                {correction && <p className="flex min-h-12 basis-full items-center break-words px-1 text-[17px] font-extrabold" style={{ color: COLORS.green.ink }} lang={langFor(correction, language)} data-correction>{correction}</p>}
                {correction && correctionSay && <p className="-mt-2 basis-full break-words px-1 text-sm font-bold" style={{ color: COLORS.green.ink }} data-correction-say>{correctionSay}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-2" data-tiles dir={dir}>
                {words.map((w, i) => {
                    const used = placed.includes(i);
                    return (
                        <span key={`${w}-${i}`} className="inline-flex rounded-[0.9rem] bg-[#E5E5E5]">
                            <button type="button" disabled={locked || used} onClick={(e) => tap(i, e)} aria-hidden={used ? 'true' : undefined} tabIndex={used ? -1 : 0} aria-pressed={hint.open === `t${i}` ? 'true' : undefined} data-tile-meaning={meanings?.[w] ? 'yes' : undefined}
                                className={`lingo-tile h-12 px-3.5 text-[17px] text-[#4b4b4b] ${says ? 'flex flex-col items-center justify-center leading-tight' : ''} ${used ? 'invisible' : ''}`} style={hint.open === `t${i}` ? PEEKED : undefined} lang={langFor(w, language)}>{face(w)}</button>
                        </span>
                    );
                })}
            </div>
            {hint.pop}
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
                {context.passage || context.comic ? <BookOpen size={18} /> : <Headphones size={18} />}
                <span className="flex-1">{context.comic ? `See “${context.comic.title}”${context.comic.titleEn ? ` (${context.comic.titleEn})` : ''} again` : context.passage ? `Read “${context.passage.title}” again` : T('Hear the conversation again')}</span>
                <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="border-t-2 border-[#E5E5E5] p-4">
                    {context.comic ? <Comic comic={context.comic} /> : context.passage
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

/**
 * A sentence to fill in (2026-11-05, as Duolingo's "ಬಿಟ್ಟ ಸ್ಥಳ ತುಂಬಿ" — "a [rabbit], two [rabbits]"; the user chose
 * word tiles): its meaning in the student's language above, the sentence in the language learnt with a box for each
 * missing word, and the tiles. A tile tapped drops into the first empty box; a filled box tapped gives its tile back.
 * Checked, the boxes go green or red, and a wrong answer's whole sentence shows under it.
 */
function BlanksBody({ q, value, onChange, locked, tone, lang, locale, hintLang, correction, T }) {
    // Each word of the sentence and each tile, tapped, its meaning (2026-11-06: in English, or, English learnt, in the
    // student's language — `q.meaningLang`).
    const [hintRef, hint] = useHint();
    const slots = q.parts.filter((p) => p === null).length;
    const filled = Array.from({ length: slots }, (_, k) => (Array.isArray(value) && Number.isInteger(value[k]) ? value[k] : null));
    const used = new Set(filled.filter((i) => i !== null));
    // A tile tapped is read aloud and shows its meaning, and stays; tapped again, it goes into the next box (2026-11-06,
    // the user: "only show the meaning, don't send the tile up"; chose "tap again to place"). One with no meaning goes in at once.
    const put = (i, e) => {
        if (locked || used.has(i)) return;
        const k = filled.indexOf(null);
        if (k === -1) return;
        const peek = q.tileMeanings?.[i]?.length && hint.open !== `t${i}`;
        // The word read aloud (2026-11-05, "like Duolingo"), in the language learnt, as it is first tapped; sound off, silent.
        if (soundOn() && hint.open !== `t${i}`) play(null, q.words[i], locale);
        if (peek) { hint.show(`t${i}`, q.tileMeanings[i], e, q.meaningLang, { toggle: false }); return; }
        hint.close();
        onChange(filled.map((x, j) => (j === k ? i : x)));
    };
    const back = (k) => { if (!locked && filled[k] !== null) { hint.close(); onChange(filled.map((x, j) => (j === k ? null : x))); } };
    const look = tone === 'wrong' ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink }
        : tone === 'right' ? { borderColor: COLORS.green.face, background: COLORS.green.light, color: COLORS.green.ink } : {};
    // Each piece's box number (its place among the blanks), or -1 for words.
    const boxOf = q.parts.map((p, i) => (p === null ? q.parts.slice(0, i).filter((x) => x === null).length : -1));
    return (
        <div className="relative space-y-5" ref={hintRef}>
            <Title>{T('Fill in the blanks')}</Title>
            {q.hint && <Bubble pose="thinking" lang={hintLang}><span className="text-[17px]" data-blanks-hint>{q.hint}</span></Bubble>}
            <p className="text-[21px] font-bold leading-[2.7] text-[#3c3c3c]" lang={lang} dir="auto" data-blanks translate="no">
                {q.parts.map((p, i) => {
                    if (p !== null) return <span key={i} className="whitespace-pre-wrap">{q.partWords?.[i] ? hintPieces(q.partWords[i], hint, q.meaningLang || 'en', (k) => `${i}-${k}`) : p}</span>;
                    const k = boxOf[i];
                    const w = filled[k] === null ? null : q.words[filled[k]];
                    return (
                        <button key={i} type="button" onClick={() => back(k)} disabled={locked || w === null} aria-label={w === null ? `${T('Fill in the blanks')} ${k + 1}` : w} data-blank={k}
                            className="lingo-tile mx-1 inline-flex h-12 min-w-[84px] items-center justify-center px-3 align-middle text-[19px] disabled:opacity-100"
                            style={w === null ? { borderStyle: 'dashed', background: '#fff' } : look}>
                            {w ?? ' '}
                        </button>
                    );
                })}
            </p>
            {correction && (
                <div className="lingo-in rounded-2xl px-4 py-3" style={{ background: COLORS.green.light }} data-correction-box>
                    <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}>{T('Correct solution:')}</p>
                    <p className="mt-0.5 break-words text-[17px] font-extrabold" style={{ color: COLORS.green.ink }} lang={lang} dir="auto" data-correction>{correction}</p>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-2" data-tiles>
                {q.words.map((w, i) => (
                    <button key={`${w}-${i}`} type="button" onClick={(e) => put(i, e)} disabled={locked || used.has(i)} lang={lang} aria-pressed={hint.open === `t${i}` ? 'true' : undefined}
                        className={`lingo-tile h-12 px-4 text-[18px] ${used.has(i) ? 'invisible' : ''}`} style={hint.open === `t${i}` ? PEEKED : undefined}>{w}</button>
                ))}
            </div>
            {hint.pop}
        </div>
    );
}

/**
 * Write the word (2026-11-06, the user's Duolingo picture: "Write “ಬೆಕ್ಕು” in English", a drawn cat, the box beside it — in
 * every language): the word in the student's language in the title, its picture (or the mascot) beside the answer box;
 * a course's own letters on the keys (its sound in English letters counts too). English's letter-count hint under it.
 */
function WriteWord({ q, step, value, onChange, locked, wrong, T }) {
    const [keys, setKeys] = useState(false);
    const ref = useRef(null);
    const writeIn = q.writeIn || 'en';
    const lang = step.language || 'kn';
    const keysIn = writeIn !== 'en' && hasLetters(writeIn) ? writeIn : null;
    return (
        <>
            <Title>{q.kannada ? writeWord(lang, q.kannada, writeIn, langOf(writeIn).name) : q.prompt}</Title>
            <div className="flex items-center gap-4 sm:gap-6" data-write-word>
                {q.pic
                    ? <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-[#F7F7F7] text-[64px] leading-none sm:h-36 sm:w-36 sm:text-[84px]" aria-hidden="true" data-word-pic>{q.pic}</span>
                    : <MoodMascot pose="thinking" className="h-28 w-24 shrink-0 sm:h-36 sm:w-32" />}
                <div className="min-w-0 flex-1">
                    <AnswerBox inputRef={ref} value={value} onChange={onChange} locked={locked} rows={1} lang={writeIn} wrong={wrong}
                        placeholder={writeIn === 'en' ? T('Type in English') : langOf(writeIn).placeholder} label={q.kannada ? writeWord(lang, q.kannada, writeIn, langOf(writeIn).name) : q.prompt} />
                    {q.hint && <p className="mt-2 font-mono text-sm font-bold tracking-[0.25em] text-[#AFAFAF]" aria-label={`Hint: ${q.hint}`} data-write-hint>{q.hint}</p>}
                </div>
            </div>
            {keysIn && !locked && (
                <button type="button" onClick={() => setKeys((k) => !k)} aria-expanded={keys} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.red.ink }} data-letters-toggle>
                    <Keyboard size={15} /> {line(lang, 'letters', langOf(keysIn).name, keys)}
                </button>
            )}
            {keys && !locked && keysIn && <KeysPopup code={keysIn} title={line(lang, 'letters', langOf(keysIn).name, false)} onClose={() => setKeys(false)} inputRef={ref} value={value} onChange={onChange} />}
        </>
    );
}

/**
 * Tap what you hear (2026-11-06, the user's Duolingo picture: "ನಿಮಗೆ ಕೇಳುತ್ತಿರುವುದನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ", a big speaker and a slow
 * one, then the word tiles — each heard as it is tapped; in every language): the sentence plays by itself as the question
 * opens, again on the speaker, slowly on the turtle; the student builds it from the tiles.
 */
function HearBody({ q, value, onChange, locked, tone, correction, T }) {
    const hear = (rate) => play(null, q.say, q.sayLang || 'en-IN', { rate });
    useEffect(() => { if (soundOn()) play(null, q.say, q.sayLang || 'en-IN'); }, [q.say, q.sayLang]);
    const big = { background: COLORS.blue.face, boxShadow: `0 5px 0 ${COLORS.blue.edge}` };
    return (
        <>
            <Title>{T('Tap what you hear')}</Title>
            <div className="flex items-end justify-center gap-4 py-2" data-hear>
                <button type="button" onClick={() => hear(null)} aria-label={T('Play')} className="flex h-24 w-24 items-center justify-center rounded-3xl text-white active:translate-y-1 sm:h-28 sm:w-28" style={big} data-hear-play>
                    <Volume2 size={44} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => hear(0.6)} aria-label={T('Play slowly')} className="flex h-16 w-16 items-center justify-center rounded-2xl text-white active:translate-y-1 sm:h-20 sm:w-20" style={big} data-hear-slow>
                    <Turtle size={30} strokeWidth={2.5} />
                </button>
            </div>
            <Tiles words={q.words || []} value={value} onChange={onChange} locked={locked} tone={tone} language={String(q.sayLang || 'en').split('-')[0]} correction={correction} speak={q.sayLang || 'en-IN'} />
        </>
    );
}

/**
 * Fill in the blank (grammar): its choices to tap, the one tapped in the blank and heard (2026-11-06, the user: "give the
 * options here — typing is hard; in all languages"; "give the voice for the tile"); "Use keyboard" to type it instead.
 */
function FillBody({ q, value, onChange, locked, tone, T }) {
    const [typing, setTyping] = useState(!q.options?.length);
    const look = (o) => (value !== o ? {} : tone === 'wrong' ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink }
        : tone === 'right' ? { borderColor: COLORS.green.face, background: COLORS.green.light, color: COLORS.green.ink } : { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink });
    return (
        <>
            <Title>{T('Fill in the blank')}</Title>
            <Bubble pose="thinking"><Blanks text={q.prompt} fill={value} /></Bubble>
            {typing
                ? <AnswerBox value={value} onChange={onChange} locked={locked} rows={1} placeholder={T('Type the missing word')} wrong={tone === 'wrong'} />
                : (
                    <div className="flex flex-wrap justify-center gap-2.5" role="radiogroup" data-fill-options>
                        {q.options.map((o) => (
                            <button key={o} type="button" role="radio" aria-checked={value === o} disabled={locked} onClick={() => { onChange(o); if (soundOn()) play(null, o, 'en-IN'); }}
                                className="lingo-tile h-12 min-w-[4.5rem] px-4 text-[18px] text-[#4b4b4b] disabled:opacity-100" style={look(o)} data-fill-option={o}>{o}</button>
                        ))}
                    </div>
                )}
            {q.options?.length > 0 && !locked && (
                <button type="button" onClick={() => { setTyping((t) => !t); onChange(''); }} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.ink }} data-fill-swap>
                    {typing ? <><LayoutGrid size={15} /> {T('Use word bank')}</> : <><Keyboard size={15} /> {T('Use keyboard')}</>}
                </button>
            )}
        </>
    );
}

/**
 * Complete the conversation (2026-11-07, the user's Duolingo picture: "ಈ ಸಂಭಾಷಣೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ" — a person asks a
 * question, the reply is blank, its answer among numbered choices; with its voice): the question is heard as it opens
 * and again on its speaker; tapped, its meaning. Each reply is heard as it is tapped, shows its meaning, and goes into
 * the empty reply bubble.
 */
function ChatBody({ q, value, onChange, locked, result, language, hint, T }) {
    const locale = q.sayLang || 'en-IN';
    const lang = locale.split('-')[0];
    // Each in their own voice (2026-11-07, the user: "a woman's picture, a woman's voice; a man's, a man's"): the one who
    // asks, and the one who answers — the other.
    const asker = q.who === 'm' ? 'm' : 'f', replier = asker === 'm' ? 'f' : 'm';
    useEffect(() => { if (soundOn()) play(null, q.say, locale, { gender: asker }); }, [q.say, locale, asker]);
    const pick = (o) => { onChange(o); if (soundOn()) play(null, o, locale, { gender: replier }); };
    const tone = result ? (result.correct ? COLORS.green : COLORS.red) : null;
    const look = tone ? { borderColor: tone.face, background: tone.light, color: tone.ink } : { borderColor: '#E5E5E5', background: '#fff', color: '#4b4b4b' };
    return (
        <>
            <Title>{T('Complete the conversation')}</Title>
            <div className="flex items-start gap-3" data-chat-ask>
                <span className="shrink-0 text-[3.5rem] leading-none sm:text-[4.5rem]" role="img" aria-label={q.who === 'm' ? 'A man asks' : 'A woman asks'}>{q.who === 'm' ? '👨🏽' : '👩🏽‍🦱'}</span>
                <div className="lingo-bubble mt-2 flex min-w-0 items-center gap-3 px-4 py-3">
                    <Speaker text={q.say} lang={locale} size="sm" gender={asker} />
                    {q.askMeaning
                        ? <button type="button" onClick={(e) => hint.show('ask', [q.askMeaning], e, q.meaningLang)} aria-expanded={hint.open === 'ask'} className={`${HINT_MARK} min-w-0 break-words text-left text-[17px] font-bold text-[#4b4b4b] sm:text-lg`} lang={lang} dir="auto" data-hint-word="ask">{q.ask}</button>
                        : <p className="min-w-0 break-words text-[17px] font-bold text-[#4b4b4b] sm:text-lg" lang={lang} dir="auto">{q.ask}</p>}
                </div>
            </div>
            {/* The reply, blank until a choice is tapped — said by a second person, on the right (2026-11-07, the user: "add
                the other person; not only the answer space"). */}
            <div className="flex items-start justify-end gap-3" data-chat-answer>
                <div className="relative mt-2 min-h-14 min-w-0 flex-1 rounded-2xl border-2 px-4 py-3 text-[17px] font-bold sm:max-w-[75%]" style={look} lang={lang} dir="auto" data-chat-reply>
                    {value || <span className="mt-4 block border-b-2 border-[#AFAFAF]" aria-hidden="true" />}
                    <span className="absolute -right-[9px] top-5 h-4 w-4 rotate-45 border-r-2 border-t-2" style={{ borderColor: look.borderColor, background: look.background }} aria-hidden="true" />
                </div>
                <span className="shrink-0 text-[3.5rem] leading-none sm:text-[4.5rem]" role="img" aria-label={q.who === 'm' ? 'A woman answers' : 'A man answers'} data-chat-replier>{q.who === 'm' ? '👩🏽‍🦱' : '👨🏽'}</span>
            </div>
            <Choices options={q.options || []} value={value} onChange={pick} locked={locked} result={result} language={language} meanings={q.optionMeanings} hint={hint} meaningLang={q.meaningLang} />
        </>
    );
}

export function QuestionStep({ step, value, onChange, locked, result, correction }) {
    const q = step.q;
    // A question's words in the language learnt, tapped: their English (2026-11-06).
    const [hintRef, hint] = useHint();
    const T = tr(step.language);
    const tone = result ? (result.correct ? 'right' : 'wrong') : null;
    let body;
    if (q.type === 'chat') {
        body = <ChatBody q={q} value={value} onChange={onChange} locked={locked} result={result} language={step.language} hint={hint} T={T} />;
    } else if (q.type === 'hear') {
        body = <HearBody q={q} value={value} onChange={onChange} locked={locked} tone={tone} correction={correction} T={T} />;
    } else if (q.type === 'mcq') {
        const [title, sentence] = splitPrompt(q.prompt);
        body = (
            <>
                {/* A question in the language learnt (a course's story) is marked: tapped, its English (2026-11-06). */}
                <Title>{q.promptMeaning
                    ? <button type="button" onClick={(e) => hint.show('prompt', [q.promptMeaning], e, q.meaningLang || 'en')} aria-expanded={hint.open === 'prompt'} className={`${HINT_MARK} text-left`} dir="auto" data-hint-word="prompt">{q.prompt}</button>
                    : <Blanks text={title} />}</Title>
                {/* The word asked about, to hear and to read in English letters (2026-10-27): a course's word in letters
                    the student may not read ("What does 食べ物 mean?") is the word they had on its card, "tabemono". */}
                {q.promptSay && (
                    <Bubble pose="point-right" lang={q.promptSay.locale} speaker={<Speaker text={q.promptSay.text} lang={q.promptSay.locale} size="sm" />}>
                        <span className="block text-2xl" data-prompt-word>{q.promptSay.text}</span>
                        <span className="mt-1 block text-[15px] font-bold" style={{ color: COLORS.blue.ink }} lang="en" data-prompt-say>{q.promptSay.say}</span>
                    </Bubble>
                )}
                {q.say && <ListenPrompt q={q} />}
                {sentence && <p className="rounded-2xl border-2 border-[#E5E5E5] px-4 py-3 text-lg font-bold text-[#4b4b4b]"><Blanks text={sentence} fill={value} /></p>}
                <Choices options={q.options || []} value={value} onChange={onChange} locked={locked} result={result} language={step.language} says={q.says} meanings={q.optionMeanings} hint={hint} meaningLang={q.meaningLang} />
            </>
        );
    } else if (q.type === 'rearrange') {
        body = <><Title>{q.prompt}</Title><Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={tone} language={step.language} correction={correction} /></>;
    } else if (q.type === 'blanks') {
        body = <BlanksBody q={q} value={value} onChange={onChange} locked={locked} tone={tone} lang={step.target && step.target !== 'en' ? step.target : 'en'} locale={step.targetLocale || 'en-IN'} hintLang={step.language} correction={correction} T={T} />;
    } else if (q.type === 'fill') {
        body = <FillBody q={q} value={value} onChange={onChange} locked={locked} tone={tone} T={T} />;
    } else if (q.type === 'correction') {
        body = (
            <>
                <Title>{T('Correct this sentence')}</Title>
                <Bubble pose="curious-question">{q.prompt}</Bubble>
                <AnswerBox value={value} onChange={onChange} locked={locked} rows={2} placeholder={T('Write the correct sentence')} label="Your corrected sentence" wrong={tone === 'wrong'} />
            </>
        );
    } else {
        body = <WriteWord q={q} step={step} value={value} onChange={onChange} locked={locked} wrong={tone === 'wrong'} T={T} />;
    }
    return (
        <div className="lingo-in relative space-y-5" ref={hintRef} data-question={q.id}>
            {q.hint && q.type !== 'spelling' && q.type !== 'blanks' && <p className="text-sm font-bold text-[#AFAFAF]">{T('Hint: ')}{q.hint}</p>}
            {body}
            <ContextPeek context={step.context} T={T} />
            {hint.pop}
        </div>
    );
}

/** A tile whose meaning is shown, waiting for a second tap to go in: blue. */
const PEEKED = { borderColor: COLORS.blue.face, background: COLORS.blue.light, color: COLORS.blue.ink };
/** A word's marks before and after it (a full stop, a comma, quotes) kept off its dotted line: ['', 'ದೊಡ್ಡದು', '.']. */
const HINT_PIECE = /^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su;
const HINT_WIDTH = 280;
/** A word marked as one to tap for its meaning. */
const HINT_MARK = 'rounded-sm underline decoration-[#AFAFAF] decoration-dotted decoration-2 underline-offset-[7px] hover:bg-[#F7F7F7]';

/**
 * A word's meanings in a box under it, one to a row, its arrow at the word (2026-11-06, the user's Duolingo pictures):
 * `[ref, hint]`: `ref` goes on the element it is placed in; `show(key, rows, event, lang)` opens it under what was tapped (again on
 * the same word: closed), `pop` is the box. A tap anywhere outside, or Escape, closes it; it lets taps through to what
 * is under it (a tile's meaning over the CHECK button).
 */
function useHint() {
    const [hint, setHint] = useState(null);     // { key, rows, lang, left, width, arrow, top }
    const ref = useRef(null);
    useEffect(() => {
        if (!hint) return undefined;
        const away = (e) => { if (!ref.current?.contains(e.target)) setHint(null); };
        const key = (e) => { if (e.key === 'Escape') setHint(null); };
        document.addEventListener('pointerdown', away, true);
        window.addEventListener('keydown', key);
        return () => { document.removeEventListener('pointerdown', away, true); window.removeEventListener('keydown', key); };
    }, [hint]);
    const show = (key, rows, e, lang = 'en', { toggle = true } = {}) => {
        if ((toggle && hint?.key === key) || !rows?.length) { setHint(null); return; }
        const a = ref.current?.getBoundingClientRect(), b = e.currentTarget.getBoundingClientRect();
        if (!a) { setHint({ key, rows, lang, left: 0, width: HINT_WIDTH, arrow: 20, top: 0 }); return; }
        // As wide as its longest meaning (and the word), never past the screen's edge (2026-11-02: a phone).
        const longest = Math.max(...rows.map((r) => String(r).length));
        const screenW = document.documentElement.clientWidth;
        const width = Math.min(HINT_WIDTH, screenW - 16, Math.max(b.width + 24, 72, longest * 10 + 44));
        const mid = b.left + b.width / 2;
        const left = Math.max(8 - a.left, Math.min(mid - width / 2 - a.left, screenW - 8 - width - a.left));
        setHint({ key, rows, lang, left, width, arrow: Math.max(14, Math.min(width - 28, mid - a.left - left - 7)), top: b.bottom - a.top + 12 });
    };
    const pop = hint && (
        <span role="tooltip" style={{ left: hint.left, top: hint.top, width: hint.width, margin: 0 }} className="lingo-pop pointer-events-none absolute z-30 block" lang={hint.lang} data-hint-box={hint.key}>
            {/* The arrow at the word. */}
            <span aria-hidden="true" style={{ left: hint.arrow }} className="absolute -top-[7px] block h-3.5 w-3.5 rotate-45 border-l-2 border-t-2 border-[#E5E5E5] bg-white" />
            <span className="block overflow-hidden rounded-2xl border-2 border-[#E5E5E5] bg-white shadow-lg">
                {hint.rows.map((m, i) => (
                    <span key={`${m}-${i}`} className={`block break-words px-4 py-2.5 text-center text-[17px] font-bold leading-snug text-[#4b4b4b] ${i ? 'border-t-2 border-[#E5E5E5]' : ''}`} dir="auto" data-hint-meaning>{m}</span>
                ))}
            </span>
        </span>
    );
    return [ref, { open: hint?.key ?? null, show, close: () => setHint(null), pop }];
}

/** Pieces of a sentence ([[piece, meanings | null]…]) with their words marked to tap; `key` names each word for the box. */
const hintPieces = (pieces, hint, lang, keyOf, spaced = false) => pieces.map(([piece, meanings], k) => {
    const gap = k > 0 && spaced ? ' ' : '';
    if (!meanings?.length) return <Fragment key={k}>{gap}{piece}</Fragment>;
    const [, before, word, after] = String(piece).match(HINT_PIECE) || ['', '', piece, ''];
    const key = keyOf(k);
    return (
        <Fragment key={k}>
            {gap}{before}
            <button type="button" onClick={(e) => hint.show(key, meanings, e, lang)} aria-expanded={hint.open === key} className={`${HINT_MARK} break-words font-bold`} data-hint-word={key}>{word || piece}</button>
            {after}
        </Fragment>
    );
});

/**
 * A sentence to read, its words marked; a word tapped shows two or three English meanings in a box under it, one to a
 * row, its arrow at the word (2026-11-06, the user's Duolingo pictures: "ಚಿಂತೆ" → worry · concern · anxiety; it had
 * one meaning with "Full sentence" under it, 2026-10-27). The words are the sentence's own (`sourceHints.on: 'text'`),
 * or, for Japanese, written without spaces, those of its sound under it ('say'). With no words marked, the sentence
 * itself is tapped for its English as a whole (`sourceEn`: a course's sentence; never the English course's answer).
 * An English sentence to write in the student's language has its words in that language (`sourceHints.lang`, 2026-11-06).
 */
function SourceHints({ it }) {
    const [hintRef, hint] = useHint();
    const hints = it.sourceHints;
    const onText = hints?.on === 'text', onSay = hints?.on === 'say';
    const lang = hints?.lang || 'en';
    const words = hints?.words || [];
    const sentence = onText
        ? <span data-source>{hintPieces(words, hint, lang, (k) => k, hints.spaced)}</span>
        : it.sourceEn
            // With no sound line under it (Hindi, Kannada: 2026-11-02), the sentence itself is marked as one to tap.
            ? <button type="button" onClick={(e) => hint.show('all', [it.sourceEn], e, 'en')} aria-expanded={hint.open === 'all'} className={`text-left ${it.sourceSay ? '' : HINT_MARK}`} data-source>{it.source}</button>
            : <span data-source>{it.source}</span>;
    return (
        <span className="relative block" ref={hintRef}>
            {sentence}
            {it.sourceSay && (onSay
                ? <span className="mt-1 block text-[15px]" style={{ color: COLORS.blue.ink }} data-source-say>{hintPieces(words, hint, lang, (k) => k, true)}</span>
                : <span className="mt-1 block break-words text-[15px] font-bold" style={{ color: COLORS.blue.ink }} data-source-say>{it.sourceSay}</span>)}
            {hint.pop}
        </span>
    );
}

export function TranslateStep({ step, value, onChange, locked, result, correction }) {
    const it = step.item;
    // 'en-kn' is always "the language learnt → the student's language", whichever they are.
    const toHelper = step.direction === 'en-kn';
    const code = step.language || 'kn';
    const L = langOf(code);
    const target = step.target || 'en';
    const T = langOf(target);
    const writeIn = toHelper ? code : target;
    // The letters on screen: those of the language the answer is written in — none for an answer in English (2026-11-04,
    // the user: "the answer is in English, so there is no need for the Kannada keyboard"; it had the course's letters
    // since 2026-10-29).
    const keysIn = writeIn !== 'en' ? writeIn : null;
    const Tr = tr(code);
    const bank = usesTiles(step);
    const ref = useRef(null);
    // The language's letters as a keyboard that pops up when the keyboard icon is tapped (2026-10-29).
    const [keys, setKeys] = useState(false);
    const typing = !Array.isArray(value);
    // A passage close enough (its model shown under it, 2026-11-05): its box stays as written; one far off is red, as any wrong answer.
    const tone = result ? (result.correct ? 'right' : result.correct == null && result.verdict === 'review' ? null : 'wrong') : null;
    const swap = () => onChange(typing ? [] : '');
    return (
        <div className="lingo-in space-y-5" data-translation={it.id}>
            <div className="flex flex-wrap items-center gap-2">
                {/* The course, as the student says it (2026-10-28, "I learn English to German"): their language → the one
                    learnt, on every sentence; the title says which language to write in. */}
                <span className="rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: COLORS.red.light, color: COLORS.red.ink }} data-course-pair>{directionLabel('kn-en', code, target)}</span>
                {it.topic && <span className="rounded-full bg-[#F7F7F7] px-3 py-1 text-xs font-extrabold capitalize text-[#777]">{it.topic}</span>}
            </div>
            <Title>{it.open ? Tr('Translate this passage') : line(code, 'writeIn', (toHelper ? L : T).name)}</Title>
            <Bubble pose="point-right" lang={toHelper ? target : code} speaker={toHelper ? <Speaker text={it.source} lang={step.targetLocale || 'en-IN'} size="sm" /> : null}>
                {it.sourceHints || it.sourceSay || it.sourceEn ? <SourceHints it={it} /> : <span data-source>{it.source}</span>}
            </Bubble>
            {!typing
                ? <Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={tone} language={writeIn} correction={correction} says={it.bankSays} correctionSay={result?.answerSay} meanings={it.bankMeanings} meaningLang={it.meaningLang} />
                : <AnswerBox inputRef={ref} value={value} onChange={onChange} locked={locked} rows={it.open ? 7 : 3} multiline={!!it.open} lang={writeIn} wrong={tone === 'wrong'}
                    placeholder={writeIn === 'en' ? Tr('Type in English') : langOf(writeIn).placeholder} label={`Your translation of: ${it.source}`} />}
            {!locked && (
                <div className="flex flex-wrap gap-2">
                    {/* Typing in place of the tiles only where there are letter keys for it — an answer in English has none
                        (2026-11-04, the user: "don't show Use keyboard, there is no keyboard"): its tiles only. */}
                    {bank && keysIn && (
                        <button type="button" onClick={swap} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#777' }} data-swap-input>
                            {typing ? <><LayoutGrid size={15} /> {Tr('Use word bank')}</> : <><Keyboard size={15} /> {Tr('Use keyboard')}</>}
                        </button>
                    )}
                    {typing && keysIn && hasLetters(keysIn) && (
                        <button type="button" onClick={() => setKeys((k) => !k)} aria-expanded={keys} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.red.ink }} data-letters-toggle>
                            <Keyboard size={15} /> {line(code, 'letters', langOf(keysIn).name, keys)}
                        </button>
                    )}
                </div>
            )}
            {typing && keys && !locked && keysIn && <KeysPopup code={keysIn} title={line(code, 'letters', langOf(keysIn).name, false)} onClose={() => setKeys(false)} inputRef={ref} value={value} onChange={onChange} />}
            {/* Its sound in English letters is an answer too (the server's spellingsOf, 2026-10-29). */}
            {typing && !locked && writeIn !== 'en' && it.bankSays && <p className="text-sm font-bold text-[#777]" data-both-letters>{line(code, 'bothLetters', langOf(writeIn).name)}</p>}
            {it.open && !locked && <p className="text-sm font-bold text-[#AFAFAF]">A passage is not marked by the computer: you will see the model{writeIn === 'en' ? ', and your English is checked sentence by sentence' : ''}.</p>}
        </div>
    );
}

const WRITE_LABEL = { jumbled: 'Put the words in order', sentence: 'Make a sentence', paragraph: 'Write a paragraph', email: 'Write an email', letter: 'Write a letter' };
const wordCount = (t) => (String(t).trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;

export function WriteStep({ step, value, onChange, locked, result, correction }) {
    const t = step.task;
    const T = tr(step.language);
    if (t.type === 'jumbled') {
        return (
            <div className="lingo-in space-y-5" data-writing={t.id}>
                <Title>{T(WRITE_LABEL.jumbled)}</Title>
                <Tiles words={tilesOf(step)} value={value} onChange={onChange} locked={locked} tone={result ? (result.correct ? 'right' : 'wrong') : null} correction={correction} />
            </div>
        );
    }
    const open = OPEN_WRITING.includes(t.type);
    const n = wordCount(value);
    const said = sentenceCount(value);
    // Each point of the checklist ticks itself as it is written (2026-11-07, the user: "why did you put this?" — empty boxes
    // that never ticked); in the student's language.
    const ticks = writeTicksOf(t, value);
    return (
        <div className="lingo-in space-y-4" data-writing={t.id}>
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>{T(WRITE_LABEL[t.type] || 'Write')}</p>
            <Title>{t.prompt}</Title>
            {t.mustInclude?.length > 0 && <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#777]">Use: {t.mustInclude.map((w) => <span key={w} className="rounded-lg px-2 py-0.5 font-extrabold" style={{ background: COLORS.green.light, color: COLORS.green.ink }}>{w}</span>)}</p>}
            <AnswerBox value={value} onChange={onChange} locked={locked} rows={open ? (t.type === 'paragraph' ? 7 : 10) : 3} multiline={open} wrong={!open && result?.correct === false}
                placeholder={t.type === 'email' ? 'Subject: …\n\nDear …,\n\n…\n\nRegards,\nYour name' : t.type === 'letter' ? 'To\n…\n\nDate\n\nSubject: …\n\nRespected Sir / Madam,\n\n…\n\nYours faithfully,\nYour name' : 'Write here…'}
                label={t.prompt} />
            <div className="flex flex-wrap items-start justify-between gap-2">
                {t.checklist?.length > 0 ? (
                    <ul className="min-w-0 space-y-1 text-sm font-semibold" lang={step.language} dir="auto" data-write-checklist>
                        {t.checklist.map((c, i) => (
                            <li key={c} className="flex items-start gap-2 transition-colors" style={{ color: ticks[i] ? COLORS.green.ink : '#777' }} data-write-point={i} data-ticked={ticks[i] ? 'yes' : 'no'}>
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors" style={ticks[i] ? { background: COLORS.green.face, borderColor: COLORS.green.face } : { borderColor: '#CFCFCF' }} aria-hidden="true">{ticks[i] && <Check size={11} strokeWidth={4} className="text-white" />}</span>
                                <span className="min-w-0 break-words">{c}</span>
                            </li>
                        ))}
                    </ul>
                ) : <span />}
                <span className="flex flex-col items-end gap-0.5 text-sm font-extrabold tabular-nums">
                    {open && <span style={{ color: said >= LEAST_SENTENCES ? COLORS.green.ink : n ? COLORS.red.ink : '#AFAFAF' }} data-sentences={said}>{line(step.language, 'sentences', said, LEAST_SENTENCES)}</span>}
                    <span style={{ color: t.minWords && n < t.minWords ? '#AFAFAF' : COLORS.green.ink }}>{line(step.language, 'wordsAtLeast', n, t.minWords || 0)}</span>
                </span>
            </div>
            {/* Three sentences or more, or no going on (2026-10-28). */}
            {open && said < LEAST_SENTENCES && <p className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: n ? COLORS.red.light : COLORS.blue.light, color: n ? COLORS.red.ink : COLORS.blue.ink }} data-sentence-rule>{T('Write at least 3 sentences. End each one with a full stop.')}</p>}
        </div>
    );
}

/**
 * Your turn to speak (asked 2026-10-28: "it will automatically tick based on his voice, don't give a tick option
 * manually"): the microphone, what the browser heard, and the checklist, each point ticking by itself as it is
 * said (parts/speakTicks.js). SAVE waits for a recording, five words or more, and half the points heard. With no
 * speech-to-text in the browser (Firefox), the student records, then types what they said.
 */
export function SpeakStep({ step, value, onChange, locked }) {
    const s = step.speaking;
    const T = tr(step.language);
    const [sample, setSample] = useState(false);
    const [listening, setListening] = useState(false);
    const writes = canTranscribe();
    const ticks = ticksOf(s, value.said, value.seconds);
    const heard = ticks.filter(Boolean).length;
    // A stretch of two seconds or more is a recording; the seconds add up, for the pace.
    const stopped = (secs) => onChange({ ...value, seconds: (value.seconds || 0) + secs, recorded: value.recorded || secs >= 2 });
    return (
        <div className="lingo-in space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.orange.ink }}>{T('Speak')}</p>
            <Title>{T('Your turn to speak')}</Title>
            <Bubble pose="presenting">{s.prompt}</Bubble>
            <TalkRecorder value={value.said} onChange={(said) => onChange({ ...value, said })} onStop={stopped} disabled={locked} onListening={setListening} T={T} />
            {writes && value.said && (
                <div className="rounded-2xl bg-[#F7F7F7] px-4 py-3" data-speak-said>
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('What we heard')}</p>
                    <p className="text-[16px] font-semibold leading-relaxed text-[#4b4b4b]" lang="en">{value.said}</p>
                </div>
            )}
            {!writes && value.recorded && (
                <label className="block" data-speak-typed>
                    <span className="mb-1.5 block text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Type what you said')}</span>
                    <textarea value={value.said} onChange={(e) => onChange({ ...value, said: e.target.value })} readOnly={listening} disabled={locked} rows={4} lang="en" spellCheck={false}
                        className="w-full rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] px-4 py-3 text-[17px] font-semibold text-[#4b4b4b] focus:border-[#84D8FF] focus:bg-white focus:outline-none" />
                </label>
            )}
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
                <div data-speak-points>
                    <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('They tick by themselves as you say them')}</p>
                    <ul className="grid gap-2">
                        {s.checklist.map((c, i) => {
                            const on = ticks[i];
                            return (
                                <li key={c} className="lingo-tile flex min-h-12 items-center gap-3 px-3 text-left text-[15px] text-[#4b4b4b]" style={on ? { borderColor: COLORS.green.face, background: COLORS.green.light } : undefined}
                                    data-speak-point={i} data-on={on ? 'yes' : 'no'}>
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: on ? COLORS.green.face : '#E5E5E5', background: on ? COLORS.green.face : '#fff' }} aria-hidden="true">{on && <Check size={15} strokeWidth={4} className="text-white" />}</span>
                                    <span className="flex-1">{c}</span>
                                    <span className="sr-only">{on ? 'heard' : 'not heard yet'}</span>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-2 text-sm font-extrabold tabular-nums" style={{ color: heard >= needOf(s) ? COLORS.green.ink : '#AFAFAF' }} aria-live="polite" data-speak-heard={heard}>{line(step.language, 'heard', heard, s.checklist.length, needOf(s))}</p>
                </div>
            )}
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
    // Every wrong pick, kept (2026-11-03: "show how many they chose wrong, and the right answer too"): [en, kn].
    const [misses, setMisses] = useState([]);
    const flash = useRef(null);
    useEffect(() => () => clearTimeout(flash.current), []);

    const tap = (side, i) => {
        if (done || matched.includes(i)) return;
        // The word heard as it is tapped: its recording, or the browser's voice (sound on).
        if (side === 'en' && (words[i].audio || soundOn())) play(words[i].audio, words[i].speak || words[i].word, words[i].locale || step.targetLocale || 'en-IN');
        // Its meaning heard too, in the student's language (2026-11-06, "the voice for all tile words"; a letter's picture left out).
        if (side === 'kn' && soundOn()) { const said = String(words[i].kannada || '').replace(/[^\p{L}\p{M}\p{N}\s'’-]/gu, ' ').trim(); if (said) play(null, said, tileVoice(said, step.language || 'kn')); }
        if (!pick || pick.side === side) { setPick({ side, i }); return; }
        const en = side === 'en' ? i : pick.i;
        const kn = side === 'kn' ? i : pick.i;
        setPick(null);
        if (en === kn) {
            const next = [...matched, en];
            setMatched(next);
            // All matched: each word, its right match and any wrong picks, for the review before the quiz (2026-11-04).
            if (next.length === words.length) onDone(words.map((w, k) => ({ word: w.word, right: w.kannada, chosen: [...new Set([...misses, [en, kn]].filter(([e, x]) => e === k && x !== k).map(([, x]) => words[x].kannada))] })));
            else chime('right');
        } else {
            chime('wrong');
            setWrong([en, kn]);
            setMisses((m) => [...m, [en, kn]]);
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

    const cell = (side, i, label, number, say = null, pic = null) => {
        const isDone = matched.includes(i);
        const isPick = pick && pick.side === side && pick.i === i;
        const isWrong = wrong && wrong[side === 'en' ? 0 : 1] === i;
        const look = isWrong ? { borderColor: COLORS.red.face, background: COLORS.red.light, color: COLORS.red.ink }
            : isPick ? { borderColor: '#84D8FF', background: COLORS.blue.light, color: COLORS.blue.ink } : {};
        return (
            <button key={`${side}-${i}`} type="button" disabled={isDone || done} onClick={() => tap(side, i)} aria-pressed={isPick} data-pair={side}
                className={`lingo-tile flex min-h-14 w-full items-center gap-2 px-2.5 text-left text-[16px] text-[#4b4b4b] sm:px-3 ${isWrong ? 'lingo-shake' : ''} ${isDone ? '!border-[#E5E5E5] !bg-white text-[#E5E5E5]' : ''}`} style={look}>
                <span className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-extrabold sm:flex ${isDone ? 'border-[#E5E5E5] text-[#E5E5E5]' : 'border-[#E5E5E5] text-[#AFAFAF]'}`}>{number}</span>
                <span className="min-w-0 flex-1 text-center">
                    <span className="block break-words" lang={side === 'kn' ? step.language || 'kn' : step.target && step.target !== 'en' ? step.target : undefined} dir="auto">
                        {/* A letter's word with its picture (2026-11-05, "make the picture a little big"): the picture twice the word's size. */}
                        {pic && <><span className={`align-middle text-[30px] leading-none ${isDone ? 'opacity-30' : ''}`} aria-hidden="true" data-pair-pic>{pic}</span>{' '}</>}
                        <span className="align-middle">{label}</span>
                    </span>
                    {/* How the word sounds, in English letters, as on its card (2026-10-27). */}
                    {say && <span className="mt-0.5 block break-words text-[13px] font-bold" style={{ color: isDone ? '#E5E5E5' : COLORS.blue.ink }} data-say>{say}</span>}
                </span>
            </button>
        );
    };
    return (
        <div className="lingo-in space-y-5" data-pairs>
            {step.warmup && <p className="text-sm font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }} data-warmup>{tr(step.language)('Warm up: this unit’s words')}</p>}
            <Title>{tr(step.language)('Tap the matching pairs')}</Title>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2.5">{words.map((w, i) => cell('en', i, w.word, i + 1, w.say))}</div>
                <div className="space-y-2.5">{right.map((i, k) => (step.letterWords && words[i].pic && words[i].for
                    ? cell('kn', i, words[i].for, words.length + k + 1, null, words[i].pic)
                    : cell('kn', i, words[i].kannada, words.length + k + 1)))}</div>
            </div>
            <PairMisses misses={misses} words={words} step={step} />
        </div>
    );
}

/**
 * Under the pairs, once one is got wrong (2026-11-03): how many wrong picks, and for each word picked wrongly what was
 * chosen (crossed out) and its right answer.
 */
function PairMisses({ misses, words, step }) {
    if (!misses.length) return null;
    const T = tr(step.language);
    const learnt = step.target && step.target !== 'en' ? step.target : undefined, own = step.language || 'kn';
    const byWord = [...new Set(misses.map(([en]) => en))].map((en) => [en, [...new Set(misses.filter(([e]) => e === en).map(([, kn]) => kn))]]);
    return (
        <div className="lingo-pop rounded-2xl border-2 px-4 py-3" style={{ borderColor: COLORS.red.light, background: '#FFF6F6' }} role="status" data-pair-misses={misses.length}>
            <p className="text-[15px] font-extrabold" style={{ color: COLORS.red.ink }}>{T('Wrong choices')}: {misses.length}</p>
            <ul className="mt-2 space-y-2">
                {byWord.map(([en, chosen]) => (
                    <li key={en} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#FFDFE0] pt-2 text-[15px] font-bold text-[#4b4b4b]" data-pair-miss>
                        <span className="text-[17px] font-extrabold text-[#3c3c3c]" lang={learnt} dir="auto" data-pair-word>{words[en].word}</span>
                        <span className="text-[#AFAFAF]">{T('You chose')}:</span>
                        {chosen.map((kn) => <span key={kn} className="line-through decoration-2" style={{ color: COLORS.red.ink }} lang={own} dir="auto" data-pair-chosen>{words[kn].kannada}</span>)}
                        <span className="inline-flex items-center gap-1" style={{ color: COLORS.green.ink }} data-pair-right>
                            <Check size={16} strokeWidth={3} aria-hidden="true" /> {T('Right answer')}: <span lang={own} dir="auto">{words[en].kannada}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
