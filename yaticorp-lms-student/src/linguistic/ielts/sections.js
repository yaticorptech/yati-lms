/** IELTS (2026-11-17) — the four sections, and how bands are written and named. */
import { Headphones, BookOpenText, PenLine, Mic } from 'lucide-react';

// Each section in Multilingo's own colours (meta.js COLORS), so IELTS reads as part of the section.
export const SECTIONS = [
    { id: 'listening', label: 'Listening', icon: Headphones, face: '#1CB0F6', edge: '#1899D6', light: '#DDF4FF', ink: '#1477B0', what: '2 recordings · 20 questions', minutes: 30 },
    { id: 'reading', label: 'Reading', icon: BookOpenText, face: '#58CC02', edge: '#58A700', light: '#E6F8D5', ink: '#3F7D00', what: '2 passages · 20 questions', minutes: 40 },
    { id: 'writing', label: 'Writing', icon: PenLine, face: '#CE82FF', edge: '#A568CC', light: '#F4E5FF', ink: '#8447B3', what: 'Chart report + essay · AI examiner', minutes: 60 },
    { id: 'speaking', label: 'Speaking', icon: Mic, face: '#FF9600', edge: '#E08600', light: '#FFEAD2', ink: '#B86A00', what: '3 parts · speak or type · AI examiner', minutes: 14 }
];
export const sectionOf = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];

/** A band as IELTS writes it: 6.5, 7.0. */
export const fmtBand = (b) => (typeof b === 'number' ? b.toFixed(1) : '—');

/** What a band means, in the words IELTS uses for its band scale. */
export const bandWord = (b) => (b >= 8.5 ? 'Expert' : b >= 7.5 ? 'Very good' : b >= 6.5 ? 'Competent' : b >= 5.5 ? 'Modest' : b >= 4.5 ? 'Limited' : b >= 3.5 ? 'Extremely limited' : b > 0 ? 'Intermittent' : 'Not scored');

export const CRITERIA = {
    TA: 'Task Achievement', TR: 'Task Response', CC: 'Coherence & Cohesion', LR: 'Lexical Resource', GRA: 'Grammatical Range & Accuracy', FC: 'Fluency & Coherence'
};

/** Forget what this device kept of an attempt (answers and when each section's clock started), all or one section. */
export const forgetDrafts = (attemptId, section = null) => {
    try {
        for (const sec of section ? [section] : SECTIONS.map((x) => x.id)) {
            localStorage.removeItem(`ielts:${attemptId}:${sec}`);
            localStorage.removeItem(`ielts:${attemptId}:${sec}:startedAt`);
        }
    } catch { /* storage off */ }
};
