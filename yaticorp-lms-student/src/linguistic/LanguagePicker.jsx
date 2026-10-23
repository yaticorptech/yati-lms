/**
 * Linguistic Ability — choosing the student's own language (asked
 * 2026-10-23): Kannada, the other languages of India, and the world's. The
 * language chosen is the one meanings, translations and tips are shown in.
 * Offered by itself once, when the device is set to one of them; always from
 * the chip beside the level.
 *
 * The same sheet chooses the language learnt (asked the same day): English,
 * or another language's course (courses.js on the server). Progress in each
 * course is kept; a course not begun asks where to start.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Sprout } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, LEVELS } from './meta';
import { Mascot } from './ui';

/**
 * @param {Array}    props.languages  [{ code, name, native, group }]
 * @param {Array}    props.courses    [{ code, name, native, full, begun }]
 * @param {string}   props.current    the language now in use
 * @param {object}   props.course     the course now taken ({ code, name })
 * @param {string}   props.suggested  the device's language, when it is one of them
 * @param {string}   props.mode       'learn' (the course) or 'speak' (the student's language) to open on
 * @param {Function} props.onDone     (view) after a language or course is saved
 * @param {Function} props.onClose
 */
export default function LanguagePicker({ languages, courses = [], current, course = { code: 'en', name: 'English' }, suggested, mode: opening = 'speak', onDone, onClose }) {
    const [mode, setMode] = useState(opening);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(null);     // a course not begun: where to start in it
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const save = (code, call) => {
        setBusy(code); setError('');
        call().then(onDone).catch((e) => { setError(e.message); setBusy(''); });
    };
    const pick = (code) => save(code, () => linguisticApi.setLanguage(code));
    const learn = (c) => {
        if (c.code === course.code) { onClose(); return; }
        if (c.code !== 'en' && !c.begun) { setStarting(c); return; }
        save(c.code, () => linguisticApi.setCourse(c.code));
    };
    const groupOf = (code) => languages.find((l) => l.code === code)?.group;

    // The device's language first, then the languages of India and of the world.
    const groups = mode === 'speak'
        ? [
            { id: 'device', label: 'Your device’s language', list: languages.filter((l) => l.code === suggested) },
            { id: 'india', label: 'Languages of India', list: languages.filter((l) => l.code !== suggested && l.group !== 'world') },
            { id: 'world', label: 'World languages', list: languages.filter((l) => l.code !== suggested && l.group === 'world') }
        ]
        : [
            { id: 'english', label: 'All five skills', list: courses.filter((c) => c.full) },
            { id: 'india', label: 'Words and sentences · languages of India', list: courses.filter((c) => !c.full && groupOf(c.code) !== 'world') },
            { id: 'world', label: 'Words and sentences · world languages', list: courses.filter((c) => !c.full && groupOf(c.code) === 'world') }
        ];
    const row = (l) => {
        const on = mode === 'speak' ? l.code === current : l.code === course.code;
        // The language spoken cannot also be the one learnt (English for English speakers is a course of its own).
        const clash = mode === 'speak' ? l.code !== 'en' && l.code === course.code : l.code !== 'en' && l.code === current;
        const note = clash ? (mode === 'speak' ? 'You are learning it' : 'You speak it') : mode === 'learn' ? (l.full ? `English for ${langOf(current).name} speakers` : l.begun ? 'Continue where you left off' : 'Start a new course') : l.name;
        return (
            <li key={l.code}>
                <button type="button" onClick={() => (mode === 'speak' ? pick(l.code) : learn(l))} disabled={!!busy || clash} aria-pressed={on} data-language={mode === 'speak' ? l.code : undefined} data-course={mode === 'learn' ? l.code : undefined}
                    className={`lingo-tile flex min-h-14 w-full items-center gap-3 px-3 text-left ${clash ? 'cursor-not-allowed opacity-50' : ''}`} style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white" style={{ background: on ? COLORS.blue.face : mode === 'learn' ? COLORS.green.face : '#AFAFAF' }} lang={l.code}>{langOf(l.code).mark}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-extrabold text-[#3c3c3c]" lang={l.code} dir="auto">{mode === 'learn' ? l.name : l.native}</span>
                        <span className="block text-sm font-semibold text-[#777]">{note}</span>
                    </span>
                    {busy === l.code ? <span className="text-sm font-extrabold text-[#AFAFAF]">Saving…</span> : on && <Check size={22} strokeWidth={3.5} style={{ color: COLORS.blue.face }} />}
                </button>
            </li>
        );
    };
    const title = starting ? `Where do you want to start in ${starting.name}?` : mode === 'speak' ? 'Which language do you speak?' : 'What do you want to learn?';
    const text = starting ? 'Words and sentences, taught in your language. You can move on as you pass each level.'
        : mode === 'speak' ? `You are learning ${course.name}. Word meanings, translations and tips will be in your language.`
            : `For ${langOf(current).name} speakers. Your progress in each course is kept.`;
    return createPortal(
        <div className="lingo fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
            <div className="lingo-sheet max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-lang" data-language-picker={mode}>
                <div className="flex items-start gap-3">
                    <Mascot pose="curious-question" className="h-20 w-20 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <h2 id="lingo-lang" className="text-xl font-extrabold text-[#3c3c3c]">{title}</h2>
                        <p className="mt-1 text-[15px] font-semibold text-[#777]">{text}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><X size={22} strokeWidth={3} /></button>
                </div>
                {!starting && courses.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F2F2F2] p-1" role="tablist" aria-label="Choose">
                        {[['learn', 'I’m learning'], ['speak', 'I speak']].map(([m, label]) => (
                            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); }} data-picker-tab={m}
                                className={`min-h-11 rounded-xl text-sm font-extrabold uppercase tracking-wide ${mode === m ? 'bg-white text-[#1899D6] shadow-sm' : 'text-[#777]'}`}>{label}</button>
                        ))}
                    </div>
                )}
                {starting ? (
                    <ul className="mt-4 grid gap-2" data-course-start={starting.code}>
                        {LEVELS.map((l, i) => (
                            <li key={l.id}>
                                <button type="button" onClick={() => save(l.id, () => linguisticApi.setCourse(starting.code, l.id))} disabled={!!busy} data-start-level={l.id}
                                    className="lingo-tile flex min-h-14 w-full items-center gap-3 px-3 text-left">
                                    {i === 0 ? <Sprout size={28} strokeWidth={2.2} className="shrink-0" style={{ color: COLORS.green.face }} /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: COLORS.blue.face }}>{l.label[0]}</span>}
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{i === 0 ? 'Start from scratch' : `Start at ${l.label}`}</span>
                                        <span className="block text-sm font-semibold text-[#777]">{i === 0 ? 'The first words and sentences.' : `If you already know some ${starting.name}.`}</span>
                                    </span>
                                    {busy === l.id && <span className="text-sm font-extrabold text-[#AFAFAF]">Saving…</span>}
                                </button>
                            </li>
                        ))}
                        <li><button type="button" onClick={() => setStarting(null)} disabled={!!busy} className="min-h-11 px-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }}>Back to the courses</button></li>
                    </ul>
                ) : groups.filter((g) => g.list.length).map((g) => (
                    <section key={g.id} className="mt-4" data-language-group={g.id}>
                        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{g.label}</h3>
                        <ul className="grid gap-2 sm:grid-cols-2">{g.list.map(row)}</ul>
                    </section>
                ))}
                {error && <p className="mt-3 text-sm font-bold" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
            </div>
        </div>,
        document.body
    );
}
