import { useEffect, useState } from 'react';
import { Copy, Check, Crown, Play, LogOut, Loader2, Users, CircleCheck, Circle, Share2, Link2, WifiOff, UserMinus, Radio, Download, X } from 'lucide-react';
import { roomsApi, GROUP_GAMES } from './api';
import { drawInviteCard, inviteLink, inviteText } from './inviteCard';
import Portal from '../components/Portal';

/**
 * A Group Brain room before its game starts (GamePage shows it while the
 * room waits): the room's code to copy and share, the players with their
 * pictures and whether each is ready, Ready for a player, Start for the one
 * who made the room, and Leave. The page polls the room, so players joining
 * and getting ready show here within a second or two.
 *
 * Redesigned 2026-11-03: a game stage in depth — the game's picture tilted on
 * a glowing floor, the code as raised gold keys, seats as lifted cards — and
 * the invitation shared as a picture card (inviteCard.js) to WhatsApp,
 * Instagram or email, "Powered by YATICORP".
 *
 * The server decides everything: who may start, when, and who may join.
 * Start stays disabled here, with the reason, until it would be allowed.
 */
const PALETTE = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b'];

const Avatar = ({ src, name, i }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/80 shadow-[0_6px_14px_-4px_rgba(0,0,0,.6)]" />
        : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black text-white ring-2 ring-white/80 shadow-[0_6px_14px_-4px_rgba(0,0,0,.6)]" style={{ background: PALETTE[i % PALETTE.length] }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

/** The real WhatsApp and Instagram marks. */
const WhatsAppLogo = (props) => (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
        <circle cx="24" cy="24" r="24" fill="#25D366" />
        <path fill="#fff" d="M24 10.5a13.4 13.4 0 0 0-11.5 20.3l-1.9 6.8 7-1.8A13.4 13.4 0 1 0 24 10.5Zm0 24.4a11 11 0 0 1-5.6-1.5l-.4-.2-4.2 1.1 1.1-4-.3-.4A11 11 0 1 1 24 34.9Zm6-8.2c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2l-1 1.3c-.2.2-.4.3-.7.1a9 9 0 0 1-4.5-3.9c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7a1.3 1.3 0 0 0-1 .4 4 4 0 0 0-1.2 3 6.9 6.9 0 0 0 1.4 3.6 15.6 15.6 0 0 0 6 5.3c2.2.9 3.1 1 4.2.8.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6l-.6-.3Z" />
    </svg>
);
const InstagramLogo = (props) => (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
        <defs>
            <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
                <stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" /><stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285AEB" />
            </radialGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#ig-grad)" />
        <rect x="11" y="11" width="26" height="26" rx="8" fill="none" stroke="#fff" strokeWidth="3" />
        <circle cx="24" cy="24" r="6.2" fill="none" stroke="#fff" strokeWidth="3" />
        <circle cx="31.6" cy="16.4" r="1.9" fill="#fff" />
    </svg>
);
const GmailLogo = (props) => (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
        <circle cx="24" cy="24" r="24" fill="#fff" />
        <path fill="#4285F4" d="M10 35V18l7 5.3V35h-5a2 2 0 0 1-2-2Z" />
        <path fill="#34A853" d="M38 35V18l-7 5.3V35h5a2 2 0 0 0 2-2Z" />
        <path fill="#EA4335" d="M17 23.3V16l7 5.3 7-5.3v7.3L24 28.5Z" />
        <path fill="#FBBC04" d="M31 16v7.3l7-5.3v-2.2a2.6 2.6 0 0 0-4.2-2.1Z" />
        <path fill="#C5221F" d="M10 15.8V18l7 5.3V16l-2.8-2.1a2.6 2.6 0 0 0-4.2 1.9Z" />
    </svg>
);
const mobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** The invitation card: its picture, and WhatsApp, Instagram, Email, Download and Copy link. */
function ShareSheet({ game, info, onClose }) {
    const [blob, setBlob] = useState(null);
    const [url, setUrl] = useState('');
    const [note, setNote] = useState('');
    const label = info.label || 'Group Brain';
    const text = inviteText(label, game.code);
    const link = inviteLink(game.code);
    const host = game.seats.find((s) => s.host)?.name || '';
    useEffect(() => {
        let alive = true; let made = '';
        drawInviteCard({ game: game.game, label, blurb: info.blurb, players: info.players, code: game.code, host }).then((b) => {
            if (!alive || !b) return;
            made = URL.createObjectURL(b);
            setBlob(b); setUrl(made);
        });
        return () => { alive = false; if (made) URL.revokeObjectURL(made); };
    }, [game.game, game.code, label, info.blurb, info.players, host]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const file = () => blob && new File([blob], `${label.replace(/\W+/g, '-')}-${game.code}.png`, { type: 'image/png' });
    const download = () => {
        if (!url) return;
        Object.assign(document.createElement('a'), { href: url, download: `${label.replace(/\W+/g, '-')}-${game.code}.png` }).click();
    };
    // The card itself, through the phone's share sheet, where the browser can share pictures.
    const shareCard = async () => {
        const f = file();
        if (f && navigator.canShare?.({ files: [f] })) {
            try { await navigator.share({ files: [f], title: `${label} room`, text }); return true; } catch (e) { if (e?.name === 'AbortError') return true; }
        }
        return false;
    };
    // Each opens its own app straight away (2026-11-03): WhatsApp with the invitation and its link (the link shows as
    // a card in the chat); Instagram's chats, the invitation copied to paste; Gmail with the invitation written.
    // The card picture itself goes through More (the phone's share sheet) or Save.
    const go = (href) => { if (mobile()) window.location.href = href; else window.open(href, '_blank', 'noopener'); };
    const whatsapp = () => {
        go(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
        setNote('WhatsApp opened with the invitation.');
    };
    const instagram = () => {
        navigator.clipboard?.writeText(text).catch(() => {});
        go('https://www.instagram.com/direct/inbox/');
        setNote('Invitation copied: paste it in an Instagram chat (Save the card to send it too).');
    };
    const gmail = () => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Join my ${label} room — code ${game.code}`)}&body=${encodeURIComponent(`${text}\n\nPowered by YATICORP`)}`, '_blank', 'noopener');
        setNote('Gmail opened with the invitation.');
    };
    const more = async () => {
        if (await shareCard()) return;
        download();
        setNote('Card saved.');
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(text); setNote('Invitation copied.'); } catch { setNote(link); }
    };

    const OPT = 'flex flex-col items-center gap-1.5 rounded-2xl bg-white/[.06] px-1 py-3 text-[11px] font-bold text-white ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 disabled:opacity-40 shadow-[0_10px_20px_-10px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.12)]';
    const ICON = 'h-10 w-10 shrink-0 text-white shadow-[0_6px_12px_-4px_rgba(0,0,0,.6)] rounded-full';
    return (
        <Portal>
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md" onClick={onClose}>
                <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share invitation" data-share-options
                    className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1030] p-5 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.9)]">
                    <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"><X size={16} /></button>
                    <p className="text-lg font-black">Share the invitation</p>
                    <p className="text-xs text-slate-400">Your friends open the link, paste the code and join.</p>
                    <div className="mt-4 flex justify-center [perspective:900px]">
                        {url
                            ? <img src={url} alt={`${label} invitation, room code ${game.code}`} className="w-full rounded-2xl shadow-[0_30px_50px_-20px_rgba(0,0,0,.9)] [transform:rotateX(6deg)]" data-invite-card />
                            : <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-2xl bg-white/5"><Loader2 className="animate-spin text-slate-400" /></div>}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <button type="button" onClick={whatsapp} className={OPT} data-share-whatsapp><WhatsAppLogo className={ICON} /> WhatsApp</button>
                        <button type="button" onClick={instagram} className={OPT} data-share-instagram><InstagramLogo className={ICON} /> Instagram</button>
                        <button type="button" onClick={gmail} className={OPT} data-share-email><GmailLogo className={ICON} /> Gmail</button>
                        <button type="button" onClick={more} disabled={!blob} className={OPT} data-share-more><span className={`${ICON} flex items-center justify-center rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600`}><Share2 size={20} aria-hidden="true" /></span> More</button>
                        <button type="button" onClick={download} disabled={!blob} className={OPT} data-share-download><span className={`${ICON} flex items-center justify-center rounded-full bg-gradient-to-b from-violet-400 to-violet-700`}><Download size={20} aria-hidden="true" /></span> Save</button>
                        <button type="button" onClick={copyLink} className={OPT} data-share-copy><span className={`${ICON} flex items-center justify-center rounded-full bg-gradient-to-b from-slate-400 to-slate-600`}><Link2 size={20} aria-hidden="true" /></span> Copy link</button>
                    </div>
                    {note && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-200" role="status">{note}</p>}
                </div>
            </div>
        </Portal>
    );
}

export default function RoomLobby({ game, live, onUpdate, onLeft }) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);
    const info = GROUP_GAMES[game.game] || {};
    const me = game.you != null ? game.seats[game.you] : null;
    const min = game.minSeats; const max = game.maxSeats;
    const notReady = game.seats.filter((s) => !s.ready && !s.host);
    const away = game.seats.filter((s) => s.online === false);
    const canStart = game.host && game.seats.length >= min && !notReady.length && !away.length;
    const why = !game.host ? null
        : game.seats.length < min ? `Waiting for ${min - game.seats.length} more player${min - game.seats.length === 1 ? '' : 's'} — share the code.`
            : notReady.length ? `Waiting for ${notReady.map((s) => s.name).join(', ')} to be ready.`
                : away.length ? `${away.map((s) => s.name).join(', ')} lost connection — wait, or remove them.` : 'Everyone is ready.';
    const [art, setArt] = useState(true);

    const run = (key, fn) => {
        setBusy(key); setError('');
        return fn().then((r) => { if (r?.game?.seats) onUpdate(r.game); return r; })
            .catch((e) => setError(e.message)).finally(() => setBusy(''));
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(game.code);
        } catch {
            // No clipboard (an old browser, or not allowed): select a hidden copy instead.
            const t = document.createElement('textarea');
            t.value = game.code; document.body.appendChild(t); t.select();
            try { document.execCommand('copy'); } catch { /* the code is on screen to type */ }
            t.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <section className="relative mx-auto max-w-3xl" data-room-lobby>
            <div className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(120%_90%_at_50%_0%,#3b2a8f_0%,#171445_45%,#0a0b24_100%)] p-4 text-white shadow-[0_40px_80px_-30px_rgba(30,20,90,.9)] ring-1 ring-white/10 sm:p-7">
                {/* The stage: a light from above and a glowing floor in perspective. */}
                <span aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 [perspective:600px]">
                    <span className="absolute inset-x-[-30%] bottom-[-40%] h-full origin-bottom [transform:rotateX(70deg)] bg-[linear-gradient(rgba(167,139,250,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,.18)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_top,black,transparent)]" />
                </span>

                {/* The game, tilted toward the player. */}
                <div className="relative grid items-center gap-5 sm:grid-cols-[13rem_1fr]">
                    <div className="mx-auto w-44 [perspective:800px] sm:w-full">
                        <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700 shadow-[0_30px_40px_-18px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.15)] transition-transform duration-500 [transform:rotateY(-14deg)_rotateX(8deg)] hover:[transform:rotateY(0)_rotateX(0)]">
                            {art
                                ? <img src={`/games/group/${game.game}.jpg`} alt="" onError={() => setArt(false)} className="h-full w-full object-cover" />
                                : <span className="flex h-full w-full items-center justify-center text-7xl" aria-hidden="true">{info.emoji || '🎮'}</span>}
                            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/25" />
                        </div>
                        <span aria-hidden="true" className="mx-auto mt-2 block h-3 w-3/4 rounded-full bg-black/50 blur-md" />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-300">Group game · {info.players || `${min} to ${max} players`}</p>
                        <h2 className="mt-1 text-3xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(139,92,246,.6)] sm:text-4xl">{info.label || 'Group Brain'}</h2>
                        {info.blurb && <p className="mt-1.5 text-sm text-slate-300">{info.blurb}</p>}

                        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">Room code</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start" translate="no" data-room-code={game.code}>
                            {game.code.split('').map((ch, i) => (
                                <span key={i} className="flex h-14 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 font-mono text-3xl font-black text-amber-950 shadow-[0_6px_0_#92400e,0_14px_20px_-6px_rgba(0,0,0,.7),inset_0_2px_0_rgba(255,255,255,.7)] sm:h-16 sm:w-12">{ch}</span>
                            ))}
                        </div>
                        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                            <button type="button" onClick={copy} data-copy-code className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 shadow-[0_4px_0_#cbd5e1,0_10px_18px_-6px_rgba(0,0,0,.6)] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#cbd5e1]">
                                {copied ? <Check size={16} className="text-emerald-600" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? 'Copied!' : 'Copy code'}
                            </button>
                            <button type="button" onClick={() => setSharing(true)} data-share-invite className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-fuchsia-500 to-violet-600 px-4 text-sm font-bold text-white shadow-[0_4px_0_#5b21b6,0_10px_18px_-6px_rgba(0,0,0,.6)] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#5b21b6]">
                                <Share2 size={16} aria-hidden="true" /> Share invitation
                            </button>
                        </div>
                    </div>
                </div>

                {/* The seats. */}
                <div className="relative mt-7 rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10 backdrop-blur-sm sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-bold"><Users size={16} aria-hidden="true" /> Players</p>
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span className={`inline-flex items-center gap-1 ${live ? 'text-emerald-400' : 'text-slate-400'}`} title={live ? 'Live: changes appear instantly' : 'Reconnecting — updates every few seconds'}><Radio size={12} aria-hidden="true" /> {live ? 'Live' : 'Syncing'}</span>
                            <span data-player-count>{game.seats.length} of {max}{min === max ? '' : ` · at least ${min}`}</span>
                        </span>
                    </div>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {game.seats.map((s, i) => (
                            <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-3 shadow-[0_14px_24px_-14px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.12)] ring-1 transition-transform hover:-translate-y-0.5 ${s.ready || s.host ? 'bg-gradient-to-b from-emerald-500/25 to-emerald-700/20 ring-emerald-400/40' : 'bg-gradient-to-b from-white/10 to-white/5 ring-white/10'}`} data-lobby-seat={i}>
                                <span className="relative">
                                    <Avatar src={game.avatars?.[i]} name={s.name} i={i} />
                                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#171445] ${s.online === false ? 'bg-slate-400' : 'bg-emerald-400'}`} title={s.online === false ? 'Offline' : 'Online'} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold">{s.name}{game.you === i ? ' (you)' : ''}</span>
                                    <span className="flex items-center gap-1 text-xs font-semibold">
                                        {s.host
                                            ? <span className="inline-flex items-center gap-1 text-amber-300"><Crown size={12} aria-hidden="true" /> Host</span>
                                            : s.ready
                                                ? <span className="inline-flex items-center gap-1 text-emerald-300" data-ready><CircleCheck size={12} aria-hidden="true" /> Ready</span>
                                                : <span className="inline-flex items-center gap-1 text-slate-400"><Circle size={12} aria-hidden="true" /> Not ready</span>}
                                        {s.online === false && <span className="inline-flex items-center gap-1 text-rose-400" data-offline><WifiOff size={12} aria-hidden="true" /> offline</span>}
                                    </span>
                                </span>
                                {game.host && game.you !== i && (
                                    <button type="button" onClick={() => run('remove', () => roomsApi.remove(game.id, i))} disabled={!!busy} aria-label={`Remove ${s.name}`} title="Remove from the room"
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-40"><UserMinus size={15} /></button>
                                )}
                            </li>
                        ))}
                        {Array.from({ length: Math.max(0, max - game.seats.length) }, (_, k) => (
                            <li key={`empty-${k}`} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-white/15 px-3 py-3 text-sm text-slate-400">
                                <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/10" aria-hidden="true" /> Waiting for a player…
                            </li>
                        ))}
                    </ul>

                    {why && <p className="mt-4 text-center text-sm font-semibold text-slate-200" data-start-why>{why}</p>}
                    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-500/20 px-3 py-2 text-center text-sm font-semibold text-rose-200">{error}</p>}

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        {game.host ? (
                            <button type="button" onClick={() => run('start', () => roomsApi.start(game.id))} disabled={!canStart || !!busy} data-start-room
                                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 text-base font-black text-white shadow-[0_5px_0_#065f46,0_16px_24px_-8px_rgba(16,185,129,.6)] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#065f46] disabled:opacity-40 disabled:shadow-[0_5px_0_#065f46]">
                                {busy === 'start' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Play size={18} aria-hidden="true" />} Start game
                            </button>
                        ) : me && (
                            <button type="button" onClick={() => run('ready', () => roomsApi.ready(game.id, !me.ready))} disabled={!!busy} data-ready-toggle
                                className={`inline-flex min-h-12 items-center gap-2 rounded-2xl px-7 text-base font-black transition-transform active:translate-y-1 disabled:opacity-40 ${me.ready ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_5px_0_#065f46,0_16px_24px_-8px_rgba(16,185,129,.6)]'}`}>
                                {busy === 'ready' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />} {me.ready ? 'Not ready' : "I'm ready"}
                            </button>
                        )}
                        <button type="button" onClick={() => run('leave', () => roomsApi.leave(game.id)).then((r) => { if (r?.left) onLeft(); })} disabled={!!busy} data-leave-room
                            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-bold text-slate-200 ring-1 ring-white/15 transition-colors hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-40">
                            <LogOut size={16} aria-hidden="true" /> Leave room
                        </button>
                    </div>
                </div>
            </div>
            {sharing && <ShareSheet game={game} info={info} onClose={() => setSharing(false)} />}
        </section>
    );
}
