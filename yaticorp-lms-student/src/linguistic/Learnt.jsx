/**
 * Language Learning — notes of what the student has learnt (asked 2026-11-02: "as the user goes through the learning
 * flow, make notes of what he learnt, so if he wants some topic he can go and see it at once"; chose: a Notes tab,
 * filled by itself with words and meanings, letters, sentences and picture stories). Every finished lesson's share,
 * under its section and unit; a search box and the topics as chips to go straight to one. (The Writing tab's
 * notepad is the student's own notes; these write themselves.)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, BookOpen, NotebookText } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, SHOWN_LEVELS, levelOf } from './meta';
import { Loading, Mascot, Panel, Problem, Speaker } from './ui';

const has = (q, ...texts) => !q || texts.some((t) => t && String(t).toLowerCase().includes(q));
/** A lesson's notes with only what the search finds (all of it with no search). */
const filtered = (lesson, q) => ({
    ...lesson,
    words: lesson.words?.filter((w) => has(q, w.word, w.say, w.meaning, w.en)),
    letters: lesson.letters?.filter((l) => has(q, l.letter, l.sound, l.word, l.sentence, l.sentenceEn)),
    sentences: lesson.sentences?.filter((s) => has(q, s.text, s.say, s.meaning, s.en)),
    story: lesson.story && has(q, lesson.story.title, lesson.story.moral, lesson.story.text) ? lesson.story : null,
    // A conversation and a grammar rule (2026-11-18, the user: "what the student learns comes to the notes").
    talk: lesson.talk && has(q, lesson.talk.scenario, ...(lesson.talk.lines || []).flatMap((x) => [x.text, x.meaning]), ...(lesson.talk.phrases || [])) ? lesson.talk : null,
    rule: lesson.rule && has(q, lesson.title, lesson.rule.intro, ...(lesson.rule.points || []), ...(lesson.rule.examples || [])) ? lesson.rule : null
});
const any = (l) => !!(l.words?.length || l.letters?.length || l.sentences?.length || l.story || l.talk || l.rule);
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

/** A story: its title, then its moral (a picture story) or its whole text, to read again (2026-11-18). */
function Story({ story, lang }) {
    return (
        <div className="rounded-xl px-3.5 py-3" style={{ background: COLORS.gold.light }} data-notes-story>
            <p className="text-[15px] font-extrabold text-[#3c3c3c]" lang={lang}>📖 {story.title}</p>
            {story.moral && <p className="mt-1 text-[15px] font-semibold text-[#4b4b4b]" lang={lang}><span className="font-extrabold" style={{ color: COLORS.gold.ink }}>{story.moralLabel || 'Moral:'}</span> {story.moral}</p>}
            {story.text && (
                <details className="mt-1 group">
                    <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wide" style={{ color: COLORS.gold.ink }}>Read the story</summary>
                    <p className="mt-1.5 whitespace-pre-line break-words text-[15px] font-semibold leading-relaxed text-[#4b4b4b]" lang={lang} data-notes-story-text>{story.text}</p>
                </details>
            )}
        </div>
    );
}

/** A conversation: who says what, each line with its meaning, and its useful phrases (2026-11-18). */
function Talk({ talk, lang }) {
    const speak = talk.locale || lang;
    return (
        <div className="space-y-2 rounded-xl bg-[#F2F5FF] px-3.5 py-3" data-notes-talk>
            {talk.scenario && <p className="text-sm font-bold text-[#777]">💬 {talk.scenario}</p>}
            <ul className="space-y-1.5">
                {(talk.lines || []).map((x, i) => (
                    <li key={i} className="flex items-start gap-2" data-notes-line>
                        <span className="min-w-0 flex-1">
                            <span className="block break-words text-[15px] font-semibold text-[#3c3c3c]"><span className="font-extrabold" style={{ color: COLORS.blue.ink }}>{x.speaker}:</span> <span lang={speak}>{x.text}</span></span>
                            {x.meaning && x.meaning !== x.text && <span className="block break-words text-sm font-semibold text-[#777]">{x.meaning}</span>}
                        </span>
                        <Speaker text={x.text} lang={speak} size="sm" />
                    </li>
                ))}
            </ul>
            {talk.phrases?.length > 0 && (
                <div>
                    <Label>Useful phrases</Label>
                    <ul className="mt-1 flex flex-wrap gap-1.5">{talk.phrases.map((p) => <li key={p} className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-[#4b4b4b] ring-1 ring-[#E5E5E5]" lang={speak}>{p}</li>)}</ul>
                </div>
            )}
        </div>
    );
}

/** A grammar rule: what it is, its points and its examples (2026-11-18). */
function Rule({ rule, lang }) {
    return (
        <div className="space-y-1.5 rounded-xl px-3.5 py-3" style={{ background: COLORS.green.light }} data-notes-rule>
            {rule.intro && <p className="text-[15px] font-bold text-[#3c3c3c]">✏️ {rule.intro}</p>}
            {rule.points?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-[15px] font-semibold text-[#4b4b4b]">{rule.points.map((p) => <li key={p}>{p}</li>)}</ul>}
            {rule.examples?.length > 0 && (
                <div>
                    <Label>Examples</Label>
                    <ul className="mt-1 space-y-1">{rule.examples.map((e) => <li key={e} className="flex items-center gap-2 text-[15px] font-semibold text-[#3c3c3c]"><span className="min-w-0 flex-1 break-words" lang={lang}>{e}</span><Speaker text={e} lang={lang} size="sm" /></li>)}</ul>
                </div>
            )}
        </div>
    );
}

function Unit({ unit, number, tone = COLORS.green, lang, locale }) {
    return (
        <Panel className="scroll-mt-24 overflow-hidden" id={`notes-${unit.id}`} data-notes-unit={unit.id}>
            <div className="flex items-center gap-3 px-4 py-3 text-white sm:px-5" style={{ background: `linear-gradient(135deg, ${tone.face} 0%, ${tone.edge} 100%)` }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-black" style={{ color: tone.edge }}>{number}</span>
                <div className="min-w-0">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white/85">Unit {number} · {unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'}</p>
                    <h3 className="truncate text-lg font-black leading-tight">{unit.title}</h3>
                </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
            {unit.lessons.map((l) => (
                <section key={l.id} className="space-y-2" data-notes-lesson={l.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <Label>{l.title}</Label>
                        <Link to={`/linguistic?lesson=${l.id}`} className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }} data-notes-open><BookOpen size={13} /> Open the lesson</Link>
                    </div>
                    {l.letters?.length > 0 && <Letters letters={l.letters} lang={lang} />}
                    {l.words?.length > 0 && <Words words={l.words} lang={lang} />}
                    {l.sentences?.length > 0 && <Sentences sentences={l.sentences} lang={l.locale || locale} />}
                    {l.story && <Story story={l.story} lang={lang} />}
                    {l.talk && <Talk talk={l.talk} lang={locale} />}
                    {l.rule && <Rule rule={l.rule} lang={locale} />}
                </section>
            ))}
            </div>
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
            ['sentences', all.reduce((n, l) => n + (l.sentences?.length || 0), 0)], ['stories', all.filter((l) => l.story).length],
            ['conversations', all.filter((l) => l.talk).length], ['grammar rules', all.filter((l) => l.rule).length]].filter(([, n]) => n);
    }, [data]);
    if (data === undefined) return <Loading label="Loading your notes…" />;
    if (!data) return <Problem error={error} onRetry={() => { setData(undefined); setTries((n) => n + 1); }} />;
    // The language learnt: a course's own, else English.
    const lang = data.course?.code && data.course.code !== 'en' ? data.course.code : 'en';
    const locale = data.course?.locale || 'en-IN';
    const sections = data.levels.length > 1;
    const sectionOf = (level) => SHOWN_LEVELS.findIndex((l) => l.id === level) + 1;
    // Beginner green, Advanced purple: the same colours as the Lessons and Sections pages.
    const toneOf = (level) => COLORS[['green', 'purple', 'blue'][Math.max(0, sectionOf(level) - 1) % 3]];
    const go = (id) => document.getElementById(`notes-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return (
        <div className="space-y-4" data-notes-page>
            {/* Redesigned 2026-11-16 ("redesign it"): a gold card like the Notes tile, the counts as tiles and the
                search inside it; topics as coloured chips; each unit with its number. */}
            <section className="relative overflow-hidden rounded-3xl px-5 py-5 text-white sm:px-7" style={{ background: `linear-gradient(135deg, ${COLORS.gold.face} 0%, ${COLORS.orange.face} 100%)`, boxShadow: `0 4px 0 ${COLORS.gold.edge}, 0 14px 28px -12px ${COLORS.gold.edge}` }}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 left-1/4 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/25 ring-2 ring-white/40"><NotebookText size={24} strokeWidth={2.5} /></span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black leading-tight drop-shadow-sm">Your notes</h1>
                        <p className="mt-0.5 text-sm font-bold text-white/90">Everything from the lessons you finished. Search a word, or tap a topic.</p>
                    </div>
                </div>
                {data.levels.length > 0 && (
                    <>
                        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-notes-counts>
                            {counts.map(([k, n]) => (
                                <span key={k} className="rounded-2xl bg-white/20 px-3 py-2 ring-1 ring-white/30">
                                    <span className="block text-2xl font-black leading-none">{n}</span>
                                    <span className="text-xs font-extrabold capitalize text-white/90">{n === 1 ? k.replace(/s$/, '').replace(/ie$/, 'y') : k}</span>
                                </span>
                            ))}
                        </div>
                        <label className="relative mt-3 flex h-12 items-center gap-2 rounded-2xl bg-white px-3 shadow-sm ring-2 ring-transparent focus-within:ring-white/70">
                            <Search size={18} className="shrink-0 text-[#AFAFAF]" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your notes" aria-label="Search your notes" className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[#3c3c3c] outline-none placeholder:text-[#AFAFAF]" data-notes-search />
                            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear the search" className="rounded-full p-1 text-[#AFAFAF] hover:text-[#777]"><X size={16} /></button>}
                        </label>
                    </>
                )}
            </section>
            {data.levels.length === 0 ? (
                <Panel className="flex flex-col items-center gap-2 p-8 text-center" data-notes-empty>
                    <Mascot pose="presenting" className="h-28 w-28" />
                    <p className="text-[17px] font-extrabold text-[#3c3c3c]">No notes yet</p>
                    <p className="max-w-sm text-[15px] font-semibold text-[#777]">Finish a lesson and what it taught — words, letters, sentences, stories, conversations and grammar — is written here for you.</p>
                    <Link to="/linguistic" className="lingo-btn mt-2 inline-flex h-11 items-center px-5 text-[15px]" style={{ background: COLORS.green.face, borderColor: COLORS.green.edge, color: '#fff' }}>Start learning</Link>
                </Panel>
            ) : (
                <>
                    {levels.length > 0 && (
                        <nav aria-label="Topics" className="space-y-3" data-notes-topics>
                            {/* Grouped by section, each topic with its unit number (2026-11-16: the chips used
                                to show the section number, so every Section 1 topic read "1 ·"). */}
                            {levels.map((s) => (
                                <div key={s.level}>
                                    {sections && <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: toneOf(s.level).ink }}>Section {sectionOf(s.level)} · {levelOf(s.level).label}</p>}
                                    <div className="flex flex-wrap gap-2">
                                        {s.units.map((u, ui) => (
                                            <button key={u.id} type="button" onClick={() => go(u.id)} className="lingo-tile inline-flex items-center gap-2 !rounded-full py-1 pl-1 pr-3.5 text-sm font-extrabold text-[#4b4b4b]" data-notes-topic={u.id}>
                                                <span className="grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-black text-white" style={{ background: toneOf(s.level).face }} aria-label={`Unit ${(u.number ?? ui + 1)}`}>{u.number ?? ui + 1}</span>
                                                {u.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    )}
                    {levels.length === 0 && <Panel className="p-6 text-center text-[15px] font-semibold text-[#777]" data-notes-none>Nothing in your notes matches “{query.trim()}”.</Panel>}
                    {levels.map((s) => (
                        <section key={s.level} className="space-y-3" data-notes-section={s.level}>
                            <h2 className="flex items-center gap-2 pt-2 text-sm font-extrabold uppercase tracking-wider" style={{ color: toneOf(s.level).ink }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: toneOf(s.level).face }} />Section {sectionOf(s.level)} · {levelOf(s.level).label}</h2>
                            {s.units.map((u, ui) => <Unit key={u.id} unit={u} number={u.number ?? ui + 1} tone={toneOf(s.level)} lang={lang} locale={locale} />)}
                        </section>
                    ))}
                </>
            )}
        </div>
    );
}
