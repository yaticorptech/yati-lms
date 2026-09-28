/**
 * My Profile's Personal Information: the student's photo, name and level, their
 * details as a set of labelled tiles, and Edit Profile.
 *
 * Nothing here holds state. The details come from the signed-in account, the
 * handlers and the edit form from pages/Profile.jsx, which already owns the
 * photo picker, the cropper and the save — so this only decides how they look.
 * While editing, the tiles give way to the form passed in as children.
 */
import { User, Phone, Landmark, Mail, ChartNoAxesColumnIncreasing, Pencil, Camera, Loader2, Crown } from 'lucide-react';
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

/** One detail: an icon, its label, its value. A dt/dd pair, so the list reads
 *  as label and value to a screen reader too. */
const Tile = ({ icon, tone, label, children }) => (
    <div className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-3 rounded-2xl border border-slate-100 bg-white/90 px-3.5 py-3 shadow-sm">
        <span aria-hidden="true" className={`row-span-2 flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
            {icon}
        </span>
        <dt className="min-w-0 text-xs text-slate-500">{label}</dt>
        {/* An email has no spaces to break at, so let it break anywhere
            rather than push the tile wider than its column. */}
        <dd className="mt-0.5 min-w-0 text-sm font-bold text-indigo-950 [overflow-wrap:anywhere]">{children}</dd>
    </div>
);

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

        {/* sparkles: violet high on the right, amber low on the left */}
        <path d="M224 44 L229 58 L243 63 L229 68 L224 82 L219 68 L205 63 L219 58 Z" fill="#6d5dfc" />
        <path d="M40 176 L45 190 L59 195 L45 200 L40 214 L35 200 L21 195 L35 190 Z" fill="#fbbf6a" />

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
        <g transform="translate(84 160)">
            <g fill="#4f7df3">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <rect key={a} x="-5" y="-26" width="10" height="12" rx="2" transform={`rotate(${a})`} />
                ))}
                <circle r="19" />
            </g>
            <circle r="8" fill="#dbe6ff" />
        </g>

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

export default function PersonalInfoCard({ user, level, editing, onEdit, onViewPhoto, onChangePhoto, uploadingPhoto, children }) {
    const photo = user?.profilePicture;
    const initials = (user?.name || '').trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

    return (
        <section data-personal-info aria-labelledby="personal-info-title"
            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-white to-indigo-50/80 shadow-sm">
            {/* The profile page and plant, on screens with room for them */}
            {!editing && <ProfileArt className="pointer-events-none absolute bottom-0 right-0 hidden w-[230px] xl:block" />}

            <div className="relative flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100/80 text-violet-500">
                        <User size={22} fill="currentColor" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                        <h2 id="personal-info-title" className="text-lg font-extrabold tracking-tight text-indigo-950 sm:text-xl">Personal Information</h2>
                        <p className="text-xs text-slate-500 sm:text-sm">Manage your profile information</p>
                    </div>
                </div>
                {!editing && (
                    <button type="button" onClick={onEdit}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-colors hover:from-violet-700 hover:to-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
                        <Pencil size={15} aria-hidden="true" /> Edit Profile
                    </button>
                )}
            </div>

            <div className="relative px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
                {editing ? children : (
                    <div className="flex flex-col items-center gap-6 xl:flex-row xl:gap-7 xl:pr-[210px]">
                        {/* Level, photo, name — the student at a glance */}
                        <div className="flex w-44 shrink-0 flex-col items-center text-center">
                            <span className="relative z-10 -mb-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-50 to-violet-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 shadow-sm ring-1 ring-violet-100">
                                <Crown size={13} fill="currentColor" className="text-amber-400" aria-hidden="true" /> Level {level}
                            </span>
                            <div className="relative">
                                <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                                    aria-label={photo ? 'View your photo' : undefined}
                                    className="block h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-100 via-fuchsia-100 to-violet-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-200 focus:outline-none focus-visible:ring-indigo-400 disabled:cursor-default">
                                    {photo
                                        ? <img src={photo} alt={user?.name || ''} className="h-full w-full object-cover" />
                                        : <span className="flex h-full w-full items-center justify-center text-4xl font-black text-violet-600">{initials}</span>}
                                </button>
                                <button type="button" onClick={onChangePhoto} disabled={uploadingPhoto}
                                    className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-500 shadow-lg ring-1 ring-slate-100 transition-transform hover:scale-110 disabled:opacity-60"
                                    title="Change photo or avatar" aria-label="Change photo or avatar">
                                    {uploadingPhoto
                                        ? <Loader2 size={20} className="animate-spin" />
                                        : <Camera size={18} fill="currentColor" stroke="#ffffff" strokeWidth={1.6} />}
                                </button>
                            </div>
                            <p className="mt-2.5 max-w-full text-lg font-bold text-indigo-950 [overflow-wrap:anywhere]">{user?.name || 'Your name'}</p>
                            {/* One line, the sprout included: centred, it may run a little
                                past the column on either side rather than wrap. */}
                            <p className="mt-0.5 whitespace-nowrap text-xs text-slate-600">Learning to grow every day <span aria-hidden="true">🌱</span></p>
                        </div>

                        {/* Down the columns: Name, ID, Email | Phone, Organization, Level */}
                        <dl className="grid w-full min-w-0 flex-1 grid-cols-1 gap-3 md:grid-flow-col md:grid-cols-2 md:grid-rows-3 md:gap-4">
                            <Tile icon={<User size={20} fill="currentColor" strokeWidth={1.5} />} tone="blue" label="Full Name">{user?.name || '—'}</Tile>
                            <Tile icon={<ShieldDot size={20} />} tone="violet" label="User ID">{user?.cardNumber || '—'}</Tile>
                            <Tile icon={<Mail size={20} strokeWidth={2.2} />} tone="pink" label="Email">{user?.email || 'Not added yet'}</Tile>
                            <Tile icon={<Phone size={18} fill="currentColor" strokeWidth={1.5} />} tone="green" label="Phone Number">{user?.phone || 'Not added yet'}</Tile>
                            {/* The same control as before, drawn as a value: it
                                still opens the popup for linking an organization. */}
                            <Tile icon={<Landmark size={20} strokeWidth={2.4} />} tone="amber" label="Organization/College"><OrganizationButton variant="plain" /></Tile>
                            <Tile icon={<ChartNoAxesColumnIncreasing size={20} strokeWidth={3.2} />} tone="chart" label="Level">Level {level}</Tile>
                        </dl>
                    </div>
                )}
            </div>
        </section>
    );
}
