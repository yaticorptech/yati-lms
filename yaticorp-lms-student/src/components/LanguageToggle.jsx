/**
 * The language menu beside the notification bell: English, हिन्दी (Hindi) or
 * ಕನ್ನಡ (Kannada). The whole platform is shown in the chosen language, from
 * our own hand-written translations (see i18n/translator.js) — no machine
 * translation. The choice is remembered on this device.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { startTranslating } from '../i18n/translator';
import './languageToggle.css';

const LANGS = [
    ['en', 'English', 'English'],
    ['hi', 'हिन्दी', 'Hindi'],
    ['kn', 'ಕನ್ನಡ', 'Kannada']
];
// Each language's own letter and colour, for its tile in the menu.
const LOOK = {
    en: { glyph: 'Aa', tile: 'from-sky-400 to-indigo-500', soft: 'bg-indigo-50' },
    hi: { glyph: 'अ', tile: 'from-amber-400 to-orange-500', soft: 'bg-orange-50' },
    kn: { glyph: 'ಕ', tile: 'from-rose-400 to-fuchsia-500', soft: 'bg-rose-50' }
};
const KEY = 'yati-language';

const read = () => { try { return localStorage.getItem(KEY) || 'en'; } catch { return 'en'; } };
const save = (code) => { try { localStorage.setItem(KEY, code); } catch { /* private mode */ } };
/** Show the page (index.html hid it until the translations are in). */
const reveal = () => document.documentElement.classList.remove('yati-tx-hide');

// Started once for the whole app, whichever of the two menus (phone, desktop) mounts first.
let started = null;
const begin = (lang) => {
    if (lang === 'en') { reveal(); return Promise.resolve(); }
    started = started || startTranslating(lang).finally(reveal);
    return started;
};

export default function LanguageToggle({ className = '' }) {
    const [lang] = useState(read);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const box = useRef(null);

    useEffect(() => { begin(lang).catch(() => setError('The translations could not load. Showing English.')); }, [lang]);

    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
    }, [open]);

    // A new language: the page starts again in it (hidden until translated).
    const choose = (code) => {
        setOpen(false);
        if (code === lang) return;
        save(code);
        window.location.reload();
    };

    const current = LANGS.find(([c]) => c === lang) || LANGS[0];
    return (
        <div ref={box} className={`relative ${className}`} translate="no">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Language: ${current[2]}`} title="Language"
                className="relative flex h-10 items-center gap-1.5 rounded-full px-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-700">
                {/* A badge of two scripts, English and Hindi, rather than a stock icon: it says "language" at a glance. */}
                <span aria-hidden="true" className="relative flex h-6 w-7 items-center justify-center" translate="no">
                    <span className="absolute top-0 left-0 flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-md bg-indigo-600 text-[0.62rem] font-black leading-none text-white">A</span>
                    <span className="absolute right-0 bottom-0 flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-md bg-white text-[0.7rem] font-black leading-none text-indigo-600 ring-1 ring-indigo-200">अ</span>
                </span>
            </button>
            {open && (
                <div role="menu" aria-label="Choose language"
                    className="lt-pop absolute right-0 top-12 z-[70] w-52 origin-top-right rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(30,27,75,0.35)] ring-1 ring-slate-900/5">
                    <p className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        <Languages size={12} aria-hidden="true" /> Language
                    </p>
                    {LANGS.map(([code, native, english], i) => {
                        const look = LOOK[code];
                        const on = lang === code;
                        return (
                            <button key={code} type="button" role="menuitemradio" aria-checked={on} onClick={() => choose(code)}
                                className={`lt-item group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${on ? look.soft : 'hover:bg-slate-50'}`}
                                style={{ animationDelay: `${0.03 + i * 0.04}s` }}>
                                <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${look.tile} text-sm font-black text-white shadow-sm transition-transform group-hover:scale-105`}>
                                    {look.glyph}
                                </span>
                                <span className="min-w-0 flex-1 leading-tight">
                                    <span className="block text-sm font-bold text-slate-800">{native}</span>
                                    {native !== english && <span className="block text-[11px] text-slate-400">{english}</span>}
                                </span>
                                {on && <Check size={15} strokeWidth={3} className="shrink-0 text-indigo-600" aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
            )}
            {error && <p role="alert" className="absolute right-0 top-12 z-[70] w-56 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow">{error}</p>}
        </div>
    );
}
