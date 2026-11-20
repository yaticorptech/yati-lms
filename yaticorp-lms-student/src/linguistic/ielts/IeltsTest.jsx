/**
 * IELTS — one section of a mock test, full screen (2026-11-17): /linguistic/ielts/:attemptId/:section.
 *
 *   listening  the recordings read by the TTS voice (meta.js readAloud: a woman's and a man's voice), then the questions
 *   reading    the passage beside its questions (one above the other on a phone), against the clock
 *   writing    Task 1 (a chart to describe) and Task 2 (an essay), with word counts, against the clock
 *   speaking   each question read aloud; the answer spoken (speech-to-text, TalkRecorder) or typed
 *
 * Answers are kept in this browser as they are given (a reload or a lost connection loses nothing) until the section
 * is submitted; then the result shows here, and on the IELTS page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Clock, Play, Square, Loader2, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Volume2, AlertCircle, Timer, Download, Headphones, RotateCcw } from 'lucide-react';
import { linguisticApi } from '../api';
import { englishClip } from '../meta';
import { loadKokoro } from '../../lib/kokoro';
import { Loading, Problem } from '../ui';
import TalkRecorder from '../parts/TalkRecorder';
import { BandDial, Crit } from './shared';
import { sectionOf, fmtBand, bandWord, CRITERIA, forgetDrafts } from './sections';

const LETTERS = 'ABCDEFGH';
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
const countWords = (t) => (String(t || '').trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;
const draftKey = (id, section) => `ielts:${id}:${section}`;
const readDraft = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const writeDraft = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off: kept for this visit */ } };
const dropDraft = (k) => { try { localStorage.removeItem(k); } catch { /* storage off */ } };
const startedKey = (id, section) => `ielts:${id}:${section}:startedAt`;

/* ── The clock ────────────────────────────────────────────────────── */

/** Seconds left of `minutes`, counted from when the section was first opened on this device. */
function useCountdown(id, section, minutes, running) {
    const [left, setLeft] = useState(minutes * 60);
    useEffect(() => {
        if (!running || !minutes) return undefined;
        let at = Number(readDraft(startedKey(id, section), 0));
        if (!at) { at = Date.now(); writeDraft(startedKey(id, section), at); }
        const tick = () => setLeft(Math.max(0, Math.round(minutes * 60 - (Date.now() - at) / 1000)));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [id, section, minutes, running]);
    return left;
}
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ── Questions ────────────────────────────────────────────────────── */

function Question({ q, n, value, onChange, accent }) {
    const label = `Question ${n}`;
    return (
        <div className="rounded-2xl border-2 border-[#EEF0F3] bg-white p-4" data-ielts-q={q.id}>
            <p className="text-[15px] font-bold leading-relaxed text-[#1F2A44]"><span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-black text-white" style={{ background: accent }}>{n}</span>
                {/* Sentence / note completion: the gap is in the sentence itself. */}
                {q.kind === 'sentence' ? q.prompt.split(/_{3,}/).map((bit, i, all) => (
                    <span key={i}>{bit}{i < all.length - 1 && (
                        <input aria-label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck={false} maxLength={60}
                            className="mx-1 inline-block h-9 w-40 rounded-lg border-2 border-dashed bg-white px-2 align-middle text-[15px] font-bold text-[#1F2A44] outline-none transition-colors focus:border-solid"
                            style={{ borderColor: value ? accent : '#C9D1DD' }} />
                    )}</span>
                )) : q.prompt}
            </p>
            {q.kind === 'multi' && (() => {
                const picked = String(value || '').split(',').filter(Boolean);
                const toggle = (l) => onChange((picked.includes(l) ? picked.filter((x) => x !== l) : picked.length >= 2 ? [picked[1], l] : [...picked, l]).sort().join(','));
                return (
                    <div className="mt-3 grid gap-2" role="group" aria-label={`${label}: choose two`}>
                        <p className="text-xs font-black uppercase tracking-wider text-[#8A94A6]">Choose TWO · {picked.length}/2</p>
                        {q.options.map((o, i) => {
                            const on = picked.includes(LETTERS[i]);
                            return (
                                <button key={o} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(LETTERS[i])}
                                    className="flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-[15px] font-semibold transition-colors"
                                    style={{ borderColor: on ? accent : '#E5E5E5', background: on ? `${accent}14` : '#fff', color: '#1F2A44' }}>
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-black" style={{ borderColor: on ? accent : '#E5E5E5', background: on ? accent : '#fff', color: on ? '#fff' : '#8A94A6' }}>{on ? '✓' : LETTERS[i]}</span>{o}
                                </button>
                            );
                        })}
                    </div>
                );
            })()}
            {q.kind === 'fill' && (
                <input aria-label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck={false} maxLength={80}
                    className="mt-3 w-full rounded-xl border-2 border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-[15px] font-semibold text-[#1F2A44] outline-none transition-colors focus:border-[#1CB0F6] focus:bg-white" placeholder="Your answer" />
            )}
            {q.kind === 'mcq' && (
                <div className="mt-3 grid gap-2" role="radiogroup" aria-label={label}>
                    {q.options.map((o, i) => {
                        const on = value === LETTERS[i];
                        return (
                            <button key={o} type="button" role="radio" aria-checked={on} onClick={() => onChange(LETTERS[i])}
                                className="flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-[15px] font-semibold transition-colors"
                                style={{ borderColor: on ? accent : '#E5E5E5', background: on ? `${accent}14` : '#fff', color: '#1F2A44' }}>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-black" style={{ borderColor: on ? accent : '#E5E5E5', background: on ? accent : '#fff', color: on ? '#fff' : '#8A94A6' }}>{LETTERS[i]}</span>{o}
                            </button>
                        );
                    })}
                </div>
            )}
            {q.kind === 'match' && (
                <select aria-label={label} value={value || ''} onChange={(e) => onChange(e.target.value)}
                    className="mt-3 min-h-11 w-full rounded-xl border-2 bg-white px-3 text-[15px] font-semibold text-[#1F2A44] outline-none transition-colors"
                    style={{ borderColor: value ? accent : '#E5E5E5' }}>
                    <option value="">Choose a heading…</option>
                    {q.options.map((o, i) => <option key={o} value={LETTERS[i]}>{ROMAN[i]}. {o}</option>)}
                </select>
            )}
            {(q.kind === 'tfng' || q.kind === 'ynng') && (
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
                    {(q.kind === 'ynng' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN']).map((o) => {
                        const on = value === o;
                        return (
                            <button key={o} type="button" role="radio" aria-checked={on} onClick={() => onChange(o)}
                                className="min-h-11 rounded-xl border-2 px-2 text-xs font-black tracking-wide transition-colors sm:text-sm"
                                style={{ borderColor: on ? accent : '#E5E5E5', background: on ? accent : '#fff', color: on ? '#fff' : '#4B5563' }}>{o}</button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Listening: the recording ─────────────────────────────────────── */

/**
 * English speech for IELTS, whatever course the student is on (meta.js englishClip). English is made by Kokoro in
 * the browser: the first time, its ~80 MB model is downloaded, then each line takes a moment (2026-11-17: "why is
 * this loading"). So every line is made as soon as the part opens, with the progress shown, and Play can start as
 * soon as the first line is ready — the rest keep being made ahead of it.
 */
let current = null;
const stopSpeech = () => { if (current) { current.pause(); current = null; } };
const playUrl = (url) => new Promise((resolve) => {
    stopSpeech();
    const a = new Audio(url); current = a;
    a.onended = resolve; a.onerror = resolve;
    a.play().catch(resolve);
});
/** Say one English sentence now (a Speaking question). */
const sayEnglish = (text) => englishClip(text, 'f').then(playUrl).catch(() => {});

function Recording({ part, accent }) {
    const [made, setMade] = useState(0);       // lines ready
    const [failed, setFailed] = useState(0);
    const [model, setModel] = useState(null);  // 0..1 while the voice model downloads the first time
    const [state, setState] = useState('idle'); // idle | playing | waiting | done
    const [line, setLine] = useState(-1);
    const clips = useRef([]);
    const run = useRef(0);
    const total = part.script.length;

    // Make every line ahead, in order (one at a time: the model makes one clip at once).
    useEffect(() => {
        let gone = false;
        loadKokoro((p) => { if (!gone) setModel(p); }).then(() => { if (!gone) setModel(null); }).catch(() => { if (!gone) setModel(null); });
        clips.current = [];
        let chain = Promise.resolve();
        part.script.forEach(([voice, text], i) => {
            chain = chain.then(() => {
                const p = englishClip(text, voice);
                clips.current[i] = p;
                return p.then(() => { if (!gone) setMade((n) => n + 1); }, () => { if (!gone) setFailed((n) => n + 1); });
            });
        });
        return () => { gone = true; run.current += 1; stopSpeech(); };
    }, [part]);

    const start = async () => {
        const me = ++run.current;
        setState('playing');
        for (let i = 0; i < total; i += 1) {
            if (run.current !== me) return;
            setLine(i);
            // Not made yet: wait for it (the spinner), then play.
            while (!clips.current[i] && run.current === me) { setState('waiting'); await new Promise((r) => setTimeout(r, 200)); }
            setState('waiting');
            const url = await clips.current[i]?.catch(() => null);
            if (run.current !== me) return;
            setState('playing');
            if (url) await playUrl(url);
            if (run.current !== me) return;
            await new Promise((r) => setTimeout(r, 350)); // a breath between lines
        }
        if (run.current === me) { setState('done'); setLine(-1); }
    };
    const halt = () => { run.current += 1; stopSpeech(); setState('done'); setLine(-1); };

    const playing = state === 'playing' || state === 'waiting';
    const preparing = made + failed < total;
    const broken = failed > 0 && made === 0 && !preparing;
    const pct = playing && line >= 0 ? ((line + 1) / total) * 100 : state === 'done' ? 100 : 0;
    const status = broken ? 'The audio could not be prepared'
        : playing ? (state === 'waiting' ? 'Preparing the next line…' : 'Playing…')
            : state === 'done' ? 'Recording finished'
                : model !== null && model < 1 ? `Downloading the voice… ${Math.round(model * 100)}%`
                    : preparing ? `Preparing audio… ${made} of ${total} lines` : 'Ready — press play';
    const hint = broken ? 'Check your connection, then reload the page.'
        : state === 'done' ? 'In the real test you hear it once. Replay only to practise.'
            : model !== null && model < 1 ? 'Only the first time: the voice is then kept on this device.'
                : preparing && !playing ? 'You can press play now; the rest is prepared as it plays.' : 'Read the questions first. You can answer while you listen.';
    return (
        <div className="rounded-2xl p-4 text-white" style={{ background: '#1F2A44' }} data-ielts-audio={state}>
            <div className="flex items-center gap-3">
                <button type="button" onClick={playing ? halt : start} disabled={!playing && (made === 0 || broken)}
                    aria-label={playing ? 'Stop the recording' : state === 'done' ? 'Play the recording again' : 'Play the recording'}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50" style={{ background: accent }}>
                    {(state === 'waiting' || (!playing && made === 0 && !broken)) ? <Loader2 size={20} className="animate-spin" /> : playing ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold" aria-live="polite">{status}</p>
                    <p className="text-xs font-semibold text-white/60">{hint}</p>
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                        {/* What is prepared (faint) under what has played. */}
                        <div className="absolute inset-y-0 left-0 rounded-full bg-white/25 transition-all duration-500" style={{ width: `${((made + failed) / total) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: accent }} />
                    </div>
                </div>
                <Volume2 size={18} className="shrink-0 text-white/50" aria-hidden="true" />
            </div>
        </div>
    );
}

/* ── Writing: the Task 1 chart ────────────────────────────────────── */

/* ── Flow-chart and table completion ──────────────────────────────── */

/** A gap inside a flow-chart or a table: its question number and a small input. */
function Gap({ id, n, value, onChange, accent, choices }) {
    return (
        <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-black text-white" style={{ background: accent }}>{n}</span>
            {choices ? (
                <select aria-label={`Question ${n}`} value={value || ''} onChange={(e) => onChange(e.target.value)} data-ielts-q={id}
                    className="h-8 max-w-[10rem] rounded-lg border-2 border-dashed bg-white px-1.5 text-sm font-bold text-[#1F2A44] outline-none focus:border-solid"
                    style={{ borderColor: value ? accent : '#C9D1DD' }}>
                    <option value="">—</option>
                    {choices.map((c, i) => <option key={c} value={LETTERS[i]}>{LETTERS[i]} · {c}</option>)}
                </select>
            ) : <input aria-label={`Question ${n}`} value={value || ''} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck={false} maxLength={40} data-ielts-q={id}
                className="h-8 w-[8.5rem] rounded-lg border-2 border-dashed bg-white px-2 text-sm font-bold text-[#1F2A44] outline-none transition-colors focus:border-solid"
                style={{ borderColor: value ? accent : '#C9D1DD' }} />}
        </span>
    );
}
/** Text with {questionId} gaps, the gaps made inputs. */
function WithGaps({ text, numberOf, answers, set, accent, choices }) {
    return String(text).split(/(\{[A-Z0-9-]+\})/).map((bit, i) => {
        const m = bit.match(/^\{([A-Z0-9-]+)\}$/);
        return m ? <Gap key={i} id={m[1]} n={numberOf[m[1]]} value={answers[m[1]]} onChange={(v) => set(m[1], v)} accent={accent} choices={choices} /> : <span key={i}>{bit}</span>;
    });
}
/** The ids of the questions answered inside a diagram. */
const gapIds = (diagram) => (diagram ? (JSON.stringify(diagram).match(/\{([A-Z0-9-]+)\}/g) || []).map((x) => x.slice(1, -1)) : []);
const inDiagram = (p, q) => gapIds(p.diagram).includes(q.id) || (p.diagram?.type === 'map' && q.kind === 'label');

/** Plan / map labelling: the plan, and a grid to pick each place's letter (as on the computer-delivered test). */
function MapLabelling({ diagram, questions, numberOf, answers, set, accent }) {
    const qs = questions.filter((q) => q.kind === 'label');
    const letters = diagram.rooms.map((r) => r.letter).sort();
    return (
        <figure className="space-y-4 rounded-2xl border-2 border-[#EEF0F3] bg-white p-4" data-ielts-diagram="map">
            <figcaption className="text-sm font-black text-[#1F2A44]">{diagram.title}</figcaption>
            <svg viewBox={`0 0 ${diagram.width} ${diagram.height}`} className="mx-auto block w-full max-w-2xl" role="img" aria-label={`${diagram.title}: rooms lettered ${letters.join(', ')}`}>
                <rect x="6" y="6" width={diagram.width - 12} height={diagram.height - 40} rx="10" fill="#FAFBFD" stroke="#1F2A44" strokeWidth="3" />
                {diagram.landmarks.map((l) => (
                    <g key={l.label}>
                        <rect x={l.x} y={l.y} width={l.w} height={l.h} rx="8" fill={l.door ? '#fff' : '#EEF3FA'} stroke={l.door ? '#1F2A44' : '#B8C4D6'} strokeWidth={l.door ? 3 : 2} strokeDasharray={l.door ? '0' : '6 4'} />
                        <text x={l.x + l.w / 2} y={l.y + l.h / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#4B5563">{l.label}</text>
                    </g>
                ))}
                {diagram.rooms.map((r) => (
                    <g key={r.letter}>
                        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8" fill="#fff" stroke="#9AA8BF" strokeWidth="2" />
                        <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r="17" fill={accent} />
                        <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">{r.letter}</text>
                    </g>
                ))}
            </svg>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                    <thead><tr><th className="py-2 text-left text-[11px] font-black uppercase tracking-wider text-[#8A94A6]">Place</th>{letters.map((l) => <th key={l} className="w-10 py-2 text-center text-xs font-black text-[#4B5563]">{l}</th>)}</tr></thead>
                    <tbody>
                        {qs.map((q) => (
                            <tr key={q.id} className="border-t border-[#F0F0F0]" role="radiogroup" aria-label={`Question ${numberOf[q.id]}: ${q.prompt}`} data-ielts-q={q.id}>
                                <td className="py-2 pr-2 font-bold text-[#1F2A44]"><span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-black text-white" style={{ background: accent }}>{numberOf[q.id]}</span>{q.prompt}</td>
                                {letters.map((l) => {
                                    const on = answers[q.id] === l;
                                    return (
                                        <td key={l} className="py-1.5 text-center">
                                            <button type="button" role="radio" aria-checked={on} aria-label={`${q.prompt}: ${l}`} onClick={() => set(q.id, l)}
                                                className="h-8 w-8 rounded-full border-2 text-xs font-black transition-colors"
                                                style={{ borderColor: on ? accent : '#D6DCE5', background: on ? accent : '#fff', color: on ? '#fff' : '#AFAFAF' }}>{on ? l : ''}</button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
}

/** A fire extinguisher, its parts numbered 1–5 (diagram label completion). */
const EXTINGUISHER = (
    <svg viewBox="0 0 220 300" className="mx-auto block h-64 w-auto" role="img" aria-label="A fire extinguisher with five numbered parts">
        <rect x="70" y="95" width="80" height="185" rx="28" fill="#E5484D" stroke="#9E2A2E" strokeWidth="3" />
        <rect x="80" y="160" width="60" height="50" rx="6" fill="#fff" opacity=".85" />
        <rect x="95" y="70" width="30" height="30" rx="4" fill="#5C6B80" />
        <path d="M95 72 L60 50 L66 42 L112 66" fill="#9AA8BF" stroke="#4B5563" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M112 66 L150 48 L156 56 L125 74" fill="#C9D1DD" stroke="#4B5563" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="110" cy="40" r="16" fill="#fff" stroke="#4B5563" strokeWidth="3" /><path d="M110 40 L118 32" stroke="#58A700" strokeWidth="3" strokeLinecap="round" />
        <circle cx="132" cy="62" r="5" fill="#F7C531" stroke="#B5791A" strokeWidth="2" />
        <path d="M125 82 C170 90 180 140 172 200" fill="none" stroke="#1F2A44" strokeWidth="7" strokeLinecap="round" />
        <rect x="164" y="198" width="16" height="26" rx="3" fill="#1F2A44" />
        {[[1, 110, 12], [2, 132, 90], [3, 158, 40], [4, 192, 130], [5, 200, 228]].map(([n, x, y]) => (
            <g key={n}><circle cx={x} cy={y} r="11" fill="#58CC02" /><text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{n}</text></g>
        ))}
    </svg>
);

function Diagram({ diagram, questions = [], ...rest }) {
    if (diagram.type === 'map') return <MapLabelling diagram={diagram} questions={questions} {...rest} />;
    if (diagram.type === 'labelled') {
        return (
            <figure className="grid items-center gap-4 rounded-2xl border-2 border-[#EEF0F3] bg-white p-4 sm:grid-cols-[200px_1fr]" data-ielts-diagram="labelled">
                <div>{diagram.art === 'extinguisher' && EXTINGUISHER}</div>
                <div>
                    <figcaption className="text-sm font-black text-[#1F2A44]">{diagram.title} — label the parts (ONE OR TWO WORDS)</figcaption>
                    <ol className="mt-3 space-y-2">
                        {diagram.labels.map((l) => (
                            <li key={l.n} className="flex items-center gap-2 text-[15px] font-semibold leading-9 text-[#374151]">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#58CC02] text-xs font-black text-white">{l.n}</span>
                                <span><WithGaps text={l.text} {...rest} /></span>
                            </li>
                        ))}
                    </ol>
                </div>
            </figure>
        );
    }
    if (diagram.type === 'table') {
        return (
            <figure className="overflow-hidden rounded-2xl border-2 border-[#EEF0F3] bg-white" data-ielts-diagram="table">
                <figcaption className="border-b-2 border-[#EEF0F3] px-4 py-3 text-sm font-black text-[#1F2A44]">{diagram.title}</figcaption>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead><tr className="bg-[#F7F8FA]">{diagram.head.map((h) => <th key={h} className="px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#6B7280]">{h}</th>)}</tr></thead>
                        <tbody>{diagram.rows.map((row, r) => <tr key={r} className="border-t border-[#F0F0F0]">{row.map((cell, c) => <td key={c} className={`px-4 py-3 leading-9 ${c === 0 ? 'font-black text-[#1F2A44]' : 'font-semibold text-[#374151]'}`}><WithGaps text={cell} {...rest} /></td>)}</tr>)}</tbody>
                    </table>
                </div>
            </figure>
        );
    }
    // A flow-chart: each stage a box, an arrow down to the next.
    return (
        <figure className="rounded-2xl border-2 border-[#EEF0F3] bg-white p-4" data-ielts-diagram="flow">
            <figcaption className="text-center text-sm font-black text-[#1F2A44]">{diagram.title}</figcaption>
            {/* Flow-chart from a list: the words to choose from, lettered (more words than gaps). */}
            {diagram.choices && (
                <div className="mx-auto mt-3 max-w-lg rounded-xl border-2 border-dashed border-[#C9D1DD] p-3" aria-label="Words to choose from">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#8A94A6]">Choose from the box</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">{diagram.choices.map((c, i) => <li key={c} className="rounded-lg bg-[#F3F4F6] px-2 py-1 text-sm font-bold text-[#374151]"><b className="mr-1 text-[#8A94A6]">{LETTERS[i]}</b>{c}</li>)}</ul>
                </div>
            )}
            <ol className="mx-auto mt-3 flex max-w-lg flex-col items-stretch">
                {diagram.steps.map((step, i) => (
                    <li key={i} className="flex flex-col items-center">
                        {i > 0 && <span aria-hidden="true" className="flex h-6 flex-col items-center"><span className="h-4 w-0.5 bg-[#C9D1DD]" /><span className="-mt-1 h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#C9D1DD]" /></span>}
                        <div className="w-full rounded-xl border-2 border-[#E5E9F0] bg-[#FAFBFD] px-4 py-2.5 text-center text-[15px] font-semibold leading-9 text-[#1F2A44]"><WithGaps text={step} choices={diagram.choices} {...rest} /></div>
                    </li>
                ))}
            </ol>
        </figure>
    );
}

/** Writing Task 1 as a process diagram: numbered stages joined by arrows (across on a wide screen). */
function ProcessDiagram({ chart }) {
    return (
        <figure className="rounded-2xl border-2 border-[#EEF0F3] bg-white p-4" aria-label={chart.title}>
            <figcaption className="text-sm font-black text-[#1F2A44]">{chart.title}</figcaption>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {chart.steps.map((st, i) => (
                    <li key={st.title} className="relative flex items-start gap-3 rounded-xl border-2 border-[#F0E6FA] bg-[#FBF7FF] p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8447B3] text-xs font-black text-white">{i + 1}</span>
                        <span className="min-w-0"><span className="block text-sm font-extrabold text-[#1F2A44]">{st.title}</span>{st.text && <span className="block text-xs font-semibold text-[#6B7280]">{st.text}</span>}</span>
                        {i < chart.steps.length - 1 && <ArrowRight size={14} className="absolute -bottom-2 right-3 rotate-90 text-[#C9A7E8] sm:-right-2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rotate-0" aria-hidden="true" />}
                    </li>
                ))}
            </ol>
        </figure>
    );
}

function BarChart({ chart }) {
    const max = Math.max(...chart.rows.flatMap(([, a, b]) => [a, b]));
    const colors = ['#9AA8BF', '#8447B3'];
    return (
        <figure className="rounded-2xl border-2 border-[#EEF0F3] bg-white p-4" aria-label={chart.title}>
            <figcaption className="text-sm font-black text-[#1F2A44]">{chart.title}</figcaption>
            <div className="mt-2 flex gap-4 text-xs font-bold text-[#6B7280]">{chart.series.map((s, i) => <span key={s} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[i] }} />{s}</span>)}</div>
            <div className="mt-3 space-y-3">
                {chart.rows.map(([name, ...vals]) => (
                    <div key={name} className="grid grid-cols-[88px_1fr] items-center gap-3">
                        <span className="text-xs font-extrabold text-[#4B5563]">{name}</span>
                        <div className="space-y-1">
                            {vals.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="h-3.5 rounded-r-md" style={{ width: `${(v / max) * 100}%`, minWidth: 4, background: colors[i] }} />
                                    <span className="text-[11px] font-black tabular-nums text-[#4B5563]">{v}{chart.unit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </figure>
    );
}

/* ── Results ──────────────────────────────────────────────────────── */

/** The right answer as the student can read it: a letter with its words. */
const answerText = (q, answer) => {
    if (!q || !q.options) return answer;
    const word = (l) => q.options[LETTERS.indexOf(l)];
    if (q.kind === 'multi') return String(answer).split(/,\s*/).map((l) => `${l} (${word(l)})`).join(', ');
    if (q.kind === 'label') return answer;
    return `${q.kind === 'match' && q.options.length > 3 ? ROMAN[LETTERS.indexOf(answer)] : answer} (${word(answer)})`;
};

function ObjectiveResult({ result, questions, s }) {
    const byId = Object.fromEntries(questions.map((q, i) => [q.id, { q, n: i + 1 }]));
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 rounded-3xl border-2 border-[#E5E5E5] bg-white p-5">
                <BandDial band={result.band} size={112} color={s.face} label={`${s.label} band`} />
                <div>
                    <p className="text-2xl font-black text-[#1F2A44]">{result.raw} / {result.total} correct</p>
                    <p className="text-sm font-bold text-[#8A94A6]">{bandWord(result.band)} · band estimated from the official conversion table</p>
                </div>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2">
                {result.review.map((r) => {
                    const item = byId[r.id];
                    return (
                        <li key={r.id} className="flex items-start gap-3 rounded-2xl border-2 bg-white p-3" style={{ borderColor: r.correct ? '#D7FFB8' : '#FFDFE0' }}>
                            {r.correct ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#58A700]" aria-label="Correct" /> : <XCircle size={20} className="mt-0.5 shrink-0 text-[#EA2B2B]" aria-label="Wrong" />}
                            <div className="min-w-0 text-sm">
                                <p className="font-bold text-[#1F2A44]"><span className="text-[#8A94A6]">{item?.n}.</span> {item?.q.prompt}</p>
                                <p className="mt-1 font-semibold text-[#6B7280]">You: <b className={r.correct ? 'text-[#3F7D00]' : 'text-[#EA2B2B]'}>{r.given || '—'}</b>{!r.correct && <> · Answer: <b className="text-[#3F7D00]">{answerText(item?.q, r.answer)}</b></>}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function Feedback({ data, tint }) {
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {data.strengths?.length > 0 && <div className="rounded-2xl bg-[#F1FBEA] p-4"><p className="text-xs font-black uppercase tracking-wider text-[#3F7D00]">What worked</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-[#2F4F12]">{data.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {data.improve?.length > 0 && <div className="rounded-2xl p-4" style={{ background: tint }}><p className="text-xs font-black uppercase tracking-wider text-[#8A5A00]">To reach the next band</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-[#4B3B12]">{data.improve.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            {data.corrections?.length > 0 && (
                <div className="rounded-2xl border-2 border-[#EEF0F3] bg-white p-4 md:col-span-2">
                    <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Corrections</p>
                    <ul className="mt-2 space-y-2 text-sm">{data.corrections.map((c) => <li key={c.wrong} className="font-semibold"><s className="text-[#EA2B2B] decoration-2">{c.wrong}</s> <ArrowRight size={13} className="mx-1 inline text-[#AFAFAF]" aria-hidden="true" /> <span className="text-[#3F7D00]">{c.right}</span></li>)}</ul>
                </div>
            )}
        </div>
    );
}

function WritingResult({ result, s }) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 rounded-3xl border-2 border-[#E5E5E5] bg-white p-5">
                <BandDial band={result.band} size={112} color={s.face} label="Writing band" />
                <div><p className="text-2xl font-black text-[#1F2A44]">Writing {fmtBand(result.band)}</p><p className="text-sm font-bold text-[#8A94A6]">{bandWord(result.band)} · Task 2 counts twice as much as Task 1</p></div>
            </div>
            {[['task1', 'Task 1 · chart report', ['TA', 'CC', 'LR', 'GRA']], ['task2', 'Task 2 · essay', ['TR', 'CC', 'LR', 'GRA']]].map(([k, title, keys]) => (
                <section key={k} className="space-y-3 rounded-3xl border-2 border-[#E5E5E5] bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-black text-[#1F2A44]">{title}</h3><span className="text-sm font-black" style={{ color: s.ink }}>Band {fmtBand(result[k].band)} · {result[k].words} words</span></div>
                    <div className="flex flex-wrap gap-2">{keys.map((c) => <Crit key={c} name={c} title={CRITERIA[c]} value={result[k][c]} tint={s.light} ink={s.ink} />)}</div>
                    <Feedback data={result[k]} tint="#FFF5D3" />
                </section>
            ))}
        </div>
    );
}

function SpeakingResult({ result, s }) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 rounded-3xl border-2 border-[#E5E5E5] bg-white p-5">
                <BandDial band={result.band} size={112} color={s.face} label="Speaking band" />
                <div className="min-w-0 flex-1">
                    <p className="text-2xl font-black text-[#1F2A44]">Speaking {fmtBand(result.band)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">{['FC', 'LR', 'GRA'].map((c) => <Crit key={c} name={c} title={CRITERIA[c]} value={result[c]} tint={s.light} ink={s.ink} />)}</div>
                    <p className="mt-2 text-xs font-semibold text-[#8A94A6]">Pronunciation can't be judged from a transcript, so this band uses the other three criteria.</p>
                </div>
            </div>
            <Feedback data={result} tint="#FFF5D3" />
            {result.betterAnswer && (
                <div className="rounded-3xl p-5" style={{ background: s.light }}>
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: s.ink }}>A band-8 answer</p>
                    <p className="mt-1 text-sm font-extrabold text-[#1F2A44]">{result.betterAnswer.question}</p>
                    <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[#374151]">{result.betterAnswer.answer}</p>
                </div>
            )}
        </div>
    );
}

/* ── Before the test: download its audio ──────────────────────────── */

/** What a Speaking question says when it is read aloud. */
const questionSpeech = (q) => (q.cue ? `${q.prompt} You should say: ${q.cue.join(', ')}` : q.prompt);

/**
 * Downloading the resources (2026-11-17, the user: "before start download audio, then they can start — show
 * downloading resources"): the voice model (first time only), then every clip of the section, with progress. Start
 * opens only when all is ready — so nothing loads mid-test and the clock starts with the test, not with the download.
 */
/** Lines that must be ready before Start opens; the rest download while the test runs (2026-11-17). */
const FIRST_LINES = 3;

/**
 * The section's audio, downloaded in order — the voice model first, then each line — at the page's level, so it goes
 * on in the background after the test starts (the user, 2026-11-17: "2 are ready and they can start; the rest download
 * in the background — but show the downloading progress").
 */
function useAudioPrep(lines, active) {
    const [model, setModel] = useState(0);         // 0..1
    const [modelDone, setModelDone] = useState(false);
    const [made, setMade] = useState(0);
    const [failed, setFailed] = useState([]);       // indexes of lines that could not be made
    const [round, setRound] = useState(0);          // a retry of the failed ones
    const total = lines.length;

    useEffect(() => {
        if (!active) return undefined;
        let gone = false;
        loadKokoro((p) => { if (!gone) setModel(p); })
            .catch(() => null) // no model on this device: the server voice makes the clips instead
            .finally(() => { if (!gone) { setModel(1); setModelDone(true); } });
        return () => { gone = true; };
    }, [active]);

    useEffect(() => {
        if (!active || !total) return undefined;
        let gone = false;
        const todo = round === 0 ? lines.map((_, i) => i) : failed;
        if (round > 0) setFailed([]);
        (async () => {
            for (const i of todo) {
                if (gone) return;
                const [voice, text] = lines[i];
                try { await englishClip(text, voice); if (!gone) setMade((n) => n + 1); } catch { if (!gone) setFailed((f) => [...f, i]); }
            }
        })();
        return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round, lines, active]);

    const first = Math.min(FIRST_LINES, total);
    return {
        model, modelDone, made, failed, total,
        done: made + failed.length >= total,
        // Start opens once the voice is in and the first lines are made, none of them failed.
        canStart: modelDone && made >= first && !failed.some((i) => i < first),
        pct: Math.round(((modelDone ? 1 : model) * 0.4 + (made / Math.max(total, 1)) * 0.6) * 100),
        retry: () => setRound((r) => r + 1)
    };
}

/** The audio still downloading after Start: a small bar in the test's header. */
function AudioProgress({ prep, s }) {
    if (!prep.total || (prep.done && !prep.failed.length)) return null;
    const pct = Math.round((prep.made / prep.total) * 100);
    return (
        <span className="hidden items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-1.5 text-xs font-black text-[#4B5563] sm:inline-flex" role="status" aria-label={`Audio downloading: ${prep.made} of ${prep.total}`} data-ielts-audio-progress>
            {prep.failed.length && prep.done
                ? <button type="button" onClick={prep.retry} className="inline-flex items-center gap-1 text-[#EA2B2B]"><RotateCcw size={13} aria-hidden="true" /> {prep.failed.length} failed · retry</button>
                : <><Download size={13} aria-hidden="true" /> Audio {prep.made}/{prep.total}
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E1E5EB]"><span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: s.face }} /></span></>}
        </span>
    );
}

/** One line of the download screen: what it is, a spinner or a tick, and how far. */
const PrepRow = ({ label, state, detail }) => (
    <li className="flex items-center gap-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            {state === 'done' ? <CheckCircle2 size={22} className="text-[#58A700]" aria-label="Ready" /> : state === 'error' ? <XCircle size={22} className="text-[#EA2B2B]" aria-label="Failed" /> : <Loader2 size={20} className="animate-spin text-[#8A94A6]" aria-label="Downloading" />}
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-extrabold text-[#1F2A44]">{label}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-[#8A94A6]">{detail}</span>
    </li>
);

function Prepare({ prep, s, resumed, onStart }) {
    const { model, modelDone, made, failed, total, done, canStart } = prep;
    const ready = canStart;
    // The model weighs more than the clips the first time (80 MB); cached, it is done at once.
    const pct = Math.round(((modelDone ? 1 : model) * 0.4 + (made / Math.max(total, 1)) * 0.6) * 100);
    const Icon = s.icon;

    return (
        <section className="mx-auto max-w-xl pt-4" aria-labelledby="prep-title" data-ielts-prepare={ready ? 'ready' : 'loading'}>
            <div className="overflow-hidden rounded-[28px] border-2 border-[#E5E5E5] bg-white">
                <div className="flex items-center gap-4 p-6 pb-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: s.light, color: s.ink }}>{ready ? <Icon size={26} aria-hidden="true" /> : <Download size={26} aria-hidden="true" />}</span>
                    <div className="min-w-0">
                        <h1 id="prep-title" className="text-xl font-black text-[#1F2A44]">{done && ready ? `${s.label} is ready` : ready ? 'Ready to start' : 'Downloading resources…'}</h1>
                        <p className="text-sm font-semibold text-[#8A94A6]">{done && ready ? 'Everything is on your device. Nothing will load during the test.' : ready ? 'The first part is ready. The rest keeps downloading in the background while you work.' : 'Getting the first part of the audio ready…'}</p>
                    </div>
                </div>

                <div className="px-6">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#8A94A6]"><span>{done ? 'Done' : 'Downloading'}</span><span className="tabular-nums" aria-live="polite">{pct}%</span></div>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#EEF1F5]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Downloading the test's audio">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: s.face }} />
                    </div>
                    <ul className="mt-3 divide-y divide-[#F0F0F0]">
                        <PrepRow label="Voice" state={modelDone ? 'done' : 'loading'} detail={modelDone ? 'Ready' : model > 0 ? `${Math.round(model * 100)}%` : 'Checking…'} />
                        <PrepRow label={s.id === 'speaking' ? 'Examiner questions' : 'Recordings'} state={failed.length && done ? 'error' : done ? 'done' : 'loading'} detail={`${made} of ${total}`} />
                    </ul>
                    {!modelDone && model > 0 && model < 1 && <p className="mt-1 text-xs font-semibold text-[#8A94A6]">The voice downloads only once (about 80 MB), then stays on this device.</p>}
                </div>

                <div className="mt-4 space-y-2 bg-[#F7F8FA] px-6 py-4 text-sm font-semibold text-[#4B5563]">
                    <p className="flex items-center gap-2"><Headphones size={16} className="shrink-0" aria-hidden="true" /> Use headphones in a quiet place.</p>
                    <p className="flex items-center gap-2"><Clock size={16} className="shrink-0" aria-hidden="true" /> {s.id === 'listening' ? `The ${s.minutes}-minute timer starts when you press Start.` : 'You can answer the questions in any order.'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 p-6 pt-4">
                    {done && failed.length > 0 && (
                        <>
                            <p className="w-full text-sm font-bold text-[#EA2B2B]" role="alert">{failed.length} audio clip{failed.length === 1 ? '' : 's'} could not be downloaded. Check your connection and try again.</p>
                            <button type="button" onClick={prep.retry} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-5 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: s.ink }}><RotateCcw size={16} aria-hidden="true" /> Try again</button>
                        </>
                    )}
                    <button type="button" onClick={onStart} disabled={!ready} data-ielts-begin
                        className="lingo-btn ml-auto inline-flex min-h-12 items-center gap-2 px-6 text-[15px] text-white disabled:cursor-not-allowed"
                        style={ready ? { background: s.face, borderColor: s.edge } : { background: '#E5E5E5', borderColor: '#E5E5E5', color: '#AFAFAF' }}>
                        {!ready && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}{resumed ? 'Continue test' : `Start ${s.label}`} {ready && <ArrowRight size={18} aria-hidden="true" />}
                    </button>
                </div>
            </div>
        </section>
    );
}

/* ── The page ─────────────────────────────────────────────────────── */

export default function IeltsTest() {
    const { attemptId, section } = useParams();
    const navigate = useNavigate();
    const s = sectionOf(section);
    const key = draftKey(attemptId, section);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [answers, setAnswers] = useState(() => readDraft(key, {}));
    const [busy, setBusy] = useState(false);
    const [sendError, setSendError] = useState('');
    const [tab, setTab] = useState(0); // listening part · reading passage · writing task · speaking part
    const [listening, setListening] = useState(false);
    const [prepLeft, setPrepLeft] = useState(null);
    const sent = useRef(false);
    // Listening and Speaking open on the download screen (Prepare); the test, and its clock, start from there.
    const [ready, setReady] = useState(false);

    const load = useCallback(() => linguisticApi.ieltsAttempt(attemptId).then((d) => { setData(d); setError(null); }).catch(setError), [attemptId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { writeDraft(key, answers); }, [key, answers]);

    const result = data?.attempt.results[section] || null;
    const test = data?.test;
    const minutes = section === 'listening' ? test?.listening.minutes : section === 'reading' ? test?.reading.minutes : section === 'writing' ? test?.writing.minutes : 0;
    const needsAudio = section === 'listening' || section === 'speaking';
    const gate = needsAudio && !!test && !result && !ready;
    const left = useCountdown(attemptId, section, minutes || 0, !!test && !result && !gate);
    const audioLines = useMemo(() => (!test ? [] : section === 'listening' ? test.listening.parts.flatMap((p) => p.script)
        : section === 'speaking' ? test.speaking.parts.flatMap((p) => p.questions.map((q) => ['f', questionSpeech(q)])) : []), [test, section]);
    // Downloading goes on after Start, until every line is on the device.
    const prep = useAudioPrep(audioLines, needsAudio && !!test && !result);

    const questions = useMemo(() => (!test ? [] : (section === 'listening' ? test.listening.parts : section === 'reading' ? test.reading.passages : [])
        .flatMap((p) => p.questions.map((q) => (q.kind === 'choose' && p.diagram?.choices ? { ...q, options: p.diagram.choices } : q)))), [test, section]);
    const numberOf = useMemo(() => Object.fromEntries(questions.map((q, i) => [q.id, i + 1])), [questions]);
    const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
    const answered = section === 'writing' ? countWords(answers.task1) + countWords(answers.task2) > 0
        : section === 'speaking' ? Object.values(answers).some((v) => String(v || '').trim())
            : questions.filter((q) => String(answers[q.id] || '').trim()).length;

    const submit = useCallback(async () => {
        if (sent.current) return;
        sent.current = true; setBusy(true); setSendError('');
        try {
            const body = section === 'writing' ? { task1: answers.task1 || '', task2: answers.task2 || '' } : { answers };
            const r = await linguisticApi.ieltsSubmit(attemptId, section, body);
            setData((d) => ({ ...d, attempt: { ...d.attempt, ...r.attempt, results: { ...d.attempt.results, [section]: r.result } } }));
            dropDraft(key); dropDraft(startedKey(attemptId, section));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            sent.current = false;
            setSendError(e.message || 'Could not submit. Try again.');
        } finally { setBusy(false); }
    }, [answers, attemptId, key, section]);

    // Time up: Reading and Writing are handed in, as in the exam room.
    useEffect(() => { if (test && !result && minutes && left === 0 && (section === 'reading' || section === 'writing')) submit(); }, [left, test, result, minutes, section, submit]);

    // Part 2 of Speaking: a minute to prepare.
    useEffect(() => {
        if (prepLeft === null || prepLeft <= 0) return undefined;
        const t = setTimeout(() => setPrepLeft((p) => p - 1), 1000);
        return () => clearTimeout(t);
    }, [prepLeft]);

    // Redo this section (2026-11-17): its result cleared, a fresh start with a new clock.
    const [redoing, setRedoing] = useState(false);
    const redo = async () => {
        if (!window.confirm(`Take ${s.label} again? This result will be deleted.`)) return;
        setRedoing(true);
        try {
            const r = await linguisticApi.ieltsRedo(attemptId, section);
            forgetDrafts(attemptId, section);
            setAnswers({}); setTab(0); setReady(false); sent.current = false;
            setData((d) => ({ ...d, attempt: { ...d.attempt, ...r.attempt, results: { ...d.attempt.results, [section]: null } } }));
            window.scrollTo({ top: 0 });
        } catch (e) { setSendError(e.message); }
        finally { setRedoing(false); }
    };
    const leave = () => {
        if (!result && answered && !window.confirm('Leave this section? Your answers stay saved on this device, and the timer keeps running.')) return;
        navigate('/linguistic/ielts');
    };

    if (error && !data) return <div className="p-6"><Problem error={error} onRetry={load} /></div>;
    if (!data) return <Loading label="Opening the test…" />;

    const Icon = s.icon;
    const low = minutes && left <= 300;

    return (
        <div className="lingo min-h-screen bg-[#F7F8FA]" data-ielts-test={section}>
            {/* Header: leave, the section, the clock. */}
            <header className="sticky top-0 z-20 border-b border-[#ECEEF2] bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                    <button type="button" onClick={leave} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] hover:bg-[#F3F4F6]" aria-label="Back to IELTS"><X size={22} /></button>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: s.light, color: s.ink }}><Icon size={18} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-black text-[#1F2A44]">{s.label}</p>
                        <p className="truncate text-xs font-bold text-[#8A94A6]">{test.title}{!result && questions.length ? ` · ${answered} of ${questions.length} answered` : ''}</p>
                    </div>
                    {needsAudio && !result && !gate && <AudioProgress prep={prep} s={s} />}
                    {!result && !gate && minutes > 0 && (
                        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-black tabular-nums ${low ? 'bg-[#FFDFE0] text-[#EA2B2B]' : 'bg-[#F3F4F6] text-[#1F2A44]'}`} role="timer" aria-live={low ? 'polite' : 'off'}>
                            <Clock size={15} aria-hidden="true" /> {clock(left)}
                        </span>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 pb-32">
                {gate ? (
                    <Prepare prep={prep} s={s} resumed={!!readDraft(startedKey(attemptId, section), 0)} onStart={() => { setReady(true); window.scrollTo({ top: 0 }); }} />
                ) : result ? (
                    <>
                        {section === 'writing' ? <WritingResult result={result} s={s} /> : section === 'speaking' ? <SpeakingResult result={result} s={s} /> : <ObjectiveResult result={result} questions={questions} s={s} />}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={() => navigate('/linguistic/ielts')} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-6 text-white" style={{ background: s.face, borderColor: s.edge }}><ArrowLeft size={18} aria-hidden="true" /> Back to IELTS</button>
                            <button type="button" onClick={redo} disabled={redoing} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-5 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: s.ink }} data-ielts-redo>
                                {redoing ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} aria-hidden="true" />} Redo {s.label}
                            </button>
                            {data.attempt.overall != null && <p className="self-center text-sm font-extrabold text-[#1F2A44]">All four done — overall band {fmtBand(data.attempt.overall)}</p>}
                        </div>
                    </>
                ) : (
                    <>
                        {section === 'listening' && (
                            <>
                                <Tabs items={test.listening.parts.map((p) => p.title.split(' — ')[0])} value={tab} onChange={setTab} accent={s.face} />
                                {test.listening.parts.map((p, i) => (
                                    <section key={p.id} hidden={i !== tab} className="mt-4 space-y-4">
                                        <h2 className="text-lg font-black text-[#1F2A44]">{p.title}</h2>
                                        <p className="text-sm font-semibold text-[#6B7280]">{p.intro}</p>
                                        <Recording part={p} accent={s.face} />
                                        {p.diagram && <Diagram diagram={p.diagram} questions={p.questions} numberOf={numberOf} answers={answers} set={set} accent={s.face} />}
                                        <div className="grid gap-3 md:grid-cols-2">{p.questions.filter((q) => !inDiagram(p, q)).map((q) => <Question key={q.id} q={q} n={numberOf[q.id]} value={answers[q.id]} onChange={(v) => set(q.id, v)} accent={s.face} />)}</div>
                                    </section>
                                ))}
                            </>
                        )}

                        {section === 'reading' && (
                            <>
                                <Tabs items={test.reading.passages.map((p, i) => `Passage ${i + 1}`)} value={tab} onChange={setTab} accent={s.face} />
                                {test.reading.passages.map((p, i) => (
                                    <section key={p.id} hidden={i !== tab} className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                                        <article className="rounded-3xl border-2 border-[#E5E5E5] bg-white p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                                            <h2 className="text-xl font-black text-[#1F2A44]">{p.title}</h2>
                                            {p.text.map((para, k) => <p key={k} className="mt-3 text-[15.5px] leading-[1.75] text-[#374151]"><span className="mr-1.5 text-xs font-black text-[#AFAFAF]">{LETTERS[k]}</span>{para}</p>)}
                                        </article>
                                        <div className="space-y-3">
                                            {p.diagram && <Diagram diagram={p.diagram} questions={p.questions} numberOf={numberOf} answers={answers} set={set} accent={s.face} />}
                                            {p.questions.some((q) => q.kind === 'match') && <p className="rounded-xl bg-[#E6F8D5] px-3 py-2 text-xs font-bold text-[#3F7D00]">Choose the correct heading for each paragraph. There are more headings than paragraphs.</p>}
                                            {p.questions.filter((q) => !inDiagram(p, q)).map((q) => <Question key={q.id} q={q} n={numberOf[q.id]} value={answers[q.id]} onChange={(v) => set(q.id, v)} accent={s.face} />)}
                                        </div>
                                    </section>
                                ))}
                            </>
                        )}

                        {section === 'writing' && (
                            <>
                                <Tabs items={[`Task 1 · ${countWords(answers.task1)} words`, `Task 2 · ${countWords(answers.task2)} words`]} value={tab} onChange={setTab} accent={s.face} />
                                {[test.writing.task1, test.writing.task2].map((t, i) => {
                                    const k = i ? 'task2' : 'task1';
                                    const n = countWords(answers[k]);
                                    return (
                                        <section key={k} hidden={i !== tab} className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                                            <div className="space-y-4">
                                                <p className="rounded-2xl border-2 border-[#E5E5E5] bg-white p-4 text-[15px] font-semibold leading-relaxed text-[#1F2A44]">{t.prompt}</p>
                                                {t.chart && (t.chart.type === 'process' ? <ProcessDiagram chart={t.chart} /> : <BarChart chart={t.chart} />)}
                                                {t.bullets && (
                                                    <div className="rounded-2xl border-2 border-[#F0E6FA] bg-[#FBF7FF] p-4">
                                                        <ul className="list-disc space-y-1 pl-5 text-[15px] font-semibold text-[#374151]">{t.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                                                        {t.opening && <p className="mt-3 text-sm font-bold text-[#8447B3]">Begin your letter: <span className="italic">{t.opening}</span></p>}
                                                        <p className="mt-1 text-xs font-semibold text-[#8A94A6]">You do NOT need to write any addresses.</p>
                                                    </div>
                                                )}
                                                <p className="text-xs font-bold text-[#8A94A6]">Suggested time: {i ? '40' : '20'} minutes. Task 2 counts twice as much as Task 1.</p>
                                            </div>
                                            <div>
                                                <label htmlFor={`ielts-${k}`} className="sr-only">{i ? 'Task 2 essay' : 'Task 1 report'}</label>
                                                <textarea id={`ielts-${k}`} value={answers[k] || ''} onChange={(e) => set(k, e.target.value)} spellCheck={false}
                                                    className="min-h-[420px] w-full resize-y rounded-3xl border-2 border-[#E5E5E5] bg-white p-5 text-[16px] leading-[1.75] text-[#1F2A44] outline-none transition-colors focus:border-[#CE82FF]"
                                                    placeholder={i ? 'Write your essay here…' : 'Write your report here…'} />
                                                <p className={`mt-2 text-sm font-extrabold ${n >= t.minWords ? 'text-[#3F7D00]' : 'text-[#8A94A6]'}`}>{n} / {t.minWords} words {n >= t.minWords ? '✓' : `· ${t.minWords - n} more to reach the minimum`}</p>
                                            </div>
                                        </section>
                                    );
                                })}
                            </>
                        )}

                        {section === 'speaking' && (
                            <>
                                <Tabs items={test.speaking.parts.map((p) => p.title.split(' — ')[0])} value={tab} onChange={setTab} accent={s.face} />
                                <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-[#8A94A6]"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Tap the microphone and speak; your words are written down as you talk. You can fix them, or type if your browser has no speech-to-text.</p>
                                {test.speaking.parts.map((p, i) => (
                                    <section key={p.id} hidden={i !== tab} className="mt-4 space-y-4">
                                        <h2 className="text-lg font-black text-[#1F2A44]">{p.title}</h2>
                                        <p className="text-sm font-semibold text-[#6B7280]">{p.intro}</p>
                                        {p.questions.map((q) => (
                                            <div key={q.id} className="rounded-3xl border-2 border-[#E5E5E5] bg-white p-5" data-ielts-q={q.id}>
                                                <div className="flex items-start gap-3">
                                                    <button type="button" onClick={() => sayEnglish(questionSpeech(q))} aria-label="Hear the question"
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: s.light, color: s.ink }}><Volume2 size={18} /></button>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[16px] font-extrabold text-[#1F2A44]">{q.prompt}</p>
                                                        {q.cue && (
                                                            <>
                                                                <p className="mt-2 text-sm font-bold text-[#6B7280]">You should say:</p>
                                                                <ul className="mt-1 list-disc pl-5 text-sm font-semibold text-[#374151]">{q.cue.map((c) => <li key={c}>{c}</li>)}</ul>
                                                                <button type="button" onClick={() => setPrepLeft(p.prepSeconds || 60)} disabled={prepLeft > 0}
                                                                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 text-sm font-extrabold disabled:opacity-80" style={{ borderColor: s.face, color: s.ink }}>
                                                                    <Timer size={16} aria-hidden="true" /> {prepLeft > 0 ? `Preparing… ${prepLeft}s` : prepLeft === 0 ? 'Time to speak — start recording' : 'Start 1-minute preparation'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-4"><TalkRecorder value={answers[q.id] || ''} onChange={(v) => set(q.id, v)} onListening={setListening} /></div>
                                            </div>
                                        ))}
                                    </section>
                                ))}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* The bar at the bottom: where you are, and the hand-in. */}
            {!result && !gate && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ECEEF2] bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
                        {sendError && <p role="alert" className="w-full text-sm font-bold text-[#EA2B2B]">{sendError}</p>}
                        <p className="min-w-0 flex-1 text-sm font-bold text-[#6B7280]">
                            {busy ? (section === 'writing' || section === 'speaking' ? 'The examiner is marking your answers… this can take up to a minute.' : 'Marking…')
                                : section === 'writing' ? `Task 1: ${countWords(answers.task1)} words · Task 2: ${countWords(answers.task2)} words`
                                    : section === 'speaking' ? 'Answer as many questions as you can, then submit.'
                                        : `${answered} of ${questions.length} answered`}
                        </p>
                        {tab > 0 && <button type="button" onClick={() => setTab(tab - 1)} className="lingo-btn min-h-12 px-4 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#4B5563' }}>Previous</button>}
                        {section !== 'writing' && tab < (section === 'listening' ? test.listening.parts : section === 'reading' ? test.reading.passages : test.speaking.parts).length - 1
                            ? <button type="button" onClick={() => { setTab(tab + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-5 text-sm text-white" style={{ background: s.face, borderColor: s.edge }}>Next part <ArrowRight size={16} /></button>
                            : <button type="button" onClick={() => { if (window.confirm(`Submit ${s.label}? You can't change your answers after this.`)) submit(); }} disabled={busy || !answered || listening}
                                className="lingo-btn inline-flex min-h-12 items-center gap-2 px-6 text-sm text-white disabled:opacity-50" style={{ background: s.face, borderColor: s.edge }} data-ielts-submit>
                                {busy && <Loader2 size={16} className="animate-spin" />} Submit {s.label}
                            </button>}
                    </div>
                </div>
            )}
        </div>
    );
}

function Tabs({ items, value, onChange, accent }) {
    return (
        <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-[0_0_0_2px_#EEF0F3]">
            {items.map((t, i) => (
                <button key={t} type="button" role="tab" aria-selected={value === i} onClick={() => onChange(i)}
                    className="min-h-10 rounded-xl px-4 text-sm font-extrabold transition-colors"
                    style={{ background: value === i ? accent : 'transparent', color: value === i ? '#fff' : '#6B7280' }}>{t}</button>
            ))}
        </div>
    );
}
