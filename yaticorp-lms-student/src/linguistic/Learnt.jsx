/**
 * Language Learning — notes of what the student has learnt (asked 2026-11-02: "as the user goes through the learning
 * flow, make notes of what he learnt, so if he wants some topic he can go and see it at once"; chose: a Notes tab,
 * filled by itself with words and meanings, letters, sentences and picture stories). Every finished lesson's share,
 * under its section and unit; a search box and the topics as chips to go straight to one. (The Writing tab's
 * notepad is the student's own notes; these write themselves.)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, BookOpen } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, SHOWN_LEVELS } from './meta';
import { Loading, Mascot, Panel, Problem, Speaker } from './ui';

const has = (q, ...texts) => !q || texts.some((t) => t && String(t).toLowerCase().includes(q));
/** A lesson's notes with only what the search finds (all of it with no search). */
const filtered = (lesson, q) => ({
    ...lesson,
    words: lesson.words?.filter((w) => has(q, w.word, w.say, w.meaning, w.en)),
    letters: lesson.letters?.filter((l) => has(q, l.letter, l.sound, l.word, l.sentence, l.sentenceEn)),
    sentences: lesson.sentences?.filter((s) => has(q, s.text, s.say, s.meaning, s.en)),
    story: lesson.story && has(q, lesson.story.title, lesson.story.moral) ? lesson.story : null
});
const any = (l) => !!(l.words?.length || l.letters?.length || l.sentences?.length || l.story);
const Label = ({ children }) => <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{children}</p>;

function Words({ words, lang }) {
    return (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-notes-words>
            {words.map((w, i) => (
                <li key={`${w.word}-${i}`} className="flex items-center gap-3 rounded-xl bg-[#F7F7F7] px-3 py-2" data-notes-word>
                    <span className="min-w-0 flex-1">
                        <span className="block break-words text-[17px] font-extrabold text-[#3c3c3c]" lang={lang}>{w.word}</span>
                        {w.say && <span className="block break-words text-sm font-bold" style={{ color: COLORS.blue.ink }}>{w.say}</span>}
                        <span className="block break-words text-sm font-semibold text-[#777]">{w.meaning}{w.en && w.en !== w.meaning ? ` · ${w.en}` : ''}</span>
                    </span>
                    <Speaker src={w.audio} text={w.word} lang={w.locale || 'en-IN'} size="sm" />
                </li>
            ))}
        </ul>
    );
}

function Letters({ letters, lang }) {
    return (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-notes-letters>
            {letters.map((l, i) => (
                <li key={`${l.letter}-${i}`} className="flex gap-3 rounded-xl bg-[#F7F7F7] px-3 py-2.5" data-notes-letter>
                    <span className="flex w-14 shrink-0 flex-col items-center">
                        <span className="text-[26px] font-black leading-tight text-[#3c3c3c]" lang={lang}>{l.letter}</span>
                        {l.sound && <span className="text-xs font-bold" style={{ color: COLORS.blue.ink }}>{l.sound}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                        {l.word
                            ? <>
                                <span className="block break-words text-[15px] font-extrabold text-[#3c3c3c]"><span aria-hidden="true">{l.pic} </span><span lang={lang}>{l.word}</span>{l.wordSound && <span className="font-bold" style={{ color: COLORS.blue.ink }}> · {l.wordSound}</span>}</span>
                                {l.sentence && <span className="mt-0.5 block break-words text-sm font-semibold text-[#4b4b4b]" lang={lang}>{l.sentence}</span>}
                                {l.sentenceEn && <span className="block break-words text-sm font-semibold text-[#777]">{l.sentenceEn}</span>}
                            </>
                            : <span className="block pt-1.5 text-sm font-semibold text-[#AFAFAF]">Learnt by its sound</span>}
                    </span>
                    <Speaker text={l.speak || l.letter} lang={l.locale || 'en-IN'} size="sm" />
                </li>
            ))}
        </ul>
    );
}

function Sentences({ sentences, lang }) {
    return (
        <ul className="space-y-2" data-notes-sentences>
            {sentences.map((s, i) => (
                <li key={`${s.text}-${i}`} className="flex items-center gap-3 rounded-xl bg-[#F7F7F7] px-3 py-2" data-notes-sentence>
                    <span className="min-w-0 flex-1">
                        <span className="block break-words text-[15px] font-extrabold text-[#3c3c3c]" lang={lang}>{s.text}</span>
                        {s.say && <span className="block break-words text-sm font-bold" style={{ color: COLORS.blue.ink }}>{s.say}</span>}
                        <span className="block break-words text-sm font-semibold text-[#777]">{s.meaning}{s.en && s.en !== s.meaning ? ` · ${s.en}` : ''}</span>
                    </span>
                    <Speaker text={s.text} lang={lang} size="sm" />
                </li>
            ))}
        </ul>
    );
}

function Unit({ unit, lang, locale }) {
    return (
        <Panel className="scroll-mt-24 space-y-4 p-4 sm:p-5" id={`notes-${unit.id}`} data-notes-unit={unit.id}>
            <h3 className="text-lg font-extrabold text-[#3c3c3c]">{unit.title}</h3>
            {unit.lessons.map((l) => (
                <section key={l.id} className="space-y-2" data-notes-lesson={l.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <Label>{l.title}</Label>
                        <Link to={`/linguistic?lesson=${l.id}`} className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }} data-notes-open><BookOpen size={13} /> Open the lesson</Link>
                    </div>
                    {l.letters?.length > 0 && <Letters letters={l.letters} lang={lang} />}
                    {l.words?.length > 0 && <Words words={l.words} lang={lang} />}
                    {l.sentences?.length > 0 && <Sentences sentences={l.sentences} lang={l.locale || locale} />}
                    {l.story && (
                        <div className="rounded-xl px-3.5 py-3" style={{ background: COLORS.gold.light }} data-notes-story>
                            <p className="text-[15px] font-extrabold text-[#3c3c3c]" lang={lang}>📖 {l.story.title}</p>
                            <p className="mt-1 text-[15px] font-semibold text-[#4b4b4b]" lang={lang}><span className="font-extrabold" style={{ color: COLORS.gold.ink }}>{l.story.moralLabel || 'Moral:'}</span> {l.story.moral}</p>
                        </div>
                    )}
                </section>
            ))}
        </Panel>
    );
}

export default function Learnt() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [tries, setTries] = useState(0);
    useEffect(() => {
        let live = true;
        linguisticApi.learnt().then((d) => { if (live) { setData(d); setError(null); } }).catch((e) => { if (live) { setError(e); setData(null); } });
        return () => { live = false; };
    }, [tries]);
    const q = query.trim().toLowerCase();
    const levels = useMemo(() => (data?.levels || []).map((s) => ({
        ...s, units: s.units.map((u) => ({ ...u, lessons: u.lessons.map((l) => filtered(l, q)).filter(any) })).filter((u) => u.lessons.length)
    })).filter((s) => s.units.length), [data, q]);
    const counts = useMemo(() => {
        const all = (data?.levels || []).flatMap((s) => s.units.flatMap((u) => u.lessons));
        return [['words', all.reduce((n, l) => n + (l.words?.length || 0), 0)], ['letters', all.reduce((n, l) => n + (l.letters?.length || 0), 0)],
            ['sentences', all.reduce((n, l) => n + (l.sentences?.length || 0), 0)], ['stories', all.filter((l) => l.story).length]].filter(([, n]) => n);
    }, [data]);
    if (data === undefined) return <Loading label="Loading your notes…" />;
    if (!data) return <Problem error={error} onRetry={() => { setData(undefined); setTries((n) => n + 1); }} />;
    // The language learnt: a course's own, else English.
    const lang = data.course?.code && data.course.code !== 'en' ? data.course.code : 'en';
    const locale = data.course?.locale || 'en-IN';
    const sections = data.levels.length > 1;
    const sectionOf = (level) => SHOWN_LEVELS.findIndex((l) => l.id === level) + 1;
    const go = (id) => document.getElementById(`notes-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return (
        <div className="space-y-4" data-notes-page>
            <div>
                <h1 className="text-2xl font-extrabold text-[#3c3c3c]">Your notes</h1>
                <p className="mt-1 text-[15px] font-semibold text-[#777]">What you have learnt, from every lesson you finished. Search for a word, or tap a topic to go to it.</p>
            </div>
            {data.levels.length === 0 ? (
                <Panel className="flex flex-col items-center gap-2 p-8 text-center" data-notes-empty>
                    <Mascot pose="presenting" className="h-28 w-28" />
                    <p className="text-[17px] font-extrabold text-[#3c3c3c]">No notes yet</p>
                    <p className="max-w-sm text-[15px] font-semibold text-[#777]">Finish a lesson and its words, letters, sentences and stories are written here for you.</p>
                    <Link to="/linguistic" className="lingo-btn mt-2 inline-flex h-11 items-center px-5 text-[15px]" style={{ background: COLORS.green.face, borderColor: COLORS.green.edge, color: '#fff' }}>Start learning</Link>
                </Panel>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2" data-notes-counts>
                        {counts.map(([k, n]) => <span key={k} className="rounded-full bg-[#F7F7F7] px-3 py-1 text-sm font-extrabold text-[#4b4b4b]">{n} {n === 1 ? k.replace(/s$/, '').replace(/ie$/, 'y') : k}</span>)}
                    </div>
                    <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-[#E5E5E5] bg-white px-3 focus-within:border-[#84D8FF]">
                        <Search size={18} className="shrink-0 text-[#AFAFAF]" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your notes" aria-label="Search your notes" className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[#3c3c3c] outline-none placeholder:text-[#AFAFAF]" data-notes-search />
                        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear the search" className="rounded-full p-1 text-[#AFAFAF] hover:text-[#777]"><X size={16} /></button>}
                    </label>
                    {levels.length > 0 && (
                        <nav aria-label="Topics" className="flex flex-wrap gap-2" data-notes-topics>
                            {levels.flatMap((s) => s.units.map((u) => (
                                <button key={u.id} type="button" onClick={() => go(u.id)} className="rounded-full border-2 border-[#E5E5E5] bg-white px-3 py-1.5 text-sm font-extrabold text-[#4b4b4b] hover:bg-[#F7F7F7]" data-notes-topic={u.id}>
                                    {sections ? `${sectionOf(s.level)} · ` : ''}{u.title}
                                </button>
                            )))}
                        </nav>
                    )}
                    {levels.length === 0 && <Panel className="p-6 text-center text-[15px] font-semibold text-[#777]" data-notes-none>Nothing in your notes matches “{query.trim()}”.</Panel>}
                    {levels.map((s) => (
                        <section key={s.level} className="space-y-3" data-notes-section={s.level}>
                            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#777]">Section {sectionOf(s.level)} · {s.label}</h2>
                            {s.units.map((u) => <Unit key={u.id} unit={u} lang={lang} locale={locale} />)}
                        </section>
                    ))}
                </>
            )}
        </div>
    );
}
