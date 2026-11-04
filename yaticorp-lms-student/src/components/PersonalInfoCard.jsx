/**
 * My Profile's Personal Information (redesigned 2026-10-31): a slim cover
 * band in indigo to pink with Edit Profile on it, the photo overlapping its
 * edge beside the name and level, then the details in a tight grid of small
 * labelled rows — the ID (card number) among them.
 *
 * Nothing here holds state. The details come from the signed-in account, the
 * handlers and the edit form from pages/Profile.jsx, which already owns the
 * photo picker, the cropper and the save — so this only decides how they look.
 * Edit Profile opens as a popup from pages/Profile.jsx; the details stay put behind it.
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { User, Phone, Landmark, Mail, ChartNoAxesColumnIncreasing, Pencil, Camera, Loader2, Crown, Copy, Check, IdCard } from 'lucide-react';
import OrganizationButton from '../organization/OrganizationButton';
import ProfileImage from './ProfileImage';

// Each detail's icon colours. Written out in full: Tailwind cannot see a class
// name assembled at runtime.
const TONES = {
    blue: { icon: 'bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600', hover: 'hover:ring-sky-100' },
    green: { icon: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600', hover: 'hover:ring-emerald-100' },
    violet: { icon: 'bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600', hover: 'hover:ring-violet-100' },
    amber: { icon: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600', hover: 'hover:ring-amber-100' },
    pink: { icon: 'bg-gradient-to-br from-pink-50 to-pink-100 text-pink-600', hover: 'hover:ring-pink-100' },
    chart: { icon: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600', hover: 'hover:ring-indigo-100' }
};

/** Laid over a whole detail, so the row is the control. Inside the dd: a dl's
 *  rows may hold only labels and values. */
const STRETCH = 'absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400';

/** One detail: a small icon, its label and its value — a dt/dd pair, so it
 *  reads as label and value to a screen reader too. `control` is what the row
 *  opens, laid over all of it; `action` (a copy button) sits beside the value.
 *  No arrows (asked 2026-10-15): Edit Profile at the top changes the details. */
const Tile = ({ icon, tone, label, children, control, opens = !!control, action }) => (
    // Every detail lifts a little under the pointer, its icon tilting (2026-10-31).
    <div className={`group relative flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_-16px_rgba(30,22,80,0.35)] ${TONES[tone].hover} ${opens ? 'cursor-pointer' : ''}`}>
        <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 [&>svg]:size-[17px] ${TONES[tone].icon}`}>
            {icon}
        </span>
        <div className="min-w-0 flex-1">
            <dt className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{label}</dt>
            {/* An email has no spaces to break at; the address breaks before its
                @ (see breakable) and only anywhere as the very last resort. */}
            <dd className={`min-w-0 text-sm font-semibold text-slate-800 [overflow-wrap:anywhere] ${action ? 'flex items-center gap-0.5' : ''}`}>
                {action ? <span className="min-w-0">{children}</span> : children}{control}{action && <span className="-my-2 shrink-0">{action}</span>}
            </dd>
        </div>
    </div>
);

/** An email address that may wrap before its @, never in the middle of a word. */
const breakable = (email) => {
    const at = email.indexOf('@');
    return at > 0 ? <>{email.slice(0, at)}<wbr />{email.slice(at)}</> : email;
};

/** "240100018860" as it is printed on the card: 2401 0001 8860. */
const spaced = (n = '') => String(n).replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');

/** Copy a number, with a tick for a moment. */
const CopyId = ({ value, what = 'your User ID' }) => {
    const [done, setDone] = useState(false);
    if (!value) return null;
    const copy = async () => {
        try { await navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ }
    };
    return (
        <button type="button" onClick={copy} aria-label={done ? 'Copied' : `Copy ${what}`} title={done ? 'Copied' : 'Copy'}
            className="relative z-10 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            {done ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
    );
};

export default function PersonalInfoCard({ user, level, levelTo, editing, onEdit, onViewPhoto, onChangePhoto, uploadingPhoto }) {
    const photo = user?.profilePicture;
    const initials = (user?.name || '').trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

    return (
        // A thin border whose colours drift slowly round the card (index.css, ph-frame).
        <div className="ph-frame rounded-2xl p-[1.5px] shadow-[0_18px_40px_-28px_rgba(79,70,229,0.45)]">
        <section data-personal-info aria-labelledby="personal-info-title" className="overflow-hidden rounded-[0.9rem] bg-white">
            <h2 id="personal-info-title" className="sr-only">Personal Information</h2>
            {/* ── Who they are: a cover band, the photo overlapping its edge (2026-10-31) ── */}
            <div className="relative">
                {/* The cover: a slow shimmer of indigo to pink, soft shapes floating on it. */}
                <div aria-hidden className="ph-cover relative h-16 overflow-hidden bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 sm:h-20">
                    <span className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.35)_0_1px,transparent_1px_14px)]" />
                    <span className="ph-blob pointer-events-none absolute -top-8 left-1/4 h-24 w-24 rounded-full bg-white/20 blur-xl" />
                    <span className="ph-blob ph-blob-slow pointer-events-none absolute -bottom-10 left-2/3 h-28 w-28 rounded-full bg-sky-300/30 blur-xl" />
                    <span className="ph-float pointer-events-none absolute top-3 right-[30%] h-3 w-3 rotate-45 rounded-sm bg-white/50" />
                    <span className="ph-float ph-float-slow pointer-events-none absolute bottom-3 right-[44%] h-2 w-2 rounded-full bg-amber-200/80" />
                    <span className="ph-float pointer-events-none absolute top-5 right-[58%] h-2.5 w-2.5 rounded-full border border-white/70" style={{ animationDelay: '1.2s' }} />
                </div>
                {!editing && (
                    <button type="button" onClick={onEdit} title="Edit Profile"
                        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/50 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:top-4 sm:right-5">
                        <Pencil size={13} aria-hidden="true" /> <span className="max-sm:sr-only">Edit Profile</span>
                    </button>
                )}

                <div className="relative flex items-end gap-4 px-4 pb-3 sm:gap-5 sm:px-6">
                    {/* The photo, overlapping the cover, in a slowly turning ring of colour, with its camera */}
                    <div className="relative -mt-9 shrink-0 animate-pop-in sm:-mt-11">
                        <span aria-hidden className="ph-ring absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,#a78bfa,#f472b6,#fbbf24,#34d399,#38bdf8,#a78bfa)]" />
                        <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                            aria-label={photo ? 'View your photo' : undefined}
                            className="relative block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-violet-200 to-fuchsia-200 shadow-lg transition-transform duration-300 hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-default disabled:hover:scale-100 sm:h-[5.25rem] sm:w-[5.25rem]">
                            <ProfileImage src={photo} alt={user?.name || ''} className="h-full w-full object-cover"
                                fallback={<span className="flex h-full w-full items-center justify-center text-xl font-black text-violet-700">{initials}</span>} />
                        </button>
                        <button type="button" onClick={onChangePhoto} disabled={uploadingPhoto}
                            className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-indigo-600 shadow ring-1 ring-slate-200 transition-transform hover:scale-110 disabled:opacity-60"
                            title="Change photo or avatar" aria-label="Change photo or avatar">
                            {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                        </button>
                    </div>

                    <div className="min-w-0 flex-1 pt-2 animate-fade-in-up">
                        <p className="text-xs font-medium text-slate-500">Hello <span aria-hidden="true" className="ph-wave">👋</span></p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <p className="ph-name min-w-0 truncate bg-gradient-to-r from-indigo-800 via-violet-600 to-fuchsia-600 bg-clip-text pb-0.5 text-xl leading-tight font-bold tracking-tight text-transparent sm:text-2xl">{user?.name || 'Your name'}</p>
                            {levelTo ? (
                                <Link to={levelTo} className="shine-loop inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-200" aria-label={`Level ${level}: open Career Path`}>
                                    <Crown size={11} fill="currentColor" /> Level {level}
                                </Link>
                            ) : (
                                <span className="shine-loop inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><Crown size={11} fill="currentColor" /> Level {level}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── The details, or the form while editing — on a faint dotted ground ── */}
            <div className="relative px-2 py-2 sm:px-4 sm:py-3">
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                {/* The details stay while Edit Profile is open: it is a popup now (pages/Profile.jsx). */}
                {(
                    <dl className="stagger relative grid grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                        <Tile icon={<User strokeWidth={2.2} />} tone="blue" label="Full name">{user?.name || '—'}</Tile>
                        <Tile icon={<Phone strokeWidth={2.2} />} tone="green" label="Phone">{user?.phone || 'Not added yet'}</Tile>
                        <Tile icon={<Mail strokeWidth={2.2} />} tone="pink" label="Email">{user?.email ? breakable(user.email) : 'Not added yet'}</Tile>
                        {/* The same control as before, drawn as a value: it still opens the popup for linking an organization. */}
                        <Tile icon={<Landmark strokeWidth={2.2} />} tone="amber" label="Organization / college" opens><OrganizationButton variant="plain" /></Tile>
                        {/* Their YATICORP card number, as printed on the card — what they sign in with
                            (in place of the QR code number, 2026-10-31). */}
                        <Tile icon={<IdCard strokeWidth={2.2} />} tone="violet" label="ID" action={<CopyId value={user?.cardNumber} />}><span className="font-mono tracking-wider">{user?.cardNumber ? spaced(user.cardNumber) : '—'}</span></Tile>
                        <Tile icon={<ChartNoAxesColumnIncreasing strokeWidth={2.6} />} tone="chart" label="Level"
                            control={levelTo ? <Link to={levelTo} aria-label="Level: open Career Path" className={STRETCH} /> : undefined}>Level {level}</Tile>
                    </dl>
                )}
            </div>
        </section>
        </div>
    );
}
