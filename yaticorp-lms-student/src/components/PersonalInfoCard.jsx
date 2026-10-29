/**
 * My Profile's Personal Information: the student's photo, name and level, their
 * details as a set of labelled tiles, and Edit Profile.
 *
 * Nothing here holds state. The details come from the signed-in account, the
 * handlers and the edit form from pages/Profile.jsx, which already owns the
 * photo picker, the cropper and the save — so this only decides how they look.
 * While editing, the tiles give way to the form passed in as children.
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { User, Phone, Landmark, Mail, ChartNoAxesColumnIncreasing, Pencil, Camera, Loader2, Crown, Copy, Check, Sparkles, QrCode } from 'lucide-react';
import OrganizationButton from '../organization/OrganizationButton';
import ProfileImage from './ProfileImage';

// Each tile's icon colours. Written out in full: Tailwind cannot see a class
// name assembled at runtime.
const TONES = {
    blue: 'bg-sky-100 text-blue-500',
    green: 'bg-emerald-100 text-emerald-500',
    violet: 'bg-violet-100 text-violet-500',
    amber: 'bg-amber-100 text-amber-500',
    pink: 'bg-pink-100 text-pink-500',
    chart: 'bg-blue-100 text-blue-500'
};

/** A solid shield with a white dot at its heart — the User ID's mark. */
const ShieldDot = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.5 4.5 5.4v6.2c0 4.6 3.1 8.4 7.5 9.9 4.4-1.5 7.5-5.3 7.5-9.9V5.4L12 2.5Z" fill="currentColor" />
        <circle cx="12" cy="11.8" r="2.6" fill="#ffffff" />
    </svg>
);

/** Laid over a whole tile, so the tile is the control. Inside the dd: a dl's
 *  rows may hold only labels and values. */
const STRETCH = 'absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400';

/** One detail: an icon, its label and its value. A dt/dd pair, so the list
 *  reads as label and value to a screen reader too. `control` is what the tile
 *  opens, laid over all of it. No arrow on any of them (asked 2026-10-15,
 *  "dont give arrow near name phone number ... we have edit option there"):
 *  Edit Profile at the top changes the details, so they are plain rows now.
 *
 *  On a phone (the card under 34rem) it is a row of one grouped list, at a
 *  smaller size — six separate cards there made a column longer than the
 *  screen. From 34rem up it is its own card. */
const Tile = ({ icon, tone, label, children, control, opens = !!control, action }) => (
    <div className={`group relative flex min-w-0 items-center gap-3.5 rounded-2xl px-3 py-3 transition-colors ${opens ? 'hover:bg-indigo-50/60' : ''}`}>
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl [&>svg]:size-[20px] ${TONES[tone]}`}>
            {icon}
        </span>
        <div className="min-w-0 flex-1">
            <dt className="text-[11px] font-bold tracking-[0.1em] text-slate-400 uppercase">{label}</dt>
            {/* An email has no spaces to break at; the address breaks before its
                @ (see breakable) and only anywhere as the very last resort. */}
            <dd className="mt-0.5 min-w-0 text-[15px] font-bold text-indigo-950 [overflow-wrap:anywhere]">{children}{control}</dd>
        </div>
        {action}
    </div>
);

/** An email address that may wrap before its @, never in the middle of a word. */
const breakable = (email) => {
    const at = email.indexOf('@');
    return at > 0 ? <>{email.slice(0, at)}<wbr />{email.slice(at)}</> : email;
};

/** "240100018860" as it is printed on the card: 2401 0001 8860. */
const spaced = (n = '') => String(n).replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');

/** Copy the card number, with a tick for a moment. */
const CopyId = ({ value }) => {
    const [done, setDone] = useState(false);
    if (!value) return null;
    const copy = async () => {
        try { await navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ }
    };
    return (
        <button type="button" onClick={copy} aria-label={done ? 'Copied' : 'Copy your User ID'} title={done ? 'Copied' : 'Copy'}
            className="relative z-10 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            {done ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>
    );
};

/**
 * The student's YATICORP card, drawn: the same number they scan to sign in, their name, their
 * organization and level — the profile's signature, and the thing they recognise.
 */
const LearnerPass = ({ user, level }) => (
    <div className="relative aspect-[1.586] w-full max-w-[22rem] overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-white via-indigo-50 to-fuchsia-100 p-5 shadow-[0_30px_60px_-28px_rgba(79,70,229,0.55)] ring-1 ring-indigo-100 transition-transform duration-500 [transform:perspective(900px)_rotateY(-8deg)_rotateX(4deg)] group-hover/pi:[transform:perspective(900px)_rotateY(0deg)_rotateX(0deg)]">
        <span className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/40 blur-3xl" />
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.7)_50%,transparent_65%)]" />
        <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black tracking-[0.3em] text-indigo-400">YATICORP</p>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-indigo-950">LEARNER PASS</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-950"><Crown size={10} fill="currentColor" /> LV {level}</span>
            </div>
            {/* the chip */}
            <span className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-inner ring-1 ring-amber-100/60 [background-image:linear-gradient(90deg,transparent_45%,rgba(120,72,10,0.35)_46%,rgba(120,72,10,0.35)_54%,transparent_55%),linear-gradient(to_bottom_right,#fde68a,#f59e0b)]" />
            <div>
                <div className="flex items-center gap-1">
                    <p className="font-mono text-lg font-bold tracking-[0.14em] text-indigo-950 tabular-nums"><span className="sr-only">User ID </span>{spaced(user?.cardNumber) || '•••• •••• ••••'}</p>
                    <CopyId value={user?.cardNumber} />
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-bold tracking-wide text-slate-600 uppercase">{user?.name || 'Your name'}</p>
                    {user?.createdAt && <p className="shrink-0 text-[10px] font-semibold text-slate-400">Since {new Date(user.createdAt).getFullYear()}</p>}
                </div>
            </div>
        </div>
    </div>
);

export default function PersonalInfoCard({ user, level, levelTo, editing, onEdit, onViewPhoto, onChangePhoto, uploadingPhoto, children }) {
    const photo = user?.profilePicture;
    const initials = (user?.name || '').trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
    const firstName = String(user?.name || '').trim().split(/\s+/)[0];

    return (
        <section data-personal-info aria-labelledby="personal-info-title" className="group/pi overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-34px_rgba(30,22,80,0.55)] ring-1 ring-slate-200/70">
            {/* ── The pass: who they are, on a light pearl-lavender field ─────────── */}
            <div className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-5 pt-5 pb-6 text-indigo-950 sm:px-8 sm:pt-7 sm:pb-8">
                <span aria-hidden className="pointer-events-none absolute -top-32 -left-24 -z-10 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
                <span aria-hidden className="pointer-events-none absolute -right-20 -bottom-40 -z-10 h-96 w-96 rounded-full bg-fuchsia-200/50 blur-3xl" />
                <span aria-hidden className="pointer-events-none absolute top-10 right-1/3 -z-10 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(#e0e7ff_1px,transparent_1px),linear-gradient(90deg,#e0e7ff_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />

                <div className="flex items-start justify-between gap-3">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-black tracking-[0.16em] text-indigo-700 uppercase shadow-sm ring-1 ring-indigo-100">
                        <Sparkles size={12} className="text-amber-500" /> My profile
                    </p>
                    {!editing && (
                        <button type="button" onClick={onEdit} title="Edit Profile"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-3.5 py-2 text-[13px] font-black text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
                            <Pencil size={14} aria-hidden="true" /> <span className="max-sm:sr-only">Edit Profile</span>
                        </button>
                    )}
                </div>

                <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                        {/* The photo in a lit ring, with its camera */}
                        <div className="relative shrink-0">
                            <span aria-hidden className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_200deg,#f0abfc,#818cf8,#38bdf8,#fcd34d,#f0abfc)] opacity-90 blur-[1px]" />
                            <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                                aria-label={photo ? 'View your photo' : undefined}
                                className="relative block h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-200 to-fuchsia-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-default sm:h-32 sm:w-32">
                                <ProfileImage src={photo} alt={user?.name || ''} className="h-full w-full object-cover"
                                    fallback={<span className="flex h-full w-full items-center justify-center text-4xl font-black text-violet-700">{initials}</span>} />
                            </button>
                            <button type="button" onClick={onChangePhoto} disabled={uploadingPhoto}
                                className="absolute right-0 bottom-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-600 shadow-xl ring-4 ring-white transition-transform hover:scale-110 disabled:opacity-60"
                                title="Change photo or avatar" aria-label="Change photo or avatar">
                                {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} fill="currentColor" stroke="#ffffff" strokeWidth={1.6} />}
                            </button>
                        </div>
                        <div className="min-w-0">
                            <h2 id="personal-info-title" className="sr-only">Personal Information</h2>
                            <p className="text-sm font-semibold text-slate-500">Hello{firstName ? `, ${firstName}` : ''} 👋</p>
                            <p className="mt-0.5 text-3xl leading-tight font-black tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{user?.name || 'Your name'}</p>
                            <p className="mt-1 text-sm text-slate-500">Learning to grow every day <span aria-hidden="true">🌱</span></p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                                {levelTo ? (
                                    <Link to={levelTo} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-1 text-xs font-black text-amber-950 shadow-md shadow-orange-300/50 transition-transform hover:-translate-y-0.5" aria-label={`Level ${level}: open Career Path`}>
                                        <Crown size={13} fill="currentColor" /> Level {level}
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-1 text-xs font-black text-amber-950"><Crown size={13} fill="currentColor" /> Level {level}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="hidden justify-end lg:flex"><LearnerPass user={user} level={level} /></div>
                </div>
            </div>

            {/* ── The details, or the form while editing ──────────────────────── */}
            <div className="p-3 sm:p-5">
                {editing ? <div className="p-2 sm:p-3">{children}</div> : (
                    <dl className="grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                        <Tile icon={<User size={22} fill="currentColor" strokeWidth={1.5} />} tone="blue" label="Full name">{user?.name || '—'}</Tile>
                        <Tile icon={<Phone size={20} fill="currentColor" strokeWidth={1.5} />} tone="green" label="Phone">{user?.phone || 'Not added yet'}</Tile>
                        <Tile icon={<Mail size={22} strokeWidth={2.2} />} tone="pink" label="Email">{user?.email ? breakable(user.email) : 'Not added yet'}</Tile>
                        {/* Below lg only: from lg the Learner Pass above shows the number, with its own copy. */}
                        <div className="lg:hidden"><Tile icon={<ShieldDot size={22} />} tone="violet" label="User ID" action={<CopyId value={user?.cardNumber} />}><span className="font-mono tracking-wide">{user?.cardNumber || '—'}</span></Tile></div>
                        {/* The same control as before, drawn as a value: it still opens the popup for linking an organization. */}
                        <Tile icon={<Landmark size={22} strokeWidth={2.4} />} tone="amber" label="Organization / college" opens><OrganizationButton variant="plain" /></Tile>
                        {/* The number in the card's QR code (what the scanner reads at sign-in). */}
                        <Tile icon={<QrCode size={22} strokeWidth={2.2} />} tone="violet" label="QR code number" action={<CopyId value={user?.qrNumber} />}><span className="font-mono tracking-wide">{user?.qrNumber || 'Not linked yet'}</span></Tile>
                        <Tile icon={<ChartNoAxesColumnIncreasing size={22} strokeWidth={3.2} />} tone="chart" label="Level"
                            control={levelTo ? <Link to={levelTo} aria-label="Level: open Career Path" className={STRETCH} /> : undefined}>Level {level}</Tile>
                    </dl>
                )}
            </div>
        </section>
    );
}
