/**
 * The language menu beside the notification bell: English, हिन्दी (Hindi) or
 * ಕನ್ನಡ (Kannada). The whole platform is shown in the chosen language, from
 * our own hand-written translations (see i18n/translator.js) — no machine
 * translation. The choice is remembered on this device.
 */
import { useEffect, useRef, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { startTranslating } from '../i18n/translator';

const LANGS = [
    ['en', 'English', 'English'],
    ['hi', 'हिन्दी', 'Hindi'],
    ['kn', 'ಕನ್ನಡ', 'Kannada']
];
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
                <Languages size={20} aria-hidden="true" />
                <span className="text-xs font-bold uppercase">{current[0]}</span>
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-12 z-[70] w-48 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl">
                    {LANGS.map(([code, native, english]) => (
                        <button key={code} type="button" role="menuitemradio" aria-checked={lang === code} onClick={() => choose(code)}
                            className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${lang === code ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>
                            <span><span className="block">{native}</span>{native !== english && <span className="block text-[11px] font-normal text-slate-400">{english}</span>}</span>
                            {lang === code && <Check size={16} aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
            {error && <p role="alert" className="absolute right-0 top-12 z-[70] w-56 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow">{error}</p>}
        </div>
    );
}
