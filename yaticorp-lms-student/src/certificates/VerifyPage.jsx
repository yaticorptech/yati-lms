/**
 * Verify a certificate (2026-11-11, the user's ask): anyone — an employer, a college — types the number the student
 * wrote in their AI passport (YATI<card>-001, the student's series) and sees whether it is genuine, whose it is,
 * what it was for, and the certificate itself. Open to everyone, no sign-in: /verify and /verify/<number>.
 *
 * It also takes the older forms — a Multilingo YATI-ENG-B-<card>, a Certificate Builder YC-XXXX-XXXX and a Group
 * Brain GB-XXXX-XXXX — so one page checks every certificate. Server: src/certificates/verify.js.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, Upload, ShieldCheck, ShieldX, ShieldAlert, Download, Link2, Check, Loader2, FileQuestion, ArrowRight, RotateCcw } from 'lucide-react';
import { pdfPageOne } from '../utils/pdfPageOne';

const API = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const tidy = (t) => String(t || '').toUpperCase().replace(/\s+/g, '').trim();
/*
 * The number as the AI passport prints it (2026-11-11): YATI, then 12 digit boxes, a hyphen and 3 more — each box
 * the book's dotted digit grid, the typed digit drawn on it. One input behind them takes the 15 digits; a whole
 * number pasted fills them all; one of the older forms pasted (YC-…, GB-…, YATI-ENG-B-…) is checked as it is.
 */
const CARD_LEN = 12, SEQ_LEN = 3, ALL = CARD_LEN + SEQ_LEN;
/*
 * "YATI" as the passport prints it: a condensed serif with wedge serifs — Roboto Serif at its narrowest, medium
 * weight (not bold, 2026-11-11). Only the four letters are fetched (Google Fonts' text=), on this page only.
 */
const YATI_FONT_URL = 'https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wdth,wght@8..144,50..150,400..600&text=YATI&display=swap';
const YATI_TYPE = { fontFamily: '"Roboto Serif", Georgia, "Times New Roman", serif', fontWeight: 500, fontVariationSettings: '"wdth" 52, "opsz" 28', letterSpacing: '-0.01em' };
const useYatiFont = () => useEffect(() => {
    if (document.querySelector('link[data-yati-font]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = YATI_FONT_URL; link.dataset.yatiFont = '1';
    document.head.appendChild(link);
}, []);
const digits = (t, n) => String(t || '').replace(/\D/g, '').slice(0, n);
const split = (t) => { const m = tidy(t).match(/^(?:YATI)?-?(\d{12})-?(\d{1,3})?$/); return m ? { card: m[1], seq: m[2] || '' } : null; };
const other = (t) => { const x = tidy(t); return /^(YC|GB)-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(x) || /^YATI-[A-Z]{2,3}-[BIA]-/.test(x) ? x : null; };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const KIND = { course: 'Course certificate', multilingo: 'Multilingo certificate', competition: 'Competition certificate', groupbrain: 'Group Brain certificate', upload: 'Uploaded certificate' };

export default function VerifyPage() {
    const { number } = useParams();
    const navigate = useNavigate();
    const [num, setNum] = useState(() => { const x = split(number); return x ? x.card + x.seq.padStart(SEQ_LEN, '0') : ''; });
    const [focused, setFocused] = useState(false);
    const [hint, setHint] = useState('');
    const [detailsFor, setDetailsFor] = useState(null);
    useYatiFont();   // the number whose details are open, on a phone
    const [state, setState] = useState({ for: null, data: null, error: '' });
    const input = useRef(null);

    useEffect(() => {
        if (!number) return undefined;
        let live = true;
        axios.get(`${API}/certificates/verify/${encodeURIComponent(number)}`)
            .then((r) => { if (live) setState({ for: number, data: r.data, error: '' }); })
            .catch((e) => { if (live) setState({ for: number, data: null, error: e.response?.status === 429 ? e.response.data?.message : 'The check could not be done just now. Please try again.' }); });
        return () => { live = false; };
    }, [number]);

    const submit = (e) => {
        e.preventDefault();
        if (num.length < CARD_LEN) { setHint('Fill in the 12-digit card number.'); input.current?.focus(); return; }
        if (num.length < ALL) { setHint('Fill in the certificate’s 3-digit number after the hyphen.'); input.current?.focus(); return; }
        setHint('');
        navigate(`/verify/${encodeURIComponent(`YATI${num.slice(0, CARD_LEN)}-${num.slice(CARD_LEN)}`)}`);
    };
    const paste = (e) => {
        const text = e.clipboardData?.getData('text') || '';
        const whole = split(text), older = !whole && other(text);
        if (!whole && !older) return;
        e.preventDefault(); setHint('');
        if (older) { navigate(`/verify/${encodeURIComponent(older)}`); return; }
        setNum(whole.card + (whole.seq ? whole.seq.padStart(SEQ_LEN, '0') : ''));
    };
    const loading = Boolean(number) && state.for !== number;
    const d = state.for === number ? state.data : null;
    const error = state.for === number ? state.error : '';
    const detailsOpen = detailsFor === number;

    return (
        <main className="flex min-h-[100dvh] flex-col bg-[#f6f4ef] text-slate-900">
            {/* The top bar, white as on the student dashboard (2026-11-11): the brand, and a way back to YATICORPX3 */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link to="/login" className="flex min-w-0 items-center gap-2.5" aria-label="YATICORPX3">
                        <img src="/assets/YATICORP-dark.png" alt="YATICORPX3" className="h-8 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </Link>
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"><ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" /><span className="sm:hidden">Verification</span><span className="hidden sm:inline">Certificate verification</span></span>
                </div>
            </header>

            {/* Before a certificate is found: the search in the middle of the page, centred (2026-11-11). */}
            <div className={`mx-auto flex w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 ${d?.found ? '' : 'items-center justify-center'}`}>
                <div className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:gap-8 ${d?.found ? 'lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10' : ''}`}>
                    <section aria-labelledby="verify-title" className={`min-w-0 ${d?.found ? 'lg:col-start-1 lg:row-start-1' : 'mx-auto w-full max-w-2xl text-center'}`}>
                        <h1 id="verify-title" className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a7b3f]">Verify a certificate</h1>
                        <p className={`mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600 ${d?.found ? 'hidden' : ''}`}>Type the certificate number from the certificate or the student’s AI passport. It starts with <span className="font-mono font-semibold text-slate-800">YATI</span> and the card number, then the certificate’s own number.</p>

                        <form onSubmit={submit} className="mt-6" role="search">
                            <label htmlFor="cert-number" className="mb-1.5 block text-xs font-bold text-slate-600 sr-only">Certificate number</label>
                            {/* As in the AI passport: YATI, 12 boxes, a hyphen, 3 boxes. Tapping anywhere on it types. */}
                            <div className={`rounded-2xl border bg-[#fbf9f4] px-3 py-3.5 shadow-sm transition-shadow sm:px-4 sm:py-4 ${focused ? 'border-[#0f1b2d] ring-4 ring-[#0f1b2d]/10' : 'border-slate-300'}`}>
                            <div className="relative min-w-0 [container-type:inline-size]">
                                <div className="flex items-center gap-[0.8cqw]" aria-hidden="true">
                                    <span className="mr-[1.2cqw] shrink-0 text-[min(10.5cqw,3.3rem)] leading-none text-[#1e2a44]" style={YATI_TYPE}>YATI</span>
                                    {Array.from({ length: ALL }, (_, i) => (
                                        <span key={i} className={`contents`}>
                                            {i === CARD_LEN && <span className="shrink-0 px-[1cqw] text-[min(6cqw,1.8rem)] font-black leading-none text-[#0f1b2d]">-</span>}
                                            <DigitBox digit={num[i]} active={focused && (i === num.length || (num.length === ALL && i === ALL - 1))} />
                                        </span>
                                    ))}
                                </div>
                                <input ref={input} id="cert-number" value={num} autoComplete="off" spellCheck={false} autoFocus={!number} inputMode="numeric" maxLength={ALL + 6}
                                    onChange={(e) => { setNum(digits(e.target.value, ALL)); setHint(''); }}
                                    onPaste={paste} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                                    aria-label="Certificate number: YATI, the 12-digit card number, then the certificate’s 3-digit number" aria-describedby="cert-number-hint"
                                    className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 focus:outline-none" />
                            </div>
                            </div>
                            <p className="mt-2 font-mono text-sm text-slate-500" aria-live="polite">{num ? `YATI${num.slice(0, CARD_LEN)}${num.length > CARD_LEN ? `-${num.slice(CARD_LEN)}` : ''}` : '\u00a0'}</p>
                            <button type="submit" disabled={loading} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f1b2d] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1c2c45] disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0f1b2d]/25">
                                {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}<span>Verify</span>
                            </button>
                            <p id="cert-number-hint" className={`mt-1.5 text-xs ${d?.found && !hint ? 'sr-only' : ''} ${hint ? 'font-semibold text-rose-600' : 'text-slate-500'}`} role={hint ? 'alert' : undefined}>{hint || 'Type the 12-digit card number, then the certificate’s 3-digit number. Pasting the whole number works too.'}</p>
                        </form>

                    </section>

                    {/* On a phone the certificate comes first, under the search, and its details open from a button
                        (2026-11-11); side by side on a wide screen. */}
                    {d?.found && <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"><div className="lg:sticky lg:top-6"><CertificateImage number={number} d={d} /></div></div>}

                    <div aria-live="polite" className={`min-w-0 text-left ${d?.found ? 'lg:col-start-1 lg:row-start-2' : 'mx-auto w-full max-w-2xl'} ${loading || error || d ? '' : 'hidden'}`}>
                        {loading && <VerdictSkeleton />}
                        {error && <Note tone="rose" icon={ShieldAlert} title="Not checked" text={error} />}
                        {d && !d.found && (
                            <Note tone="rose" icon={d.badFormat ? FileQuestion : ShieldX}
                                title={d.badFormat ? 'That is not a certificate number' : 'No certificate has this number'}
                                text={d.badFormat ? 'A number looks like YATI240100019664-001: YATI, the 12-digit card number, a hyphen and three digits.' : 'Check the number on the certificate or in the AI passport, digit by digit. A certificate that is not found here was not issued by YATICORPX3.'} />
                        )}
                        {d?.found && (
                            <>
                                <DetailsButton d={d} open={detailsOpen} onToggle={() => setDetailsFor(detailsOpen ? null : number)} />
                                <div id="verify-details" className={detailsOpen ? 'mt-3 lg:mt-0' : 'hidden lg:block'}><Verdict d={d} /></div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

/*
 * One box of the AI passport's number: the book's dotted digit grid (two squares, dots at the corners and the
 * middle), with the digit typed drawn over it in the grid's own strokes.
 */
const P = { tl: [3, 3], tr: [17, 3], ml: [3, 18], mr: [17, 18], bl: [3, 33], br: [17, 33] };
const SEG = { a: ['tl', 'tr'], b: ['tr', 'mr'], c: ['mr', 'br'], d: ['bl', 'br'], e: ['ml', 'bl'], f: ['tl', 'ml'], g: ['ml', 'mr'] };
const DIGIT = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function DigitBox({ digit, active }) {
    const on = digit != null ? DIGIT[digit] || '' : '';
    return (
        <svg viewBox="0 0 20 36" className={`aspect-[20/36] min-w-0 max-w-[36px] flex-1 rounded-[3px] transition-colors ${active ? 'bg-[#0f1b2d]/[0.07]' : ''}`}>
            {Object.entries(SEG).map(([k, [p, q]]) => <line key={k} x1={P[p][0]} y1={P[p][1]} x2={P[q][0]} y2={P[q][1]} stroke="#cbd5e1" strokeWidth="0.9" />)}
            {Object.values(P).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill="#b6b6b6" />)}
            {/* A 1 down the middle of its box, as it is written (2026-11-11), not on the right edge. */}
            {String(digit) === '1'
                ? <line x1="10" y1="3" x2="10" y2="33" stroke="#0f1b2d" strokeWidth="3" strokeLinecap="round" />
                : [...on].map((k) => { const [p, q] = SEG[k]; return <line key={`on-${k}`} x1={P[p][0]} y1={P[p][1]} x2={P[q][0]} y2={P[q][1]} stroke="#0f1b2d" strokeWidth="3" strokeLinecap="round" />; })}
            {active && <line x1="4" y1="35" x2="16" y2="35" stroke="#9a7b3f" strokeWidth="1.6" strokeLinecap="round" className="animate-pulse" />}
        </svg>
    );
}

/** On a phone: the verdict in a line, and the button that opens the details under the certificate. */
function DetailsButton({ d, open, onToggle }) {
    const self = d.selfUploaded, valid = d.valid !== false;
    const tone = self ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : valid ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900';
    const Icon = self ? Upload : valid ? ShieldCheck : ShieldX;
    return (
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="verify-details"
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0f1b2d]/15 lg:hidden ${tone}`}>
            <Icon size={22} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">{self ? 'Uploaded certificate' : valid ? 'Verified' : 'Revoked'}</span>
                <span className="block truncate text-xs opacity-80">{d.name}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold">{open ? 'Hide' : 'Details'}<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
        </button>
    );
}

/** The answer: verified (emerald seal), revoked, or a certificate the student uploaded themselves. */
function Verdict({ d }) {
    const [copied, setCopied] = useState(false);
    const valid = d.valid !== false;
    const self = d.selfUploaded;
    const copy = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* no clipboard */ }
    };
    const rows = [
        ['Awarded to', d.name],
        ['Certificate', d.title],
        d.line && ['Details', d.line],
        d.issuedBy && [self ? 'From' : 'Issued by', d.issuedBy],
        d.issuedAt && [self ? 'Dated' : 'Issued on', fmt(d.issuedAt)],
        !valid && !self && d.revokedAt && ['Revoked on', `${fmt(d.revokedAt)}${d.revokedReason ? ` — ${d.revokedReason}` : ''}`]
    ].filter(Boolean);
    return (
        <article className={`overflow-hidden rounded-3xl border bg-white shadow-[0_20px_50px_-30px_rgba(15,27,45,0.45)] ${self ? 'border-indigo-200' : valid ? 'border-emerald-200' : 'border-rose-200'}`} data-verify={self ? 'self-uploaded' : valid ? 'valid' : 'revoked'}>
            <div className={`flex items-center gap-4 px-5 py-5 sm:px-6 ${self ? 'bg-indigo-50/70' : valid ? 'bg-emerald-50/70' : 'bg-rose-50/70'}`}>
                <Seal tone={self ? 'indigo' : valid ? 'emerald' : 'rose'} />
                <div className="min-w-0">
                    <p className={`text-xl font-black leading-tight ${self ? 'text-indigo-950' : valid ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {self ? 'Uploaded certificate' : valid ? 'Verified' : 'Revoked'}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                        {self ? 'The student uploaded this certificate to their YATICORPX3 profile, where it is registered under this number.'
                            : valid ? 'This certificate was issued through YATICORPX3.' : 'This certificate was issued but is no longer valid.'}
                    </p>
                </div>
            </div>
            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
                <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">Number</dt>
                    <dd className="min-w-0 break-all text-right font-mono text-sm font-bold text-slate-900">{d.number}</dd>
                </div>
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                        <dd className="min-w-0 text-right text-sm font-semibold text-slate-900">{v}</dd>
                    </div>
                ))}
                {KIND[d.kind] && (
                    <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">Type</dt>
                        <dd className="text-right text-sm text-slate-600">{KIND[d.kind]}</dd>
                    </div>
                )}
            </dl>
            {d.nowNumbered && <p className="mx-5 mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:mx-6">This certificate’s number is now <span className="font-mono font-bold text-slate-800">{d.nowNumbered}</span>; the older number above still checks.</p>}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d]/30">
                    {copied ? <Check size={14} className="text-emerald-600" aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}{copied ? 'Link copied' : 'Copy link to this check'}
                </button>
                <Link to="/verify" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white">Check another <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
        </article>
    );
}

/** A round seal round the shield: "VERIFIED · YATICORPX3 ·" running round it, in the verdict's colour. */
function Seal({ tone }) {
    const c = { emerald: ['#047857', '#d1fae5'], rose: ['#be123c', '#ffe4e6'], indigo: ['#4338ca', '#e0e7ff'] }[tone];
    const Icon = tone === 'emerald' ? ShieldCheck : tone === 'rose' ? ShieldX : Upload;
    const words = tone === 'emerald' ? 'VERIFIED • YATICORPX3 • VERIFIED • YATICORPX3 • ' : tone === 'rose' ? 'REVOKED • YATICORPX3 • REVOKED • YATICORPX3 • ' : 'UPLOADED • YATICORPX3 • UPLOADED • YATICORPX3 • ';
    return (
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <defs><path id={`seal-${tone}`} d="M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0" /></defs>
                <circle cx="50" cy="50" r="48" fill={c[1]} />
                <circle cx="50" cy="50" r="31" fill="#fff" stroke={c[0]} strokeWidth="1.5" />
                <text fontSize="9.5" fontWeight="800" fill={c[0]} letterSpacing="0.5"><textPath href={`#seal-${tone}`} textLength="251" lengthAdjust="spacing">{words}</textPath></text>
            </svg>
            <Icon size={24} strokeWidth={2.25} style={{ color: c[0] }} className="relative" />
        </span>
    );
}

/** The certificate itself: its PDF fetched, its first page drawn as a picture; and the PDF to download. */
function CertificateImage({ number, d }) {
    const [img, setImg] = useState({ for: null, url: '', pdf: null, failed: false });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!d.hasPdf) return undefined;
        let live = true; let url = '';
        axios.get(`${API}/certificates/verify/${encodeURIComponent(number)}/pdf`, { responseType: 'blob', timeout: 60000 })
            .then(async (r) => {
                const pic = await pdfPageOne(r.data, 1600);
                if (!live) return;
                url = pic ? URL.createObjectURL(pic) : '';
                setImg({ for: number, url, pdf: r.data, failed: !pic });
            })
            .catch(() => { if (live) setImg({ for: number, url: '', pdf: null, failed: true }); });
        return () => { live = false; if (url) URL.revokeObjectURL(url); };
    }, [number, d.hasPdf, attempt]);
    const here = img.for === number;
    const download = () => {
        if (!img.pdf) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(img.pdf);
        a.download = `${d.number || 'certificate'}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };

    // A certificate the student uploaded: the picture of their file, marked as their upload.
    if (d.selfUploaded && d.imageUrl) {
        return (
            <aside aria-label="The uploaded certificate" className="min-w-0">
                {/* As the profile shows it: framed with its number on upload since 2026-11-11; an older upload gets the
                    same white frame here. */}
                {d.framed
                    ? <img src={d.imageUrl} alt={`Certificate ${d.number}, uploaded by ${d.name}: ${d.title}`} className="mx-auto max-h-[75vh] w-auto max-w-full rounded-2xl shadow-xl ring-1 ring-slate-200" referrerPolicy="no-referrer" />
                    : <NumberFrame on number={d.number}><img src={d.imageUrl} alt={`Certificate uploaded by ${d.name}: ${d.title}`} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain ring-1 ring-slate-300" referrerPolicy="no-referrer" /></NumberFrame>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs text-slate-500">Uploaded by the student to their YATICORPX3 profile.</p>
                    {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Open the file</a>}
                </div>
            </aside>
        );
    }
    if (!d.hasPdf) {
        return (
            <aside aria-label="Certificate" className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
                <p className="max-w-xs text-sm text-slate-500">{d.selfUploaded ? 'The picture of this uploaded certificate is not available.' : 'This certificate is no longer valid, so it is not shown.'}</p>
            </aside>
        );
    }
    return (
        <aside aria-label="The certificate" className="min-w-0">
            {/* The certificate on a calm surface, like paper on a desk */}
            <div className={d.selfUploaded ? '' : 'rounded-3xl bg-gradient-to-b from-[#e9e4d8] to-[#ddd6c6] p-3 shadow-inner sm:p-5'}>
                <NumberFrame on={Boolean(d.selfUploaded && !d.framed)} number={d.number}>
                <div className={`relative aspect-[842/595] w-full overflow-hidden rounded-md bg-white ${d.selfUploaded ? 'min-w-[min(40rem,calc(100vw-4.5rem))] ring-1 ring-slate-300' : 'shadow-[0_25px_50px_-20px_rgba(15,27,45,0.55)]'}`}>
                    {here && img.url ? (
                        <img src={img.url} alt={`Certificate ${d.number}, awarded to ${d.name}`} className="h-full w-full object-contain" />
                    ) : here && img.failed ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                            <p className="text-sm text-slate-500">The certificate picture could not be loaded.</p>
                            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw size={14} aria-hidden="true" />Try again</button>
                        </div>
                    ) : (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" role="status" aria-label="Loading the certificate" />
                    )}
                </div>
                </NumberFrame>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-xs text-slate-500">{d.selfUploaded ? 'Uploaded by the student to their YATICORPX3 profile.' : 'Drawn from YATICORPX3’s own record of this certificate.'}</p>
                <button type="button" onClick={download} disabled={!img.pdf || !here} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f1b2d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1c2c45] disabled:opacity-50">
                    <Download size={14} aria-hidden="true" />Download PDF
                </button>
            </div>
        </aside>
    );
}

/*
 * The white frame an uploaded certificate is shown in (the profile's UploadedFrame; the server draws the same one
 * onto the file, services/certificateFrame.js): the picture on a white card, "Certificate No. …" on its foot to the
 * right. `on` false: the picture as it is.
 */
function NumberFrame({ on, number, children }) {
    if (!on) return children;
    return (
        <div className="mx-auto w-fit max-w-full rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-slate-200 sm:p-3.5">
            {children}
            {number && <p className="mt-2.5 px-1 text-right font-mono text-[11px] font-bold tracking-wide text-slate-700 sm:text-xs">Certificate No. {number}</p>}
        </div>
    );
}

function VerdictSkeleton() {
    return (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6" role="status" aria-label="Checking">
            <div className="flex items-center gap-4"><div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-5 w-32 animate-pulse rounded bg-slate-100" /><div className="h-3 w-56 animate-pulse rounded bg-slate-100" /></div></div>
            {[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />)}
        </div>
    );
}

function Note({ tone, icon: Icon, title, text }) {
    return (
        <div role="alert" className={`flex items-start gap-3 rounded-2xl border bg-white p-5 ${tone === 'rose' ? 'border-rose-200' : 'border-slate-200'}`}>
            <Icon size={26} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
            <div><p className="font-black text-slate-900">{title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p></div>
        </div>
    );
}
