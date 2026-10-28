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
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, langOf, LEVELS } from './meta';
import { Chunky, Mascot } from './ui';

const SELECT = 'w-full appearance-none rounded-2xl border-2 border-b-4 border-[#E5E5E5] bg-white py-3 pl-14 pr-10 text-[17px] font-extrabold text-[#3c3c3c] focus:border-[#84D8FF] focus:outline-none disabled:opacity-60';

/** One dropdown, with the chosen language's letter beside it. */
const Field = ({ label, code, mark, tone, hint, children, attr = {} }) => (
    <label className="block">
        <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#777]">{label}</span>
        <span className="relative block">
            <span className="pointer-events-none absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: tone }} lang={code} aria-hidden="true">{mark}</span>
            <select className={SELECT} {...attr}>{children}</select>
            <ChevronDown size={20} strokeWidth={3} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#AFAFAF]" aria-hidden="true" />
        </span>
        {hint && <span className="mt-1.5 block text-sm font-semibold text-[#777]">{hint}</span>}
    </label>
);

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
    const speakOption = (l) => {
        const off = locked && l.code !== 'en' && l.code === course.code;
        return <option key={l.code} value={l.code} disabled={off}>{l.native} — {l.name}{off ? ' (you are learning it)' : ''}</option>;
    };

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
                    <Field label="I speak" code={speak} mark={langOf(speak).mark} tone={COLORS.blue.face}
                        hint="Word meanings, translations and tips are shown in it."
                        attr={{ value: speak, onChange: (e) => { setSpeak(e.target.value); setError(''); }, disabled: busy, 'data-speak': speak, 'aria-label': 'I speak' }}>
                        {suggested && <optgroup label="Your device’s language">{languages.filter((l) => l.code === suggested).map(speakOption)}</optgroup>}
                        <optgroup label="Languages of India">{india.filter((l) => l.code !== suggested).map(speakOption)}</optgroup>
                        <optgroup label="World languages">{world.filter((l) => l.code !== suggested).map(speakOption)}</optgroup>
                    </Field>

                    <Field label="I want to learn" code={learn} mark={learn === 'en' ? 'En' : langOf(learn).mark} tone={clash ? COLORS.red.face : COLORS.green.face} hint={courseNote}
                        attr={{ value: learn, onChange: (e) => { setLearn(e.target.value); setError(''); }, disabled: busy || locked, 'data-learn': learn, 'aria-label': 'I want to learn' }}>
                        <optgroup label="All five skills">{list.filter((c) => c.full).map((c) => <option key={c.code} value={c.code}>{c.name}{c.done ? ' · finished' : ''}</option>)}</optgroup>
                        <optgroup label="Words and sentences · languages of India">{list.filter((c) => !c.full && groupOf(c.code) !== 'world').map((c) => (
                            <option key={c.code} value={c.code} disabled={c.code === speak}>{c.name}{c.code === speak ? ' (you speak it)' : c.done ? ' · finished' : c.begun ? ' · started' : ''}</option>
                        ))}</optgroup>
                        <optgroup label="Words and sentences · world languages">{list.filter((c) => !c.full && groupOf(c.code) === 'world').map((c) => (
                            <option key={c.code} value={c.code} disabled={c.code === speak}>{c.name}{c.code === speak ? ' (you speak it)' : c.done ? ' · finished' : c.begun ? ' · started' : ''}</option>
                        ))}</optgroup>
                    </Field>

                    {fresh && !clash && (
                        <Field label="Where to start" code="lv" mark={LEVELS.find((l) => l.id === start)?.label[0]} tone={COLORS.purple.face}
                            hint={start === 'beginner' ? 'The first words and sentences.' : `If you already know some ${chosen.name}.`}
                            attr={{ value: start, onChange: (e) => setStart(e.target.value), disabled: busy, 'data-start-level': start, 'aria-label': 'Where to start' }}>
                            {LEVELS.map((l, i) => <option key={l.id} value={l.id}>{i === 0 ? 'Start from scratch (Beginner)' : `Start at ${l.label}`}</option>)}
                        </Field>
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
