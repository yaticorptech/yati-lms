/**
 * Linguistic Ability — the notepad (2026-10-29), opened from the pen on the Writing tab. The student's own
 * notes, whatever they want to keep: what they learnt, new words, sentences. A word-processor toolbar (bold,
 * italic, underline, strike, headings, size, colour, highlight, lists, alignment, indent, quote, undo, redo,
 * clear formatting), and Save, Edit, Clear and Delete. Kept on the server (/linguistic/notes), so they follow
 * the student to any device. What is shown is cleaned to a short list of tags and styles first.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Plus, Save, Pencil, Trash2, Eraser, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, Quote, Undo2, Redo2, RemoveFormatting,
    Highlighter, Baseline, StickyNote, ArrowLeft
} from 'lucide-react';
import { linguisticApi } from './api';

const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'H1', 'H2', 'H3', 'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SPAN', 'FONT', 'SUB', 'SUP', 'HR']);
const STYLES = ['color', 'background-color', 'text-align', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'margin-left', 'padding-left'];

/** Only the tags and styles the toolbar makes; everything else is unwrapped or dropped. */
const clean = (html) => {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const walk = (node) => {
        [...node.childNodes].forEach((c) => {
            if (c.nodeType === 3) return;
            if (c.nodeType !== 1) { c.remove(); return; }
            walk(c);
            if (!TAGS.has(c.tagName)) {
                if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'svg', 'MATH'].includes(c.tagName)) c.remove();
                else c.replaceWith(...c.childNodes);
                return;
            }
            const keep = { style: STYLES.map((p) => [p, c.style.getPropertyValue(p)]).filter(([, v]) => v && !/url\(|expression/i.test(v)), color: c.tagName === 'FONT' && c.getAttribute('color'), size: c.tagName === 'FONT' && c.getAttribute('size') };
            [...c.attributes].forEach((a) => c.removeAttribute(a.name));
            if (keep.style.length) c.setAttribute('style', keep.style.map(([p, v]) => `${p}: ${v}`).join('; '));
            if (keep.color && /^#?[\w(),.\s%]+$/.test(keep.color)) c.setAttribute('color', keep.color);
            if (keep.size && /^[1-7]$/.test(keep.size)) c.setAttribute('size', keep.size);
        });
    };
    walk(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
};
const textOf = (html) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '';
const countOf = (html) => textOf(html).trim().split(/\s+/).filter(Boolean).length;
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** The note's own look: headings, lists, quotes, the placeholder. */
const CSS = `
.note-body:empty::before { content: attr(data-placeholder); color: #a8b0bd; pointer-events: none; }
.note-body h1 { font-size: 1.9em; font-weight: 800; line-height: 1.2; margin: .6em 0 .3em; }
.note-body h2 { font-size: 1.45em; font-weight: 800; line-height: 1.25; margin: .6em 0 .3em; }
.note-body h3 { font-size: 1.2em; font-weight: 800; margin: .5em 0 .25em; }
.note-body p, .note-body div { margin: 0 0 .35em; }
.note-body ul { list-style: disc; padding-left: 1.6em; margin: .3em 0; }
.note-body ol { list-style: decimal; padding-left: 1.6em; margin: .3em 0; }
.note-body blockquote { border-left: 4px solid #7dd3fc; background: #f0f9ff; padding: .4em .9em; margin: .5em 0; border-radius: 0 .5em .5em 0; color: #334155; }
.note-body b, .note-body strong { font-weight: 800; }
.note-body i, .note-body em { font-style: italic; }
.note-body u { text-decoration: underline; }
.note-body s, .note-body strike { text-decoration: line-through; }
`;

const COLORS = ['#1f2937', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#4f46e5', '#9333ea', '#db2777'];
const MARKS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa', '#e9d5ff'];

function Tool({ icon: Icon, label, onClick, active }) {
    return (
        <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Icon size={16} />
        </button>
    );
}
const Bar = () => <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;

function Swatches({ icon, label, colors, onPick }) {
    const [open, setOpen] = useState(false);
    return (
        <span className="relative">
            <Tool icon={icon} label={label} onClick={() => setOpen((o) => !o)} active={open} />
            {open && (
                <span className="absolute left-0 top-9 z-20 grid w-max grid-cols-5 gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    {colors.map((c) => <button key={c} type="button" aria-label={`${label} ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setOpen(false); }} className="h-6 w-6 rounded-md ring-1 ring-black/10 hover:scale-110" style={{ background: c }} />)}
                    {label === 'Highlight' && <button type="button" aria-label="No highlight" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick('transparent'); setOpen(false); }} className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-slate-400 ring-1 ring-black/10">✕</button>}
                </span>
            )}
        </span>
    );
}

/** The word-processor toolbar; each button runs on the editor's selection. */
function Toolbar({ run, state }) {
    return (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5" data-note-toolbar>
            <Tool icon={Undo2} label="Undo" onClick={() => run('undo')} />
            <Tool icon={Redo2} label="Redo" onClick={() => run('redo')} />
            <Bar />
            <select aria-label="Text style" value={state.block} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => run('formatBlock', e.target.value)}
                className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700">
                <option value="p">Normal</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>
            </select>
            <select aria-label="Text size" value={state.size} onChange={(e) => run('fontSize', e.target.value)}
                className="ml-1 h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700">
                <option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option>
            </select>
            <Bar />
            <Tool icon={Bold} label="Bold (Ctrl+B)" onClick={() => run('bold')} active={state.bold} />
            <Tool icon={Italic} label="Italic (Ctrl+I)" onClick={() => run('italic')} active={state.italic} />
            <Tool icon={Underline} label="Underline (Ctrl+U)" onClick={() => run('underline')} active={state.underline} />
            <Tool icon={Strikethrough} label="Strikethrough" onClick={() => run('strikeThrough')} active={state.strike} />
            <Swatches icon={Baseline} label="Text colour" colors={COLORS} onPick={(c) => run('foreColor', c)} />
            <Swatches icon={Highlighter} label="Highlight" colors={MARKS} onPick={(c) => run('hiliteColor', c)} />
            <Bar />
            <Tool icon={List} label="Bullet list" onClick={() => run('insertUnorderedList')} active={state.ul} />
            <Tool icon={ListOrdered} label="Numbered list" onClick={() => run('insertOrderedList')} active={state.ol} />
            <Tool icon={Outdent} label="Decrease indent" onClick={() => run('outdent')} />
            <Tool icon={Indent} label="Increase indent" onClick={() => run('indent')} />
            <Tool icon={Quote} label="Quote" onClick={() => run('formatBlock', state.block === 'blockquote' ? 'p' : 'blockquote')} active={state.block === 'blockquote'} />
            <Bar />
            <Tool icon={AlignLeft} label="Align left" onClick={() => run('justifyLeft')} active={state.align === 'left'} />
            <Tool icon={AlignCenter} label="Centre" onClick={() => run('justifyCenter')} active={state.align === 'center'} />
            <Tool icon={AlignRight} label="Align right" onClick={() => run('justifyRight')} active={state.align === 'right'} />
            <Tool icon={AlignJustify} label="Justify" onClick={() => run('justifyFull')} active={state.align === 'full'} />
            <Bar />
            <Tool icon={RemoveFormatting} label="Clear formatting" onClick={() => { run('removeFormat'); run('formatBlock', 'p'); }} />
        </div>
    );
}

const EMPTY = { block: 'p', size: '3', align: 'left' };
const BTN = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition-colors disabled:opacity-40';

export default function Notepad({ onClose }) {
    const [notes, setNotes] = useState(null);
    const [error, setError] = useState(null);
    const [current, setCurrent] = useState(null);       // the note open: { id?, title, html }
    const [editing, setEditing] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(null);
    const [state, setState] = useState(EMPTY);
    const [words, setWords] = useState(0);
    const [list, setList] = useState(true);             // phones: the list, or the note
    const ed = useRef(null);

    const open = useCallback((n, edit) => {
        setCurrent(n); setEditing(edit); setDirty(false); setSaved(null); setList(false);
        if (ed.current) ed.current.innerHTML = clean(n.html);
        setWords(countOf(n.html));
    }, []);

    useEffect(() => {
        linguisticApi.notes()
            .then((d) => { setNotes(d.notes); if (d.notes[0]) { setCurrent(d.notes[0]); setEditing(false); setWords(countOf(d.notes[0].html)); } else { setCurrent({ title: '', html: '' }); setEditing(true); } })
            .catch((e) => { setError(e.message); setNotes([]); setCurrent({ title: '', html: '' }); });
    }, []);
    // The editor's content follows the note opened (set here once it is on the page).
    useEffect(() => { if (ed.current && current) ed.current.innerHTML = clean(current.html); }, [current?.id, notes === null]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const confirmLeave = () => !dirty || window.confirm('You have changes that are not saved. Leave without saving?');
    const close = () => { if (confirmLeave()) onClose(); };

    const refresh = () => {
        if (!ed.current) return;
        const q = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
        let block = 'p';
        try { block = (document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '') || 'p'; } catch { /* not supported */ }
        let size = '3';
        try { size = String(document.queryCommandValue('fontSize') || '3'); } catch { /* not supported */ }
        setState({
            bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'),
            ul: q('insertUnorderedList'), ol: q('insertOrderedList'),
            align: q('justifyCenter') ? 'center' : q('justifyRight') ? 'right' : q('justifyFull') ? 'full' : 'left',
            block: ['h1', 'h2', 'h3', 'blockquote'].includes(block) ? block : 'p', size: ['2', '3', '4', '5', '6'].includes(size) ? size : '3'
        });
    };
    const changed = () => {
        setDirty(true); setSaved(null);
        setWords((ed.current?.innerText || '').trim().split(/\s+/).filter(Boolean).length);
        refresh();
    };
    const run = (cmd, value) => {
        // The toolbar is always there (asked 2026-10-29): a tool on a saved note opens it for editing first.
        if (!editing) { setEditing(true); if (ed.current) ed.current.contentEditable = 'true'; }
        ed.current?.focus();
        document.execCommand('styleWithCSS', false, cmd === 'hiliteColor' || cmd === 'foreColor');
        document.execCommand(cmd, false, value);
        changed();
    };

    const save = async () => {
        if (!current || !editing || busy) return;
        const html = clean(ed.current?.innerHTML || '');
        const body = { title: (current.title || '').trim() || textOf(html).trim().split('\n')[0].slice(0, 60) || 'Untitled note', html };
        setBusy(true); setError(null);
        try {
            const { note } = current.id ? await linguisticApi.saveNote(current.id, body) : await linguisticApi.addNote(body);
            setNotes((ns) => [note, ...(ns || []).filter((n) => n.id !== note.id)]);
            setCurrent(note); setDirty(false); setSaved(Date.now()); setEditing(false);
        } catch (e) { setError(e.message); }
        setBusy(false);
    };
    const remove = async () => {
        if (!current) return;
        if (!window.confirm(`Delete "${current.title || 'this note'}"? This cannot be undone.`)) return;
        setBusy(true); setError(null);
        try {
            if (current.id) await linguisticApi.deleteNote(current.id);
            const rest = (notes || []).filter((n) => n.id !== current.id);
            setNotes(rest);
            if (rest[0]) open(rest[0], false); else open({ title: '', html: '' }, true);
            setList(true);
        } catch (e) { setError(e.message); }
        setBusy(false);
    };
    const clear = () => {
        if (!editing || !ed.current || (!ed.current.innerText.trim() && !current.title)) return;
        if (!window.confirm('Clear everything in this note?')) return;
        ed.current.innerHTML = '';
        setCurrent((c) => ({ ...c, title: '' }));
        changed(); ed.current.focus();
    };
    // Esc closes, Ctrl+S saves.
    useEffect(() => {
        const key = (e) => {
            if (e.key === 'Escape') close();
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    });
    const fresh = () => { if (confirmLeave()) { open({ title: '', html: '' }, true); setTimeout(() => ed.current?.focus(), 0); } };
    const pick = (n) => { if (n.id !== current?.id && confirmLeave()) open(n, false); else setList(false); };

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()} data-notepad>
            <style>{CSS}</style>
            <div role="dialog" aria-modal="true" aria-label="My notes" className="flex h-full w-full max-w-6xl overflow-hidden bg-white shadow-2xl sm:h-[min(92dvh,820px)] sm:rounded-3xl">
                {/* The notes */}
                <aside className={`${list ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50 md:flex md:w-72`}>
                    <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
                        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800"><StickyNote size={20} className="text-sky-600" /> My notes</h2>
                        <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 md:hidden"><X size={20} /></button>
                    </div>
                    <div className="px-3">
                        <button type="button" onClick={fresh} className={`${BTN} w-full justify-center bg-sky-600 text-white hover:bg-sky-700`} data-note-new><Plus size={17} /> New note</button>
                    </div>
                    <ul className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
                        {notes === null && <li className="px-2 py-3 text-sm font-semibold text-slate-400">Loading…</li>}
                        {notes?.length === 0 && <li className="px-2 py-3 text-sm font-semibold text-slate-400">No notes yet. Write what you learn today.</li>}
                        {notes?.map((n) => (
                            <li key={n.id}>
                                <button type="button" onClick={() => pick(n)} className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${n.id === current?.id ? 'bg-white shadow-sm ring-1 ring-sky-200' : 'hover:bg-white'}`} data-note-item>
                                    <span className="block truncate text-sm font-extrabold text-slate-800">{n.title || 'Untitled note'}</span>
                                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">{when(n.updatedAt)} · {textOf(n.html).slice(0, 60) || 'Empty'}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* The note */}
                <section className={`${list ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}>
                    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
                        <button type="button" onClick={() => setList(true)} aria-label="All notes" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"><ArrowLeft size={19} /></button>
                        <input value={current?.title || ''} onChange={(e) => { setCurrent((c) => ({ ...c, title: e.target.value })); setDirty(true); setSaved(null); }} readOnly={!editing} maxLength={120} placeholder="Title"
                            className="min-w-0 flex-1 basis-40 bg-transparent text-lg font-extrabold sm:text-xl text-slate-800 outline-none placeholder:text-slate-300" data-note-title />
                        <div className="flex items-center gap-1.5">
                            {editing
                                ? <button type="button" onClick={save} disabled={busy} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`} data-note-save><Save size={16} /> {busy ? 'Saving…' : 'Save'}</button>
                                : <button type="button" onClick={() => { setEditing(true); setTimeout(() => ed.current?.focus(), 0); }} className={`${BTN} bg-sky-600 text-white hover:bg-sky-700`} data-note-edit><Pencil size={16} /> Edit</button>}
                            <button type="button" onClick={clear} disabled={!editing} title="Clear" className={`${BTN} bg-amber-50 text-amber-700 hover:bg-amber-100`} data-note-clear><Eraser size={16} /> <span className="hidden sm:inline">Clear</span></button>
                            <button type="button" onClick={remove} disabled={busy || (!current?.id && !dirty)} title="Delete" className={`${BTN} bg-rose-50 text-rose-600 hover:bg-rose-100`} data-note-delete><Trash2 size={16} /> <span className="hidden sm:inline">Delete</span></button>
                            <button type="button" onClick={close} aria-label="Close" className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 md:flex"><X size={20} /></button>
                        </div>
                    </header>
                    <Toolbar run={run} state={state} />
                    <div className="flex-1 overflow-y-auto bg-[#fbfbf8]">
                        <div ref={ed} contentEditable={editing} suppressContentEditableWarning spellCheck
                            onInput={changed} onKeyUp={refresh} onMouseUp={refresh}
                            onPaste={(e) => { e.preventDefault(); const h = e.clipboardData.getData('text/html'); document.execCommand('insertHTML', false, h ? clean(h) : e.clipboardData.getData('text/plain').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')); changed(); }}
                            data-placeholder="Start writing… what you learnt today, new words, sentences to remember."
                            className={`note-body mx-auto min-h-full max-w-3xl px-5 py-6 text-[16px] leading-relaxed text-slate-800 outline-none sm:px-10 sm:py-8 ${editing ? 'cursor-text' : ''}`} data-note-body />
                    </div>
                    <footer className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 text-xs font-bold text-slate-400">
                        <span>{words} word{words === 1 ? '' : 's'}</span>
                        <span className={error ? 'text-rose-600' : saved ? 'text-emerald-600' : ''}>{error || (saved ? 'Saved' : dirty ? 'Not saved yet · Ctrl+S to save' : editing ? 'Editing' : current?.updatedAt ? `Saved ${when(current.updatedAt)}` : '')}</span>
                    </footer>
                </section>
            </div>
        </div>,
        document.body
    );
}
