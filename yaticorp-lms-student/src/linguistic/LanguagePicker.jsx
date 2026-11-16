/**
 * Linguistic Ability — the student's languages (asked 2026-10-23), from the
 * chip beside the level: two dropdowns, as the student thinks of it (asked
 * 2026-10-24) — first the language they speak (meanings, translations and
 * tips are shown in it), then the one they want to learn (English, or another
 * language's course, courses.js on the server). Progress in each course is
 * kept; a course not begun asks where to start, in a third dropdown.
 * One language at a time (2026-10-27, user): once a course is started (`locked`),
 * the second dropdown shows it and cannot be changed; only the first can —
 * until every section of it is finished (`finished`, 2026-10-28): then the
 * student chooses their next language.
 *
 * Offered by itself once, when the device is set to one of the languages: it
 * then opens with the device's language already picked in the first dropdown.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ChevronDown, Check } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, SHOWN_LEVELS as LEVELS } from './meta';
import { Chunky, Mascot } from './ui';

/** A language's letter in its colour (grey when it cannot be chosen). */
const Mark = ({ item, tone, size = 'h-9 w-9' }) => (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl text-sm font-black text-white`} style={{ background: item?.disabled ? '#C9CED6' : tone }} aria-hidden="true">{item?.mark}</span>
);

/**
 * One dropdown, the app's own (2026-11-12, user: "make this drop down proper" — the browser's grey list): a button with
 * the chosen one's letter, opening its list in the popup (groups, each with its letter, the chosen one ticked, those that
 * cannot be chosen greyed with why). A hidden <select> keeps the value, as the page and its tests read it.
 * `groups`: [{ label, items: [{ value, title, sub, mark, disabled, note }] }].
 */
const Field = ({ label, value, onChange, disabled, groups, tone, hint, attr = {} }) => {
    const [open, setOpen] = useState(false);
    const box = useRef(null);
    const items = groups.flatMap((g) => g.items);
    const chosen = items.find((i) => i.value === value) || items[0];
    const sheet = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        // Escape shuts the list, not the languages popup under it.
        const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(false); } };
        window.addEventListener('keydown', esc, true);
        sheet.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
        return () => window.removeEventListener('keydown', esc, true);
    }, [open]);
    const pick = (v) => { onChange(v); setOpen(false); };
    return (
        <label className="block" ref={box}>
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#777]">{label}</span>
            <select className="sr-only" tabIndex={-1} aria-hidden="true" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...attr}>
                {groups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                        {g.items.map((i) => <option key={i.value} value={i.value} disabled={i.disabled}>{i.option || i.title}</option>)}
                    </optgroup>
                ))}
            </select>
            <button type="button" onClick={() => setOpen((o) => !o)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${chosen?.title || ''}`}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 bg-white py-2 pl-2.5 pr-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${open ? 'border-[#84D8FF]' : 'border-[#E5E5E5] hover:bg-[#F7F7F7]'}`}>
                <Mark item={chosen} tone={tone} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-extrabold text-[#3c3c3c]">{chosen?.title}</span>
                    {chosen?.sub && <span className="block truncate text-xs font-bold text-[#AFAFAF]">{chosen.sub}</span>}
                </span>
                <ChevronDown size={20} strokeWidth={3} className={`shrink-0 text-[#AFAFAF] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {/* The list as a popup of its own (2026-11-12, "make the drop down as a popup, the background blank"): in the middle
                of the screen over a dark veil, its name and a close button at the top; a tap on the veil shuts it. */}
            {open && createPortal(
                <div className="lingo fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/85 p-4 backdrop-blur-sm sm:p-6" onClick={(e) => { e.stopPropagation(); setOpen(false); }} data-dropdown-popup>
                    <div ref={sheet} className="lingo-pop flex max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
                        <div className="flex items-center gap-3 border-b-2 border-[#F2F2F2] px-5 py-4">
                            <p className="flex-1 text-lg font-extrabold text-[#3c3c3c]">{label}</p>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><X size={20} strokeWidth={3} /></button>
                        </div>
                <div role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                    {groups.filter((g) => g.items.length).map((g) => (
                        <div key={g.label} role="group" aria-label={g.label}>
                            {g.label && <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{g.label}</p>}
                            {g.items.map((i) => {
                                const on = i.value === value;
                                return (
                                    <button key={i.value} type="button" role="option" aria-selected={on} aria-disabled={i.disabled || undefined} disabled={i.disabled} onClick={() => pick(i.value)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed ${on ? '' : 'hover:bg-[#F7F7F7]'}`}
                                        style={on ? { background: COLORS.blue.light } : undefined} data-option={i.value}>
                                        <Mark item={i} tone={tone} size="h-8 w-8" />
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-[15px] font-extrabold ${i.disabled ? 'text-[#AFAFAF]' : 'text-[#3c3c3c]'}`}>{i.title}</span>
                                            {(i.sub || i.note) && <span className="block truncate text-xs font-bold text-[#AFAFAF]">{[i.sub, i.note].filter(Boolean).join(' · ')}</span>}
                                        </span>
                                        {on && <Check size={18} strokeWidth={3.5} className="shrink-0" style={{ color: COLORS.blue.ink }} aria-hidden="true" />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
                    </div>
                </div>,
                document.body
            )}
            {hint && <span className="mt-1.5 block text-sm font-semibold text-[#777]">{hint}</span>}
        </label>
    );
};

/**
 * @param {Array}    props.languages  [{ code, name, native, group }]
 * @param {Array}    props.courses    [{ code, name, native, full, begun }]
 * @param {string}   props.current    the language now in use
 * @param {object}   props.course     the course now taken ({ code, name })
 * @param {string}   props.suggested  the device's language, when it is one of them
 * @param {string}   props.mode       'speak' when offered for the device's language; 'learn' from the chip
 * @param {boolean}  props.locked     the course is started and not finished: it stays (one language at a time)
 * @param {boolean}  props.finished   every section of the course is finished: the next language can be chosen
 * @param {Function} props.onDone     after the languages are saved
 * @param {Function} props.onClose
 */
export default function LanguagePicker({ languages, courses = [], current, course = { code: 'en', name: 'English' }, suggested, mode = 'learn', locked = false, finished = false, onDone, onClose }) {
    const offered = mode === 'speak' && suggested && suggested !== current ? suggested : null;
    const [speak, setSpeak] = useState(offered || current);
    const [learn, setLearn] = useState(course.code || 'en');
    const [start, setStart] = useState('beginner');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const list = courses.length ? courses : [{ code: 'en', name: 'English', native: 'English', full: true, begun: true }];
    const chosen = list.find((c) => c.code === learn) || list[0];
    // One cannot learn the language one speaks (English for English speakers is a course of its own).
    const clash = learn !== 'en' && learn === speak;
    const fresh = chosen.code !== 'en' && !chosen.begun;
    const changed = speak !== current || learn !== course.code;
    const groupOf = (code) => languages.find((l) => l.code === code)?.group;
    const india = languages.filter((l) => l.group !== 'world'), world = languages.filter((l) => l.group === 'world');
    // With the course kept, its language cannot be the one they speak.
    const speakItem = (l) => {
        const off = locked && l.code !== 'en' && l.code === course.code;
        return { value: l.code, title: l.native, sub: l.native === l.name ? null : l.name, mark: langOf(l.code).mark, disabled: off, note: off ? 'you are learning it' : null, option: `${l.native} — ${l.name}${off ? ' (you are learning it)' : ''}` };
    };
    const speakGroups = [
        ...(suggested ? [{ label: 'Your device’s language', items: languages.filter((l) => l.code === suggested).map(speakItem) }] : []),
        { label: 'Languages of India', items: india.filter((l) => l.code !== suggested).map(speakItem) },
        { label: 'World languages', items: world.filter((l) => l.code !== suggested).map(speakItem) }
    ];
    const learnItem = (c) => ({
        value: c.code, title: c.name, sub: c.native && c.native !== c.name ? c.native : null, mark: c.code === 'en' ? 'En' : langOf(c.code).mark,
        disabled: !c.full && c.code === speak, note: !c.full && c.code === speak ? 'you speak it' : c.done ? 'finished' : !c.full && c.begun ? 'started' : null,
        option: `${c.name}${!c.full && c.code === speak ? ' (you speak it)' : c.done ? ' · finished' : !c.full && c.begun ? ' · started' : ''}`
    });
    const learnGroups = [
        { label: 'All five skills', items: list.filter((c) => c.full).map(learnItem) },
        { label: 'Words and sentences · languages of India', items: list.filter((c) => !c.full && groupOf(c.code) !== 'world').map(learnItem) },
        { label: 'Words and sentences · world languages', items: list.filter((c) => !c.full && groupOf(c.code) === 'world').map(learnItem) }
    ];
    const startGroups = [{ label: '', items: LEVELS.map((l, i) => ({ value: l.id, title: i === 0 ? 'Start from scratch' : `Start at ${l.label}`, sub: i === 0 ? 'Beginner' : null, mark: l.label[0], option: i === 0 ? 'Start from scratch (Beginner)' : `Start at ${l.label}` })) }];

    /**
     * Saved in an order the server accepts: the course is never the language
     * spoken, so swapping the two (Kannada → Hindi into Hindi → Kannada) steps
     * through English for a moment.
     */
    const save = () => {
        if (!changed || clash) return;
        setBusy(true); setError('');
        const steps = [];
        if (speak !== current && speak === course.code) steps.push(() => linguisticApi.setCourse('en'));
        if (speak !== current) steps.push(() => linguisticApi.setLanguage(speak));
        if (learn !== course.code || steps.length > 1) steps.push(() => linguisticApi.setCourse(learn, fresh ? start : null));
        steps.reduce((p, step) => p.then(step), Promise.resolve())
            .then(onDone)
            .catch((e) => { setError(e.message); setBusy(false); });
    };

    const courseNote = locked ? `You are learning ${chosen.name}. Finish all its sections, then choose your next language.`
        : finished && learn === course.code ? `You finished ${course.name}. Choose your next language.`
        : clash ? `You speak ${langOf(speak).name}. Choose another language to learn.`
        : chosen.full ? `All five skills: vocabulary, grammar, reading, speaking and translation${speak === 'en' ? ', all in English' : `, taught in ${langOf(speak).name}`}.`
            : `Words and sentences, taught in ${langOf(speak).name}. ${chosen.begun ? 'You continue where you left off.' : 'A new course.'}`;

    return createPortal(
        // A popup in the middle of the screen on a phone too (2026-10-26), not a sheet from the bottom.
        <div className="lingo fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 sm:p-6" onClick={onClose}>
            <div className="lingo-pop max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-lang" data-language-picker>
                <div className="flex items-start gap-3">
                    <Mascot pose="curious-question" className="h-20 w-20 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <h2 id="lingo-lang" className="text-xl font-extrabold text-[#3c3c3c]">Your languages</h2>
                        <p className="mt-1 text-[15px] font-semibold text-[#777]">{offered ? `Your device is set to ${langOf(offered).name}. Learn from it?` : locked ? 'The language you know. The language you learn stays the same until you finish it: one language at a time.' : finished ? `Well done: you finished ${course.name}! Choose the next language to learn.` : 'The language you know, then the one you want to learn. Your progress in each course is kept.'}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><X size={22} strokeWidth={3} /></button>
                </div>

                <div className="mt-5 space-y-4">
                    <Field label="I speak" value={speak} onChange={(v) => { setSpeak(v); setError(''); }} disabled={busy} groups={speakGroups} tone={COLORS.blue.face}
                        hint="Word meanings, translations and tips are shown in it." attr={{ 'data-speak': speak, 'aria-label': 'I speak' }} />

                    <Field label="I want to learn" value={learn} onChange={(v) => { setLearn(v); setError(''); }} disabled={busy || locked} groups={learnGroups} tone={clash ? COLORS.red.face : COLORS.green.face}
                        hint={courseNote} attr={{ 'data-learn': learn, 'aria-label': 'I want to learn' }} />

                    {fresh && !clash && (
                        <Field label="Where to start" value={start} onChange={setStart} disabled={busy} groups={startGroups} tone={COLORS.purple.face}
                            hint={start === 'beginner' ? 'The first words and sentences.' : `If you already know some ${chosen.name}.`} attr={{ 'data-start-level': start, 'aria-label': 'Where to start' }} />
                    )}
                </div>

                {error && <p className="mt-3 text-sm font-bold" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
                <div className="mt-5 flex gap-3">
                    <Chunky variant="ghost" color="blue" onClick={onClose} className="flex-1" disabled={busy}>Cancel</Chunky>
                    <Chunky color="green" onClick={save} disabled={busy || !changed || clash} className="flex-1" data-picker-save>
                        {busy ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : 'Save'}
                    </Chunky>
                </div>
            </div>
        </div>,
        document.body
    );
}
