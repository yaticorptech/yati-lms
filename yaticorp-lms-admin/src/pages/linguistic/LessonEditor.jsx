/**
 * Linguistic Ability (admin) — create or edit one lesson: its place (module,
 * level, order), what students learn first, and the module's practice and
 * quiz with their answers. The server checks it before saving (validate.js)
 * and says plainly what is missing; students only ever see it published.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { INPUT, BTN, BTN2, CARD, Banner, Rows } from '../../components/orgUi';
import { MODULES, LEVELS, DIRECTIONS, blankLesson, errorOf, errorsOf, withKeys } from './shared';
import { ListArea, Field, QuestionsEditor, WordsEditor, WritingEditor, DialogueEditor, ItemsEditor, AudioField } from './editors';

const Section = ({ title, hint, children }) => (
    <section className={`${CARD} p-4 sm:p-5`}>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        <div className="mt-3 space-y-3">{children}</div>
    </section>
);

export default function LessonEditor({ id, onClose, onSaved }) {
    const isNew = id === 'new';
    const [lesson, setLesson] = useState(() => (isNew ? withKeys(blankLesson('vocabulary')) : null));
    const [loadError, setLoadError] = useState('');
    const [errors, setErrors] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState('');

    useEffect(() => {
        if (isNew) return;
        api.get(`/linguistic/admin/lessons/${id}`).then((r) => setLesson(withKeys(r.data))).catch((e) => setLoadError(errorOf(e, 'The lesson could not be loaded.')));
    }, [id, isNew]);

    if (loadError) return <div className="space-y-3"><button type="button" onClick={onClose} className={BTN2}><ArrowLeft size={15} /> All lessons</button><Banner>{loadError}</Banner></div>;
    if (!lesson) return <Rows count={5} height="h-24" />;

    const set = (patch) => setLesson((l) => ({ ...l, ...patch }));
    const setLearn = (patch) => setLesson((l) => ({ ...l, learn: { ...l.learn, ...patch } }));
    const m = lesson.module;

    const save = () => {
        setSaving(true); setErrors([]); setSaved('');
        const req = isNew ? api.post('/linguistic/admin/lessons', lesson) : api.put(`/linguistic/admin/lessons/${id}`, lesson);
        req.then((r) => { setSaved(isNew ? 'Lesson created.' : 'Changes saved.'); onSaved?.(r.data); window.scrollTo({ top: 0, behavior: 'smooth' }); })
            .catch((e) => { setErrors(errorsOf(e)); window.scrollTo({ top: 0, behavior: 'smooth' }); })
            .finally(() => setSaving(false));
    };

    return (
        <div className="space-y-4" data-lesson-editor>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={onClose} className={BTN2}><ArrowLeft size={15} /> All lessons</button>
                <button type="button" onClick={save} disabled={saving} className={BTN} data-save-lesson>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isNew ? 'Create lesson' : 'Save changes'}</button>
            </div>
            {errors.length > 0 && (
                <Banner onClose={() => setErrors([])}>
                    <span className="font-bold">Please fix {errors.length === 1 ? 'this' : 'these'} first:</span>
                    <ul className="mt-1 list-disc pl-5" data-lesson-errors>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </Banner>
            )}
            {saved && <Banner kind="success" onClose={() => setSaved('')}>{saved}</Banner>}

            <Section title="The lesson" hint="Where it sits, what it is called, and whether students can see it.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Module">
                        <select value={m} disabled={!isNew} onChange={(e) => setLesson(withKeys(blankLesson(e.target.value, lesson)))} className={INPUT}>{MODULES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    </Field>
                    <Field label="Level"><select value={lesson.level} onChange={(e) => set({ level: e.target.value })} className={INPUT}>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                    <Field label="Order in the level"><input type="number" min={1} max={999} value={lesson.order} onChange={(e) => set({ order: Number(e.target.value) })} className={INPUT} /></Field>
                    <Field label="Status"><select value={lesson.status} onChange={(e) => set({ status: e.target.value })} className={INPUT}><option value="draft">Draft (students cannot see it)</option><option value="published">Published</option></select></Field>
                </div>
                {m === 'translation' && <Field label="Direction"><select value={lesson.direction || 'kn-en'} onChange={(e) => set({ direction: e.target.value })} className={`${INPUT} sm:max-w-xs`}>{DIRECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>}
                <Field label="Title"><input value={lesson.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} className={INPUT} data-lesson-title /></Field>
                <Field label="Summary (one line)"><input value={lesson.summary} onChange={(e) => set({ summary: e.target.value })} maxLength={300} className={INPUT} /></Field>
            </Section>

            <Section title="Learn" hint="What students read first: a short explanation, the key points and examples.">
                <Field label="Introduction"><textarea value={lesson.learn.intro || ''} onChange={(e) => setLearn({ intro: e.target.value })} rows={2} className={`${INPUT} resize-y`} /></Field>
                <div className="grid gap-3 lg:grid-cols-2">
                    <ListArea label={m === 'translation' ? 'Tips (one per line)' : 'Key points or rules (one per line)'} value={lesson.learn.points} onChange={(points) => setLearn({ points })} rows={4} />
                    <ListArea label="Examples (one per line)" value={lesson.learn.examples} onChange={(examples) => setLearn({ examples })} rows={4} />
                </div>
                <Field label="A note comparing with Kannada (optional)"><input value={lesson.learn.kannadaNote || ''} onChange={(e) => setLearn({ kannadaNote: e.target.value })} className={INPUT} /></Field>
                {m === 'reading' && (
                    <>
                        <Field label="Passage title"><input value={lesson.learn.passage?.title || ''} onChange={(e) => setLearn({ passage: { ...lesson.learn.passage, title: e.target.value } })} className={INPUT} /></Field>
                        <Field label="Passage or story"><textarea value={lesson.learn.passage?.text || ''} onChange={(e) => setLearn({ passage: { ...lesson.learn.passage, text: e.target.value } })} rows={8} className={`${INPUT} resize-y`} data-passage-text /></Field>
                    </>
                )}
                {m === 'speaking' && (
                    <>
                        <DialogueEditor value={lesson.learn.dialogue} onChange={(dialogue) => setLearn({ dialogue })} />
                        <AudioField label="A recording of the whole conversation (optional)" value={lesson.learn.audio} onChange={(audio) => setLearn({ audio })} />
                        <ListArea label="Useful phrases (one per line)" value={lesson.learn.phrases} onChange={(phrases) => setLearn({ phrases })} rows={3} />
                    </>
                )}
            </Section>

            {m === 'vocabulary' && <Section title="Words" hint="The quiz, the spelling drill, the matching game and the daily challenge are made from these. At least 4 words."><WordsEditor value={lesson.words} onChange={(words) => set({ words })} /></Section>}
            {m === 'grammar' && <>
                <Section title="Practice questions" hint="Answered one at a time, with instant feedback and the explanation."><QuestionsEditor value={lesson.practice} onChange={(practice) => set({ practice })} /></Section>
                <Section title="Quiz" hint="Scored. At or above the level's passing score, the lesson is complete."><QuestionsEditor value={lesson.quiz} onChange={(quiz) => set({ quiz })} /></Section>
            </>}
            {m === 'reading' && <>
                <Section title="Comprehension questions (the quiz)"><QuestionsEditor value={lesson.quiz} onChange={(quiz) => set({ quiz })} types={['mcq', 'fill']} /></Section>
                <Section title="Writing tasks" hint="Jumbled words and sentences are checked at once. Paragraphs, emails and letters get rule-based tips and the model answer, and come to the Reviews tab."><WritingEditor value={lesson.writing} onChange={(writing) => set({ writing })} /></Section>
            </>}
            {m === 'speaking' && <>
                <Section title="Listening questions (the quiz)"><QuestionsEditor value={lesson.quiz} onChange={(quiz) => set({ quiz })} types={['mcq', 'fill']} /></Section>
                <Section title="Speaking task" hint="Students record themselves in the browser, listen back, and tick this checklist. Pronunciation is not marked automatically.">
                    <Field label="What to say"><textarea value={lesson.speaking?.prompt || ''} onChange={(e) => set({ speaking: { ...lesson.speaking, prompt: e.target.value } })} rows={2} className={`${INPUT} resize-y`} /></Field>
                    <Field label="Sample answer"><textarea value={lesson.speaking?.sample || ''} onChange={(e) => set({ speaking: { ...lesson.speaking, sample: e.target.value } })} rows={3} className={`${INPUT} resize-y`} /></Field>
                    <ListArea label="Self-assessment checklist (one per line)" value={lesson.speaking?.checklist} onChange={(checklist) => set({ speaking: { ...lesson.speaking, checklist } })} rows={4} />
                </Section>
            </>}
            {m === 'translation' && <>
                <Section title="Practice items" hint="Checked one by one: the model and accepted answers, a close match counts, and paragraphs go to the Reviews tab."><ItemsEditor value={lesson.items} onChange={(items) => set({ items })} direction={lesson.direction} /></Section>
                <Section title="Quiz items" hint="Scored, like the practice, but all at once. Words and sentences only."><ItemsEditor value={lesson.quiz} onChange={(quiz) => set({ quiz })} direction={lesson.direction} quiz /></Section>
            </>}
            <div className="flex justify-end">
                <button type="button" onClick={save} disabled={saving} className={BTN}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isNew ? 'Create lesson' : 'Save changes'}</button>
            </div>
            <p className="text-center text-[11px] text-slate-400">Students never see an answer before they answer. A saved draft stays hidden until you publish it.</p>
        </div>
    );
}
