/**
 * Linguistic Ability (admin) — the editors for a lesson's parts: lists of
 * lines, questions with their answers and explanations, words, writing tasks,
 * a conversation with its recordings, and translation items with their
 * accepted alternatives. Each takes a value and an onChange; nothing is saved
 * until the lesson is.
 */
import { useRef, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Loader2 } from 'lucide-react';
import { INPUT, LABEL } from '../../components/orgUi';
// A select as wide as its choices, not the whole row.
const SELECT = INPUT.replace('w-full', 'w-auto');
import { uploadAudio, mediaUrl, errorOf, rowKey } from './shared';

const SMALL_BTN = 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40';
const ADD_BTN = 'inline-flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50';

/** Lines of text as a list: one per line. Keeps what is typed, blank lines and all, while typing. */
export function ListArea({ value = [], onChange, rows = 3, placeholder, label, hint }) {
    const [text, setText] = useState(() => (value || []).join('\n'));
    return (
        <label className="block">
            {label && <span className={LABEL}>{label}</span>}
            <textarea value={text} rows={rows} placeholder={placeholder}
                onChange={(e) => { setText(e.target.value); onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)); }}
                className={`${INPUT} resize-y`} />
            {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
        </label>
    );
}

export const Field = ({ label, children, className = '' }) => <label className={`block ${className}`}><span className={LABEL}>{label}</span>{children}</label>;

/** A list editor's row frame: its number, move up and down, remove. */
function Row({ index, count, onMove, onRemove, title, children }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-600">{title || `#${index + 1}`}</span>
                <span className="flex items-center">
                    <button type="button" className={SMALL_BTN} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={13} /></button>
                    <button type="button" className={SMALL_BTN} onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"><ArrowDown size={13} /></button>
                    <button type="button" className={`${SMALL_BTN} hover:!text-rose-600`} onClick={onRemove} aria-label="Remove"><Trash2 size={13} /></button>
                </span>
            </div>
            {children}
        </div>
    );
}
const listOps = (value, onChange) => ({
    set: (i, patch) => onChange(value.map((x, k) => (k === i ? { ...x, ...patch } : x))),
    move: (i, d) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); },
    remove: (i) => onChange(value.filter((_, k) => k !== i)),
    add: (item) => onChange([...value, { ...item, _k: rowKey() }])
});

/* ── Audio ────────────────────────────────────────────────────────────── */

export function AudioField({ value = '', onChange, label = 'Audio' }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const file = useRef(null);
    const pick = (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setBusy(true); setError('');
        uploadAudio(f).then(onChange).catch((err) => setError(errorOf(err, 'The upload failed.'))).finally(() => setBusy(false));
    };
    return (
        <div>
            <span className={LABEL}>{label}</span>
            <div className="flex flex-wrap items-center gap-2">
                <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Upload a file, or paste its web address" className={`${INPUT} min-w-0 flex-1 basis-48`} />
                <button type="button" onClick={() => file.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
                </button>
                <input ref={file} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac" className="hidden" onChange={pick} />
            </div>
            {value && <audio controls preload="none" src={mediaUrl(value)} className="mt-2 h-9 w-full max-w-sm" />}
            {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
        </div>
    );
}

/* ── Questions ────────────────────────────────────────────────────────── */

const QTYPES = { mcq: 'Multiple choice', fill: 'Fill in the blank', correction: 'Sentence correction', rearrange: 'Rearrange the words' };
const blankQuestion = (type) => ({ type, prompt: '', answer: '', accepted: [], explanation: '', ...(type === 'mcq' ? { options: ['', ''] } : {}), ...(type === 'rearrange' ? { words: [] } : {}) });

export function QuestionsEditor({ value = [], onChange, types = Object.keys(QTYPES), title }) {
    const ops = listOps(value, onChange);
    return (
        <div className="space-y-2.5">
            {title && <p className="text-sm font-bold text-slate-700">{title} <span className="font-normal text-slate-400">({value.length})</span></p>}
            {value.map((q, i) => (
                <Row key={q._k || q.id || i} index={i} count={value.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)} title={`Question ${i + 1}`}>
                    <div className="grid gap-2.5 sm:grid-cols-[12rem_minmax(0,1fr)]">
                        <Field label="Type">
                            <select value={q.type} onChange={(e) => ops.set(i, { ...blankQuestion(e.target.value), prompt: q.prompt, explanation: q.explanation, id: q.id })} className={INPUT}>
                                {types.map((t) => <option key={t} value={t}>{QTYPES[t]}</option>)}
                            </select>
                        </Field>
                        {q.type !== 'rearrange' && (
                            <Field label={q.type === 'correction' ? 'Sentence with the mistake' : q.type === 'fill' ? 'Sentence with ___ for the blank' : 'Question'}>
                                <input value={q.prompt || ''} onChange={(e) => ops.set(i, { prompt: e.target.value })} className={INPUT} />
                            </Field>
                        )}
                    </div>
                    {q.type === 'mcq' && (
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            <ListArea key={`${q._k}-opts`} label="Options (one per line)" value={q.options} onChange={(options) => ops.set(i, { options })} rows={4} />
                            <Field label="Correct option">
                                <select value={q.answer || ''} onChange={(e) => ops.set(i, { answer: e.target.value })} className={INPUT}>
                                    <option value="">Choose…</option>
                                    {(q.options || []).filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                        </div>
                    )}
                    {q.type === 'rearrange' && (
                        <div className="mt-2.5">
                            <ListArea key={`${q._k}-words`} label="Words or groups of words, in any order (one per line)" value={q.words} onChange={(words) => ops.set(i, { words })} rows={3} />
                        </div>
                    )}
                    {q.type !== 'mcq' && (
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            <Field label={q.type === 'correction' ? 'The corrected sentence' : q.type === 'rearrange' ? 'The correct sentence' : 'Correct answer'}>
                                <input value={q.answer || ''} onChange={(e) => ops.set(i, { answer: e.target.value })} className={INPUT} />
                            </Field>
                            <ListArea key={`${q._k}-acc`} label="Other accepted answers (one per line)" value={q.accepted} onChange={(accepted) => ops.set(i, { accepted })} rows={2} />
                        </div>
                    )}
                    <Field label="Explanation (shown after answering)" className="mt-2.5">
                        <input value={q.explanation || ''} onChange={(e) => ops.set(i, { explanation: e.target.value })} className={INPUT} />
                    </Field>
                </Row>
            ))}
            <div className="flex flex-wrap gap-2">
                {types.map((t) => <button key={t} type="button" className={ADD_BTN} onClick={() => ops.add(blankQuestion(t))}><Plus size={13} /> {QTYPES[t]}</button>)}
            </div>
        </div>
    );
}

/* ── Vocabulary words ─────────────────────────────────────────────────── */

const csv = (a) => (a || []).join(', ');
const fromCsv = (t) => String(t).split(',').map((s) => s.trim()).filter(Boolean);

export function WordsEditor({ value = [], onChange }) {
    const ops = listOps(value, onChange);
    return (
        <div className="space-y-2.5">
            {value.map((w, i) => (
                <Row key={w._k || i} index={i} count={value.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)} title={w.word || `Word ${i + 1}`}>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                        <Field label="English word"><input value={w.word || ''} onChange={(e) => ops.set(i, { word: e.target.value })} className={INPUT} /></Field>
                        <Field label="Kannada meaning"><input value={w.kannada || ''} onChange={(e) => ops.set(i, { kannada: e.target.value })} lang="kn" className={INPUT} /></Field>
                        <Field label="Part of speech"><input value={w.pos || ''} onChange={(e) => ops.set(i, { pos: e.target.value })} placeholder="noun, verb…" className={INPUT} /></Field>
                    </div>
                    <Field label="Example sentence (use the word as written, for the fill-in question)" className="mt-2.5"><input value={w.example || ''} onChange={(e) => ops.set(i, { example: e.target.value })} className={INPUT} /></Field>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        <Field label="Synonyms (comma-separated)"><input defaultValue={csv(w.synonyms)} onChange={(e) => ops.set(i, { synonyms: fromCsv(e.target.value) })} className={INPUT} /></Field>
                        <Field label="Antonyms (comma-separated)"><input defaultValue={csv(w.antonyms)} onChange={(e) => ops.set(i, { antonyms: fromCsv(e.target.value) })} className={INPUT} /></Field>
                    </div>
                    <div className="mt-2.5"><AudioField label="Pronunciation recording (optional)" value={w.audio} onChange={(audio) => ops.set(i, { audio })} /></div>
                </Row>
            ))}
            <button type="button" className={ADD_BTN} onClick={() => ops.add({ word: '', kannada: '', pos: '', example: '', synonyms: [], antonyms: [] })}><Plus size={13} /> Add a word</button>
        </div>
    );
}

/* ── Writing tasks ────────────────────────────────────────────────────── */

const WTYPES = { jumbled: 'Jumbled words', sentence: 'Make a sentence', paragraph: 'Paragraph', email: 'Email', letter: 'Letter' };

export function WritingEditor({ value = [], onChange }) {
    const ops = listOps(value, onChange);
    return (
        <div className="space-y-2.5">
            {value.map((t, i) => (
                <Row key={t._k || t.id || i} index={i} count={value.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)} title={`Task ${i + 1}: ${WTYPES[t.type] || ''}`}>
                    <div className="grid gap-2.5 sm:grid-cols-[12rem_minmax(0,1fr)]">
                        <Field label="Type"><select value={t.type} onChange={(e) => ops.set(i, { type: e.target.value })} className={INPUT}>{Object.entries(WTYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                        <Field label="Instructions"><input value={t.prompt || ''} onChange={(e) => ops.set(i, { prompt: e.target.value })} className={INPUT} /></Field>
                    </div>
                    {t.type === 'jumbled' && (
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            <ListArea key={`${t._k}-w`} label="Words or groups (one per line)" value={t.words} onChange={(words) => ops.set(i, { words })} rows={3} />
                            <div className="space-y-2.5">
                                <Field label="The correct sentence"><input value={t.answer || ''} onChange={(e) => ops.set(i, { answer: e.target.value })} className={INPUT} /></Field>
                                <ListArea key={`${t._k}-a`} label="Other accepted orders (one per line)" value={t.accepted} onChange={(accepted) => ops.set(i, { accepted })} rows={2} />
                            </div>
                        </div>
                    )}
                    {t.type === 'sentence' && <Field label="Words the sentence must use (comma-separated)" className="mt-2.5"><input defaultValue={csv(t.mustInclude)} onChange={(e) => ops.set(i, { mustInclude: fromCsv(e.target.value) })} className={INPUT} /></Field>}
                    {t.type !== 'jumbled' && (
                        <>
                            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                                <Field label="Minimum words"><input type="number" min={0} max={1000} value={t.minWords || 0} onChange={(e) => ops.set(i, { minWords: Number(e.target.value) })} className={INPUT} /></Field>
                                <ListArea key={`${t._k}-c`} label="Checklist for the student (one per line)" value={t.checklist} onChange={(checklist) => ops.set(i, { checklist })} rows={2} />
                            </div>
                            <Field label="Model answer (shown after they write theirs)" className="mt-2.5"><textarea value={t.model || ''} onChange={(e) => ops.set(i, { model: e.target.value })} rows={4} className={`${INPUT} resize-y`} /></Field>
                        </>
                    )}
                </Row>
            ))}
            <div className="flex flex-wrap gap-2">
                {Object.entries(WTYPES).map(([k, l]) => <button key={k} type="button" className={ADD_BTN} onClick={() => ops.add({ type: k, prompt: '', model: '', minWords: k === 'sentence' ? 4 : k === 'jumbled' ? 0 : 40, checklist: [], ...(k === 'jumbled' ? { words: [], answer: '', accepted: [] } : {}), ...(k === 'sentence' ? { mustInclude: [] } : {}) })}><Plus size={13} /> {l}</button>)}
            </div>
        </div>
    );
}

/* ── A conversation ───────────────────────────────────────────────────── */

export function DialogueEditor({ value = {}, onChange }) {
    const speakers = value.speakers || [];
    const lines = value.lines || [];
    const sOps = listOps(speakers, (s) => onChange({ ...value, speakers: s }));
    const lOps = listOps(lines, (l) => onChange({ ...value, lines: l }));
    return (
        <div className="space-y-3">
            <Field label="Scene (one line)"><input value={value.scenario || ''} onChange={(e) => onChange({ ...value, scenario: e.target.value })} placeholder="Shopping: Lakshmi buys vegetables from Ramesh." className={INPUT} /></Field>
            <div>
                <span className={LABEL}>Speakers</span>
                <div className="space-y-2">
                    {speakers.map((s, i) => (
                        <div key={s._k || i} className="flex flex-wrap items-center gap-2">
                            <input value={s.name} onChange={(e) => sOps.set(i, { name: e.target.value })} placeholder="Name" className={`${INPUT} max-w-xs`} />
                            <select value={s.voice} onChange={(e) => sOps.set(i, { voice: e.target.value })} className={SELECT}><option value="m">Male voice</option><option value="f">Female voice</option></select>
                            <button type="button" className={`${SMALL_BTN} hover:!text-rose-600`} onClick={() => sOps.remove(i)} aria-label="Remove speaker"><Trash2 size={13} /></button>
                        </div>
                    ))}
                    <button type="button" className={ADD_BTN} onClick={() => sOps.add({ name: '', voice: 'm' })}><Plus size={13} /> Add a speaker</button>
                </div>
            </div>
            <div>
                <span className={LABEL}>Lines, in order ({lines.length})</span>
                <div className="space-y-2">
                    {lines.map((l, i) => (
                        <Row key={l._k || i} index={i} count={lines.length} onMove={(d) => lOps.move(i, d)} onRemove={() => lOps.remove(i)} title={`Line ${i + 1}`}>
                            <div className="grid gap-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                                <select value={l.speaker} onChange={(e) => lOps.set(i, { speaker: e.target.value })} className={INPUT} aria-label="Speaker">
                                    <option value="">Speaker…</option>{speakers.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                                <input value={l.text} onChange={(e) => lOps.set(i, { text: e.target.value })} placeholder="What they say" className={INPUT} aria-label="Line" />
                            </div>
                            <div className="mt-2"><AudioField label="This line's recording (optional)" value={l.audio} onChange={(audio) => lOps.set(i, { audio })} /></div>
                        </Row>
                    ))}
                    <button type="button" className={ADD_BTN} onClick={() => lOps.add({ speaker: speakers[lines.length % Math.max(1, speakers.length)]?.name || '', text: '' })}><Plus size={13} /> Add a line</button>
                </div>
            </div>
        </div>
    );
}

/* ── Translation items ────────────────────────────────────────────────── */

const TOPICS = ['daily conversation', 'vocabulary', 'grammar', 'passage', 'professional'];

export function ItemsEditor({ value = [], onChange, direction, quiz = false }) {
    const ops = listOps(value, onChange);
    const kn = direction === 'kn-en' ? 'source' : 'model';
    return (
        <div className="space-y-2.5">
            {value.map((it, i) => (
                <Row key={it._k || it.id || i} index={i} count={value.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)} title={`${quiz ? 'Quiz item' : 'Item'} ${i + 1}`}>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                        <Field label="Kind"><select value={it.kind} onChange={(e) => ops.set(i, { kind: e.target.value, open: e.target.value === 'paragraph' })} className={INPUT}>
                            <option value="word">Word</option><option value="sentence">Sentence</option>{!quiz && <option value="paragraph">Paragraph (teacher review)</option>}
                        </select></Field>
                        <Field label="Topic"><select value={it.topic} onChange={(e) => ops.set(i, { topic: e.target.value })} className={INPUT}>{TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                    </div>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        <Field label={`Text to translate (${direction === 'kn-en' ? 'Kannada' : 'English'})`}><textarea value={it.source || ''} onChange={(e) => ops.set(i, { source: e.target.value })} rows={it.kind === 'paragraph' ? 4 : 2} lang={kn === 'source' ? 'kn' : 'en'} className={`${INPUT} resize-y`} /></Field>
                        <Field label={`Model translation (${direction === 'kn-en' ? 'English' : 'Kannada'})`}><textarea value={it.model || ''} onChange={(e) => ops.set(i, { model: e.target.value })} rows={it.kind === 'paragraph' ? 4 : 2} lang={kn === 'model' ? 'kn' : 'en'} className={`${INPUT} resize-y`} /></Field>
                    </div>
                    {it.kind !== 'paragraph' && <div className="mt-2.5"><ListArea key={`${it._k}-acc`} label="Other accepted translations (one per line)" value={it.accepted} onChange={(accepted) => ops.set(i, { accepted })} rows={3} hint="Case, spacing and punctuation are ignored, and very close answers count, so list only genuinely different wordings." /></div>}
                    <Field label="Explanation" className="mt-2.5"><input value={it.explanation || ''} onChange={(e) => ops.set(i, { explanation: e.target.value })} className={INPUT} /></Field>
                </Row>
            ))}
            <button type="button" className={ADD_BTN} onClick={() => ops.add({ kind: 'sentence', topic: 'daily conversation', source: '', model: '', accepted: [], explanation: '' })}><Plus size={13} /> Add {quiz ? 'a quiz item' : 'an item'}</button>
        </div>
    );
}
