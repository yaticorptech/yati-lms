import { useState } from 'react';
import { Copy, Check, Crown, Play, LogOut, Loader2, Users, CircleCheck, Circle, Share2, MessageCircle, Link2, WifiOff, UserMinus, Radio } from 'lucide-react';
import { roomsApi, GROUP_GAMES } from './api';

/**
 * A Group Brain room before its game starts (GamePage shows it while the
 * room waits): the room's code to copy and share, the players with their
 * pictures and whether each is ready, Ready for a player, Start for the one
 * who made the room, and Leave. The page polls the room, so players joining
 * and getting ready show here within a second or two.
 *
 * The server decides everything: who may start, when, and who may join.
 * Start stays disabled here, with the reason, until it would be allowed.
 */
const PALETTE = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b'];

const Avatar = ({ src, name, i }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
        : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white ring-2 ring-white shadow" style={{ background: PALETTE[i % PALETTE.length] }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

export default function RoomLobby({ game, live, onUpdate, onLeft }) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
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

    // The invitation: a link that opens Group games and joins this room, with the code in words too.
    const link = `${window.location.origin}/games?mode=group&join=${game.code}`;
    const invite = `Join my ${info.label || 'Group Brain'} room on YATI LMS! Code: ${game.code}\n${link}`;
    const [sharing, setSharing] = useState(false);
    const share = async () => {
        if (navigator.share) {
            try { await navigator.share({ title: `${info.label || 'Group Brain'} room`, text: invite, url: link }); return; } catch (e) { if (e?.name === 'AbortError') return; }
        }
        setSharing((v) => !v);
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the code is on screen */ }
    };

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
        <section className="mx-auto max-w-2xl space-y-4" data-room-lobby>
            <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${info.tone || 'from-indigo-600 to-violet-600'} p-5 text-white shadow-lg`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Room code · {game.options?.difficulty || 'medium'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span translate="no" className="rounded-2xl bg-white/15 px-4 py-2 font-mono text-3xl font-black tracking-[0.3em] ring-1 ring-white/30 sm:text-4xl" data-room-code={game.code}>{game.code}</span>
                    <button type="button" onClick={copy} data-copy-code className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 shadow hover:bg-slate-50">
                        {copied ? <Check size={16} className="text-emerald-600" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? 'Copied!' : 'Copy code'}
                    </button>
                    <button type="button" onClick={share} data-share-invite className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/40 hover:bg-white/25">
                        <Share2 size={16} aria-hidden="true" /> Share invitation
                    </button>
                </div>
                {sharing && (
                    <div className="mt-3 flex flex-wrap gap-2" data-share-options>
                        <a href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-white"><MessageCircle size={15} aria-hidden="true" /> WhatsApp</a>
                        <button type="button" onClick={copyLink} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-slate-900"><Link2 size={15} aria-hidden="true" /> Copy invitation link</button>
                    </div>
                )}
                <p className="mt-3 text-sm text-white/85">Share this code. Your friends open Games → Group games → Join room, and paste it.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Users size={16} aria-hidden="true" /> Players</p>
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className={`inline-flex items-center gap-1 ${live ? 'text-emerald-600' : 'text-slate-400'}`} title={live ? 'Live: changes appear instantly' : 'Reconnecting — updates every few seconds'}><Radio size={12} aria-hidden="true" /> {live ? 'Live' : 'Syncing'}</span>
                        <span data-player-count>{game.seats.length} of {max}{min === max ? '' : ` · at least ${min}`}</span>
                    </span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                    {game.seats.map((s, i) => (
                        <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ${s.ready || s.host ? 'bg-emerald-50/70 ring-emerald-200' : 'bg-slate-50 ring-slate-200'}`} data-lobby-seat={i}>
                            <span className="relative">
                                <Avatar src={game.avatars?.[i]} name={s.name} i={i} />
                                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${s.online === false ? 'bg-slate-400' : 'bg-emerald-500'}`} title={s.online === false ? 'Offline' : 'Online'} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold text-slate-900">{s.name}{game.you === i ? ' (you)' : ''}</span>
                                <span className="flex items-center gap-1 text-xs font-semibold">
                                    {s.host
                                        ? <span className="inline-flex items-center gap-1 text-amber-700"><Crown size={12} aria-hidden="true" /> Host</span>
                                        : s.ready
                                            ? <span className="inline-flex items-center gap-1 text-emerald-700" data-ready><CircleCheck size={12} aria-hidden="true" /> Ready</span>
                                            : <span className="inline-flex items-center gap-1 text-slate-500"><Circle size={12} aria-hidden="true" /> Not ready</span>}
                                    {s.online === false && <span className="inline-flex items-center gap-1 text-rose-600" data-offline><WifiOff size={12} aria-hidden="true" /> offline</span>}
                                </span>
                            </span>
                            {game.host && game.you !== i && (
                                <button type="button" onClick={() => run('remove', () => roomsApi.remove(game.id, i))} disabled={!!busy} aria-label={`Remove ${s.name}`} title="Remove from the room"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><UserMinus size={15} /></button>
                            )}
                        </li>
                    ))}
                    {Array.from({ length: Math.max(0, max - game.seats.length) }, (_, k) => (
                        <li key={`empty-${k}`} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400">
                            <span className="h-11 w-11 shrink-0 rounded-full bg-slate-100" aria-hidden="true" /> Waiting for a player…
                        </li>
                    ))}
                </ul>

                {why && <p className="mt-3 text-center text-sm font-semibold text-slate-600" data-start-why>{why}</p>}
                {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700">{error}</p>}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {game.host ? (
                        <button type="button" onClick={() => run('start', () => roomsApi.start(game.id))} disabled={!canStart || !!busy} data-start-room
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-40">
                            {busy === 'start' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} Start game
                        </button>
                    ) : me && (
                        <button type="button" onClick={() => run('ready', () => roomsApi.ready(game.id, !me.ready))} disabled={!!busy} data-ready-toggle
                            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold shadow-md disabled:opacity-40 ${me.ready ? 'bg-white text-slate-700 ring-1 ring-slate-300' : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700'}`}>
                            {busy === 'ready' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />} {me.ready ? 'Not ready' : "I'm ready"}
                        </button>
                    )}
                    <button type="button" onClick={() => run('leave', () => roomsApi.leave(game.id)).then((r) => { if (r?.left) onLeft(); })} disabled={!!busy} data-leave-room
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40">
                        <LogOut size={16} aria-hidden="true" /> Leave room
                    </button>
                </div>
            </div>
        </section>
    );
}
