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
import { User, Phone, Landmark, Mail, ChartNoAxesColumnIncreasing, Pencil, Camera, Loader2, Crown, ChevronRight } from 'lucide-react';
import OrganizationButton from '../organization/OrganizationButton';

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

/** One detail: an icon, its label, its value, and a chevron when the tile
 *  opens something. A dt/dd pair, so the list reads as label and value to a
 *  screen reader too. `control` is what the tile opens, laid over all of it.
 *
 *  On a phone (the card under 34rem) it is a row of one grouped list, at a
 *  smaller size — six separate cards there made a column longer than the
 *  screen. From 34rem up it is its own card. */
const Tile = ({ icon, tone, label, children, control, opens = !!control }) => (
    <div className={`group relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-3 transition-[border-color,box-shadow,background-color] @[34rem]:rounded-2xl @[34rem]:border @[34rem]:border-slate-100 @[34rem]:bg-white @[34rem]:py-3.5 @[34rem]:shadow-[0_8px_24px_-14px_rgba(67,56,202,0.35)] ${opens ? 'active:bg-slate-50 @[34rem]:hover:border-indigo-200 @[34rem]:hover:shadow-[0_12px_28px_-12px_rgba(67,56,202,0.45)]' : ''}`}>
        <span aria-hidden="true" className={`col-start-1 row-span-2 row-start-1 flex h-9 w-9 items-center justify-center rounded-xl [&>svg]:size-[18px] @[34rem]:h-11 @[34rem]:w-11 @[34rem]:rounded-2xl @[34rem]:[&>svg]:size-[22px] ${TONES[tone]}`}>
            {icon}
        </span>
        <dt className="col-start-2 row-start-1 min-w-0 text-xs text-slate-500">{label}</dt>
        {/* An email has no spaces to break at; the address breaks before its
            @ (see breakable) and only anywhere as the very last resort. */}
        <dd className="col-start-2 row-start-2 mt-0.5 min-w-0 text-sm font-bold text-indigo-950 [overflow-wrap:anywhere]">{children}{control}</dd>
        {opens && <ChevronRight size={16} aria-hidden="true" className="col-start-3 row-span-2 row-start-1 text-slate-400 transition-transform group-hover:translate-x-0.5 @[34rem]:text-slate-500" />}
    </div>
);

/** An email address that may wrap before its @, never in the middle of a word. */
const breakable = (email) => {
    const at = email.indexOf('@');
    return at > 0 ? <>{email.slice(0, at)}<wbr />{email.slice(at)}</> : email;
};

/** A profile page on a lavender rise, with a gear, a plant and two sparkles. */
const ProfileArt = ({ className = '' }) => (
    <svg viewBox="0 0 260 300" className={className} aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="pi-wave" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#eef0ff" />
                <stop offset="1" stopColor="#d9dcfb" />
            </linearGradient>
        </defs>
        <path d="M0 300 C 40 290, 56 214, 118 176 C 170 144, 214 150, 260 96 L 260 300 Z" fill="url(#pi-wave)" />

        {/* the violet sparkle, high on the right */}
        <path d="M224 44 L229 58 L243 63 L229 68 L224 82 L219 68 L205 63 L219 58 Z" fill="#6d5dfc" />

        {/* the profile page, tilted */}
        <g transform="rotate(10 160 170)">
            <rect x="96" y="80" width="130" height="176" rx="14" fill="#e3e7fb" />
            <rect x="90" y="74" width="130" height="176" rx="14" fill="#ffffff" />
            <circle cx="122" cy="106" r="10" fill="#8b7cf6" />
            <path d="M104 134 C 104 120, 140 120, 140 134 Z" fill="#8b7cf6" />
            <g fill="#dfe3f5">
                <rect x="150" y="100" width="54" height="8" rx="4" />
                <rect x="150" y="118" width="40" height="8" rx="4" />
                <rect x="104" y="152" width="96" height="8" rx="4" />
                <rect x="104" y="172" width="80" height="8" rx="4" />
                <rect x="104" y="192" width="90" height="8" rx="4" />
            </g>
        </g>

        {/* the gear */}
        <g transform="translate(96 160)">
            <g fill="#4f7df3">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <rect key={a} x="-5" y="-26" width="10" height="12" rx="2" transform={`rotate(${a})`} />
                ))}
                <circle r="19" />
            </g>
            <circle r="8" fill="#dbe6ff" />
        </g>

        {/* the amber sparkle, low on the left. Everything on this side is
            kept clear of the tiles that end just beside the picture. */}
        <path d="M92 214 L97 228 L111 233 L97 238 L92 252 L87 238 L73 233 L87 228 Z" fill="#fbbf6a" />

        {/* the plant, in front */}
        <g fill="#3f9d4c">
            <path d="M210 250 C 190 214, 186 180, 196 144 C 210 180, 214 214, 210 250 Z" />
            <path d="M210 250 C 222 208, 236 180, 258 160 C 250 196, 232 226, 210 250 Z" />
        </g>
        <g fill="#5cb85c">
            <path d="M210 250 C 202 206, 208 164, 226 128 C 230 172, 222 212, 210 250 Z" />
            <path d="M210 250 C 190 236, 172 222, 160 196 C 184 206, 200 226, 210 250 Z" />
        </g>
        <path d="M188 246 L232 246 L226 298 L194 298 Z" fill="#ffffff" />
        <rect x="184" y="240" width="52" height="10" rx="4" fill="#f7f7fb" stroke="#e8e8f4" />
    </svg>
);

export default function PersonalInfoCard({ user, level, levelTo, editing, onEdit, onViewPhoto, onChangePhoto, uploadingPhoto, children }) {
    const photo = user?.profilePicture;
    const initials = (user?.name || '').trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
    // Name, phone, email and ID all open Edit Profile, where they are changed
    // (the ID is shown there, read-only).
    const edit = (label) => <button type="button" onClick={onEdit} aria-label={`Edit Profile: ${label}`} className={STRETCH} />;

    // Laid out by the card's own width, not the window's: the sidebar comes and
    // goes, and the page stops growing at 80rem. Three tiles to a row need about
    // 16rem each ("+ Add organization", a 12-digit ID); the picture needs about
    // 6rem more beside them, which the card has only at its full width (75rem
    // inside its border).
    return (
        <section data-personal-info aria-labelledby="personal-info-title"
            className="@container relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-white to-indigo-50/80 shadow-sm">
            {/* The profile page and plant, when the card has room for them */}
            {!editing && <ProfileArt className="pointer-events-none absolute bottom-0 right-0 hidden w-[175px] @[75rem]:block" />}

            {/* Edit Profile beside the heading at every size. On a phone it is
                the pencil alone, at the top right (its name is still there for
                a screen reader); from 34rem up it carries its label. */}
            <div className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-7">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100/80 text-violet-500 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <User size={24} fill="currentColor" strokeWidth={1.5} className="size-5 sm:size-6" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="personal-info-title" className="text-[17px] font-extrabold leading-tight tracking-tight text-indigo-950 sm:text-2xl">Personal Information</h2>
                        <p className="mt-0.5 text-xs text-slate-500 sm:text-base">Manage your profile information</p>
                    </div>
                </div>
                {!editing && (
                    <button type="button" onClick={onEdit} title="Edit Profile"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-[13px] font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:from-violet-700 hover:to-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 @[34rem]:h-auto @[34rem]:w-auto @[34rem]:rounded-lg @[34rem]:px-3 @[34rem]:py-1.5">
                        <Pencil size={13} aria-hidden="true" className="size-4 @[34rem]:size-[13px]" />
                        <span className="sr-only @[34rem]:not-sr-only">Edit Profile</span>
                    </button>
                )}
            </div>

            <div className="relative px-4 pb-4 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
                {editing ? children : (
                    <div className="flex flex-col items-center gap-4 @[48rem]:flex-row @[48rem]:items-stretch @[48rem]:gap-6 @[75rem]:pr-[100px]">
                        {/* Level, photo, name — the student at a glance. On a phone
                            and a narrow card: the photo with the name, the line and
                            the level beside it, in one row. From 48rem: a column,
                            the level over the photo, with a rule between it and
                            the details. */}
                        <div className="flex w-full min-w-0 items-center gap-4 @[48rem]:w-52 @[48rem]:shrink-0 @[48rem]:flex-col @[48rem]:justify-center @[48rem]:gap-0 @[48rem]:border-r @[48rem]:border-slate-200/80 @[48rem]:pr-7 @[48rem]:text-center">
                            <span className="relative z-10 -mb-2 hidden items-center gap-1 rounded-full bg-gradient-to-r from-pink-50 to-violet-50 px-3 py-0.5 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-violet-100 @[48rem]:inline-flex">
                                <Crown size={14} fill="currentColor" className="text-amber-400" aria-hidden="true" /> Level {level}
                            </span>
                            <div className="relative shrink-0">
                                <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                                    aria-label={photo ? 'View your photo' : undefined}
                                    className="block h-20 w-20 overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-violet-100 via-fuchsia-100 to-violet-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-200 focus:outline-none focus-visible:ring-indigo-400 disabled:cursor-default @[34rem]:h-24 @[34rem]:w-24 @[48rem]:h-36 @[48rem]:w-36 @[48rem]:border-4">
                                    {photo
                                        ? <img src={photo} alt={user?.name || ''} className="h-full w-full object-cover" />
                                        : <span className="flex h-full w-full items-center justify-center text-3xl font-black text-violet-600 @[48rem]:text-5xl">{initials}</span>}
                                </button>
                                <button type="button" onClick={onChangePhoto} disabled={uploadingPhoto}
                                    className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-500 shadow-lg ring-1 ring-slate-100 transition-transform hover:scale-110 disabled:opacity-60 @[48rem]:bottom-0.5 @[48rem]:right-0.5 @[48rem]:h-11 @[48rem]:w-11"
                                    title="Change photo or avatar" aria-label="Change photo or avatar">
                                    {uploadingPhoto
                                        ? <Loader2 size={20} className="size-4 animate-spin @[48rem]:size-5" />
                                        : <Camera size={19} fill="currentColor" stroke="#ffffff" strokeWidth={1.6} className="size-[15px] @[48rem]:size-[19px]" />}
                                </button>
                            </div>
                            <div className="min-w-0 flex-1 @[48rem]:w-full @[48rem]:flex-none">
                                <p className="max-w-full text-lg font-bold leading-tight text-indigo-950 [overflow-wrap:anywhere] @[48rem]:mt-3 @[48rem]:text-xl">{user?.name || 'Your name'}</p>
                                {/* In the column, one line, the sprout included: centred,
                                    it may run a little past the column on either side
                                    rather than wrap. */}
                                <p className="mt-1 text-xs text-slate-600 @[48rem]:mt-0.5 @[48rem]:whitespace-nowrap @[48rem]:text-sm">Learning to grow every day <span aria-hidden="true">🌱</span></p>
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-50 to-violet-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 ring-1 ring-violet-100 @[48rem]:hidden">
                                    <Crown size={12} fill="currentColor" className="text-amber-400" aria-hidden="true" /> Level {level}
                                </span>
                            </div>
                        </div>

                        {/* Across the rows: Name, Phone, Email | ID, Organization, Level */}
                        {/* A phone: one grouped list, rows split by hairlines. From 34rem:
                            separate tiles, two to a row, three from 68rem. */}
                        <dl className="grid w-full min-w-0 flex-1 grid-cols-1 content-center divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_24px_-14px_rgba(67,56,202,0.35)] @[34rem]:grid-cols-2 @[34rem]:gap-3.5 @[34rem]:divide-y-0 @[34rem]:overflow-visible @[34rem]:rounded-none @[34rem]:border-0 @[34rem]:bg-transparent @[34rem]:shadow-none @[68rem]:grid-cols-3">
                            <Tile icon={<User size={22} fill="currentColor" strokeWidth={1.5} />} tone="blue" label="Full Name" control={edit('Full Name')}>{user?.name || '—'}</Tile>
                            <Tile icon={<Phone size={20} fill="currentColor" strokeWidth={1.5} />} tone="green" label="Phone Number" control={edit('Phone Number')}>{user?.phone || 'Not added yet'}</Tile>
                            <Tile icon={<Mail size={22} strokeWidth={2.2} />} tone="pink" label="Email" control={edit('Email')}>{user?.email ? breakable(user.email) : 'Not added yet'}</Tile>
                            <Tile icon={<ShieldDot size={22} />} tone="violet" label="User ID" control={edit('User ID')}>{user?.cardNumber || '—'}</Tile>
                            {/* The same control as before, drawn as a value: it
                                still opens the popup for linking an organization,
                                and stretches over the tile itself. */}
                            <Tile icon={<Landmark size={22} strokeWidth={2.4} />} tone="amber" label="Organization/College" opens><OrganizationButton variant="plain" /></Tile>
                            <Tile icon={<ChartNoAxesColumnIncreasing size={22} strokeWidth={3.2} />} tone="chart" label="Level"
                                control={levelTo ? <Link to={levelTo} aria-label="Level: open Career Path" className={STRETCH} /> : undefined}>Level {level}</Tile>
                        </dl>
                    </div>
                )}
            </div>
        </section>
    );
}
