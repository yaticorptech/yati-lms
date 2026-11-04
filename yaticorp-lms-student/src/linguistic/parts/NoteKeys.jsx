/**
 * The notepad's keyboard (2026-10-29, "select any language keyboard… it must be switchable"): every language the
 * section teaches, picked from the Keyboard menu, its keys in a floating window. The lessons' keys (LetterKeys: Kannada, Hindi and the
 * other Indian scripts, Urdu, Arabic, Russian, Japanese kana, Korean that joins into syllables) are given a text box
 * that is really the note's cursor (`useNoteCursor`); English and the other Latin languages get a full QWERTY with
 * Shift (and their accents), Chinese its most common characters.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigUp, CornerDownLeft, Delete, GripHorizontal, Minus, Plus, X } from 'lucide-react';
import LetterKeys from './LetterKeys';
import { LAYOUTS } from './letters';
import { LANGS, isRtl } from '../meta';

const LATIN = ['en', 'es', 'fr', 'de', 'pt'];
const QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const DIGITS = '1234567890';
const PUNCT = ['.', ',', '?', '!', "'", '"', '-', ':', ';', '(', ')'];
// The characters a beginner meets first (no pinyin input here: thousands of characters).
const HANZI = [...new Set([...'我你他她们是不的了在有这那个人大小中国好学生老师书水火山日月天上下来去吃喝看说听写读家朋友爸妈哥姐弟妹男女多少几年今明昨早晚时分点钟号星期名字叫什么谁哪里儿和很也都会能想要喜欢爱请谢对起没关系再见你好一二三四五六七八九十百千万钱块买卖开车飞机火车站路东西南北左右前后里外'])];
const HANZI_MARKS = ['，', '。', '？', '！', '、', '：', '“', '”'];

/** The last letters before the note's cursor, in the same run of text — what Korean, kana marks and deletes work on. */
const readCursor = (editor) => {
    const sel = window.getSelection();
    if (!editor || !sel?.rangeCount || !editor.contains(sel.anchorNode)) return { inside: false, before: '', collapsed: true };
    const r = sel.getRangeAt(0);
    const node = r.startContainer;
    const before = r.collapsed && node.nodeType === 3 ? node.data.slice(Math.max(0, r.startOffset - 4), r.startOffset) : '';
    return { inside: true, before, collapsed: r.collapsed };
};

/**
 * The note's cursor as a text box: `value` is the few letters before it; a change to them is written back at the
 * cursor — the letters that changed are selected and replaced, so Korean ㄱ + ㅏ becomes 가 in place.
 */
function useNoteCursor(editorRef, onStart) {
    const [at, setAt] = useState({ inside: false, before: '', collapsed: true });
    useEffect(() => {
        const on = () => { const c = readCursor(editorRef.current); if (c.inside) setAt(c); };
        document.addEventListener('selectionchange', on);
        return () => document.removeEventListener('selectionchange', on);
    }, [editorRef]);
    /** The cursor in the note (at its end if it is not there yet), ready to type. */
    const ready = useCallback(() => {
        const el = editorRef.current;
        if (!el) return null;
        onStart?.();
        el.focus();
        const c = readCursor(el);
        if (!c.inside) {
            const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            return readCursor(el);
        }
        return c;
    }, [editorRef, onStart]);
    /** Replaces the last `drop` letters before the cursor with `text`. */
    const write = useCallback((drop, text) => {
        const sel = window.getSelection();
        if (drop > 0 && sel.rangeCount) {
            const r = sel.getRangeAt(0);
            if (r.startContainer.nodeType === 3 && r.startOffset >= drop) { r.setStart(r.startContainer, r.startOffset - drop); sel.removeAllRanges(); sel.addRange(r); }
        }
        if (text) document.execCommand('insertText', false, text);
        else document.execCommand('delete');
    }, []);
    const type = useCallback((text) => { if (ready()) write(0, text); }, [ready, write]);
    const erase = useCallback(() => { if (ready()) document.execCommand('delete'); }, [ready]);
    // What LetterKeys is given: the letters before the cursor, and where the cursor is in them.
    const box = {
        value: at.collapsed ? at.before : '',
        inputRef: { current: { get selectionStart() { return at.collapsed ? at.before.length : 0; }, get selectionEnd() { return at.collapsed ? at.before.length : 0; }, focus: () => editorRef.current?.focus(), setSelectionRange: () => {} } },
        onChange: (next) => {
            const c = ready();
            if (!c) return;
            const old = c.collapsed ? c.before : '';
            if (next === old) { document.execCommand('delete'); return; }          // Delete with nothing before it here
            let same = 0;
            while (same < old.length && same < next.length && old[same] === next[same]) same += 1;
            write(old.length - same, next.slice(same));
        }
    };
    return { box, type, erase };
}

const KEY = 'flex h-10 min-w-0 items-center justify-center rounded-lg bg-[var(--k-bg)] text-base font-semibold text-[var(--k)] shadow-[0_2px_0_var(--k-ring)] ring-1 ring-[var(--k-ring)] transition-colors hover:brightness-125 active:translate-y-px active:shadow-none sm:h-11 sm:text-lg';

/** One dark keyboard, white letters (2026-10-31). */
const paint = () => ({ '--k': '#ffffff', '--k-bg': '#334155', '--k-soft': '#3f4c63', '--k-ring': '#0f172a', '--k-bar': '#0f172a', '--k-win': '#1e293b', '--k-strong': '#38bdf8' });

/*
 * Kannada for the note (2026-10-31, "I want to write ಅಲ್ಲಿ, I'm not able"): every key types straight at the note's
 * cursor, so a word is built as tapped — ಅ, ಲ, ್ (join), ಲ, ಿ = ಅಲ್ಲಿ. The other Indian scripts, Urdu, Arabic and
 * Russian the same, from their layouts.
 */
const KN_ROWS = [
    { label: 'Vowels', keys: [...'ಅಆಇಈಉಊಋಎಏಐಒಓಔ'] },
    { label: 'Signs', sign: true, keys: ['ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ', '್'] },
    { label: 'Consonants', keys: [...'ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳ'] },
    { label: 'More', keys: ['ಕ್ಷ', 'ಜ್ಞ', 'ಶ್ರ', 'ತ್ರ', 'ೞ', 'ಱ'] }
];
const VIRAMA = /^[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D]$/;

function ScriptKeys({ code, type, erase }) {
    const rows = code === 'kn' ? KN_ROWS : LAYOUTS[code] || [];
    return (
        <div className="space-y-2" lang={code} data-script-keys={code}>
            {rows.map((r) => (
                <div key={r.label}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{r.label}</p>
                    <div className="flex flex-wrap gap-1">
                        {r.keys.map((k) => {
                            const join = r.sign && VIRAMA.test(k);
                            return (
                                <button key={k} type="button" onMouseDown={hold} onClick={() => type(k)} aria-label={join ? 'Join letters' : `Letter ${k}`} title={join ? 'Join: ಲ + ್ + ಲ = ಲ್ಲ' : undefined}
                                    className={`${KEY} min-w-11 flex-col px-2 ${r.sign ? '!bg-[var(--k-soft)]' : ''} ${join ? '!bg-sky-500 !text-white' : ''}`}>
                                    <span>{r.sign ? `◌${k}` : k}</span>
                                    {join && <span className="text-[9px] font-extrabold leading-none" lang="en">join</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="flex gap-1">
                <button type="button" onMouseDown={hold} onClick={() => type(' ')} className={`${KEY} flex-1 text-sm`}>Space</button>
                <button type="button" onMouseDown={hold} onClick={() => document.execCommand('insertParagraph')} aria-label="New line" className={`${KEY} w-12 shrink-0`}><CornerDownLeft size={18} /></button>
                <button type="button" onMouseDown={hold} onClick={erase} aria-label="Delete one letter" className={`${KEY} shrink-0 gap-1 px-3 text-sm`}><Delete size={17} /> Delete</button>
            </div>
        </div>
    );
}
const hold = (e) => e.preventDefault();

/** English, Spanish, French, German, Portuguese: QWERTY with Shift, digits, punctuation, and the language's accents. */
function LatinKeys({ code, type, erase }) {
    const [shift, setShift] = useState(false);
    const cap = (k) => (shift ? k.toUpperCase() : k);
    const press = (k) => { type(cap(k)); setShift(false); };
    const extra = code === 'en' ? [] : (LAYOUTS[code] || []).flatMap((r) => r.keys);
    return (
        <div className="space-y-1.5" lang={code} data-latin-keys={code}>
            {extra.length > 0 && (
                <div className="flex flex-wrap gap-1" data-accents>
                    {extra.map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => press(k)} className={`${KEY} w-9 sm:w-10`}>{cap(k)}</button>)}
                </div>
            )}
            <div className="grid grid-cols-10 gap-1">{[...DIGITS].map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => type(k)} className={KEY}>{k}</button>)}</div>
            {QWERTY.map((row, i) => (
                <div key={row} className="flex justify-center gap-1">
                    {i === 2 && <button type="button" onMouseDown={hold} onClick={() => setShift((s) => !s)} aria-pressed={shift} aria-label="Shift" className={`${KEY} w-12 shrink-0 ${shift ? '!bg-sky-100 text-sky-700' : ''}`}><ArrowBigUp size={20} /></button>}
                    {[...row].map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => press(k)} className={`${KEY} w-[9.4%] max-w-14`}>{cap(k)}</button>)}
                    {i === 2 && <button type="button" onMouseDown={hold} onClick={erase} aria-label="Delete one letter" className={`${KEY} w-12 shrink-0`}><Delete size={18} /></button>}
                </div>
            ))}
            <div className="flex gap-1">
                {PUNCT.map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => type(k)} className={`${KEY} hidden w-9 shrink-0 sm:flex`}>{k}</button>)}
                <button type="button" onMouseDown={hold} onClick={() => type('.')} className={`${KEY} w-10 shrink-0 sm:hidden`}>.</button>
                <button type="button" onMouseDown={hold} onClick={() => type(',')} className={`${KEY} w-10 shrink-0 sm:hidden`}>,</button>
                <button type="button" onMouseDown={hold} onClick={() => type(' ')} className={`${KEY} flex-1 text-sm`}>Space</button>
                <button type="button" onMouseDown={hold} onClick={() => document.execCommand('insertParagraph')} aria-label="New line" className={`${KEY} w-12 shrink-0`}><CornerDownLeft size={18} /></button>
            </div>
        </div>
    );
}

/** Chinese: its most common characters, and its punctuation. */
function HanziKeys({ type, erase }) {
    return (
        <div className="space-y-1.5" lang="zh" data-hanzi-keys>
            <div className="grid grid-cols-10 gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))]">{HANZI.map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => type(k)} className={KEY}>{k}</button>)}</div>
            <div className="flex gap-1">
                {HANZI_MARKS.map((k) => <button key={k} type="button" onMouseDown={hold} onClick={() => type(k)} className={`${KEY} w-9 shrink-0`}>{k}</button>)}
                <button type="button" onMouseDown={hold} onClick={() => type(' ')} className={`${KEY} flex-1 text-sm`}>Space</button>
                <button type="button" onMouseDown={hold} onClick={erase} aria-label="Delete one letter" className={`${KEY} w-12 shrink-0`}><Delete size={18} /></button>
            </div>
        </div>
    );
}

const PICKED = 'lingo-note-keys';
const SIZED = 'lingo-note-keys-width';
const store = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
const recall = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
/** The language the keyboard opened in last time. */
export const rememberedKeys = () => (LANGS[recall(PICKED)] ? recall(PICKED) : 'en');

const BASE = 640;                   // the keys are laid out this wide, then zoomed to the window's width
const MIN = 280;
const maxWidth = () => Math.min(window.innerWidth - 8, 1100);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Follows the pointer from a press until it is let go (mouse and touch alike). */
const follow = (e, move) => {
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    const on = (ev) => move(ev.clientX - x0, ev.clientY - y0);
    const off = () => { window.removeEventListener('pointermove', on); window.removeEventListener('pointerup', off); window.removeEventListener('pointercancel', off); };
    window.addEventListener('pointermove', on);
    window.addEventListener('pointerup', off);
    window.addEventListener('pointercancel', off);
};

/**
 * The keyboard (2026-10-31, "like the sticky keyboard on laptops"): a window of its own over the page — dragged by
 * its bar anywhere on the screen, made bigger or smaller from its corner (or −/+), closed with ×. It opens at the
 * bottom of the screen, not attached to the note; the language is switched from its bar.
 */
export default function NoteKeys({ code, onCode, editorRef, onStart, onClose }) {
    const { box, type, erase } = useNoteCursor(editorRef, onStart);
    const win = useRef(null);
    const [width, setWidth] = useState(() => clamp(Number(recall(SIZED)) || BASE, MIN, maxWidth()));
    const [pos, setPos] = useState(null);           // { x, y } once moved; till then at the bottom, in the middle
    const pick = onCode;
    useEffect(() => { store(PICKED, code); }, [code]);
    const resize = (w) => { const n = clamp(Math.round(w), MIN, maxWidth()); setWidth(n); store(SIZED, String(n)); };
    // Kept on the screen when the window gets smaller.
    useEffect(() => {
        const on = () => { setWidth((w) => clamp(w, MIN, maxWidth())); setPos((p) => p && { x: clamp(p.x, 0, Math.max(0, window.innerWidth - 80)), y: clamp(p.y, 0, window.innerHeight - 48) }); };
        window.addEventListener('resize', on);
        return () => window.removeEventListener('resize', on);
    }, []);
    const drag = (e) => {
        if (e.target.closest('button,select')) return;
        const r = win.current.getBoundingClientRect();
        follow(e, (dx, dy) => setPos({ x: clamp(r.left + dx, 80 - r.width, window.innerWidth - 80), y: clamp(r.top + dy, 0, window.innerHeight - 48) }));
    };
    const grow = (e) => { e.stopPropagation(); const w0 = width; follow(e, (dx, dy) => resize(w0 + Math.max(dx, dy * 1.6))); };
    const zoom = width / BASE;
    const place = pos ? { left: pos.x, top: pos.y } : { left: '50%', bottom: 12, transform: 'translateX(-50%)' };
    return createPortal(
        <div ref={win} role="dialog" aria-label="On-screen keyboard" onMouseDown={(e) => { if (!e.target.closest('select')) e.preventDefault(); }}
            className="fixed z-[90] flex flex-col overflow-hidden rounded-2xl bg-[var(--k-win)] shadow-2xl ring-2 ring-[var(--k-ring)]" style={{ ...place, width, ...paint(code) }} data-note-keys={code}>
            <div onPointerDown={drag} className="flex cursor-move touch-none select-none items-center gap-1.5 bg-[var(--k-bar)] px-2 py-1.5" data-note-keys-bar>
                <GripHorizontal size={18} className="shrink-0 text-slate-400" />
                <select aria-label="Keyboard language" value={code} onChange={(e) => pick(e.target.value)}
                    className="h-8 min-w-0 max-w-[55%] rounded-lg border border-slate-600 bg-slate-700 px-1.5 text-sm font-bold text-white" data-note-keys-lang>
                    {Object.entries(LANGS).map(([c, l]) => <option key={c} value={c}>{l.native}{l.native !== l.name ? ` · ${l.name}` : ''}</option>)}
                </select>
                <span className="flex-1" />
                <button type="button" onClick={() => resize(width - 80)} aria-label="Smaller keyboard" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white hover:bg-slate-700"><Minus size={17} /></button>
                <button type="button" onClick={() => resize(width + 80)} aria-label="Bigger keyboard" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white hover:bg-slate-700"><Plus size={17} /></button>
                <button type="button" onClick={onClose} aria-label="Close keyboard" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white hover:bg-rose-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '70vh' }}>
                <div className="p-2" style={{ width: BASE, zoom }} dir={isRtl(code) ? 'rtl' : undefined}>
                    {LATIN.includes(code) ? <LatinKeys key={code} code={code} type={type} erase={erase} />
                        : code === 'zh' ? <HanziKeys type={type} erase={erase} />
                            : code === 'ko' || code === 'ja' ? <LetterKeys key={code} code={code} {...box} />
                                : <ScriptKeys key={code} code={code} type={type} erase={erase} />}
                </div>
            </div>
            <style>{'[data-note-keys] .lingo-tile,[data-note-keys] [data-kana-tab]{background:var(--k-bg)!important;border-color:var(--k-ring)!important;color:var(--k)!important}[data-note-keys] [data-letter-keys] p,[data-note-keys] [data-key-say]{color:#94a3b8}[data-note-keys] [data-letter-keys]{background:transparent;border-color:transparent}'}</style>
            <div onPointerDown={grow} aria-label="Drag to resize" title="Drag to resize"
                className="absolute bottom-0 right-0 flex h-6 w-6 cursor-nwse-resize touch-none items-end justify-end p-1 text-slate-400" data-note-keys-resize>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 3 3 11M11 7 7 11" /></svg>
            </div>
        </div>,
        document.body
    );
}
