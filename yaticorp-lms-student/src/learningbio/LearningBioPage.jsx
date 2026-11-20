/**
 * The full My Learning Bio page: About Me, Learning Journey, Skills,
 * Courses, Certificates, Projects, Achievements, Interests — every section
 * read live from YATICORPX3, the bio written from the same data.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, PenLine, RefreshCw, Settings, ArrowLeft, Download, Route, Brain, BookOpen, Award, Rocket, Trophy, Heart, Check, ChevronRight, Flag, Loader2 } from 'lucide-react';
import { bioApi } from './api';
import BioStrength from './BioStrength';
import SkillProgress from './SkillProgress';
import LearningTimeline from './LearningTimeline';
import CertificateList from './CertificateList';
import ProjectList from './ProjectList';
import AchievementBadges from './AchievementBadges';
import InterestTags from './InterestTags';
import BioEditor from './BioEditor';
import BioSettings from './BioSettings';
import { Section, Btn, ErrorBox, Avatar, Analyzing } from './ui';
import BioText from './BioText';
import { pictureUrl } from '../native/pictures';
import CourseOutlineDialog from '../components/course/CourseOutlineDialog';
import ProfileImage from '../components/ProfileImage';
import { isWalletCancel } from '../utils/walletCharge';
import GeminiCreditTip from '../components/GeminiCreditTip';

/** The profile strength as a white ring with the number in the middle (the Learning Bio header). */
function StrengthRing({ percent = 0 }) {
    const [shown, setShown] = useState(0);
    useEffect(() => { const t = setTimeout(() => setShown(percent), 80); return () => clearTimeout(t); }, [percent]);
    const r = 28, len = 2 * Math.PI * r;
    return (
        <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
            <svg viewBox="0 0 68 68" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
                <circle cx="34" cy="34" r={r} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(len * Math.min(100, shown)) / 100} ${len}`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <span className="text-lg font-black tabular-nums">{percent}%</span>
        </div>
    );
}

/** One of the header's three actions: an icon over a short name; `primary` the white one. */
function HeaderAction({ icon: Icon, children, onClick, loading = false, primary = false }) {
    return (
        <button type="button" onClick={onClick} disabled={loading}
            className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-center text-xs font-extrabold transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-70 sm:flex-row sm:gap-2 sm:text-sm ${primary ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20' : 'bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25'}`}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
            <span className="leading-tight">{children}</span>
        </button>
    );
}

export default function LearningBioPage() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState('');     // 'regenerate' | 'refresh' | 'interests' | ''
    const [modal, setModal] = useState('');   // 'edit' | 'settings' | ''
    const [notice, setNotice] = useState('');
    // A recommended course's Preview (what is inside it). Enrolling happens on
    // the Dashboard, where the price and the wallet are shown.
    const [preview, setPreview] = useState(null);
    const navigate = useNavigate();

    const load = useCallback(() => bioApi.full().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const act = (kind, call, doneText) => {
        setBusy(kind); setNotice('');
        // Cancelled at the wallet's price (a rewrite): nothing happened, nothing to say.
        return call().then((d) => { setData(d); if (doneText) setNotice(doneText); }).catch((e) => { if (!isWalletCancel(e)) setError(e); }).finally(() => setBusy(''));
    };
    const regenerate = () => act('regenerate', () => bioApi.regenerate(), 'Your bio was rewritten from today\'s learning data.');
    const refresh = () => act('refresh', () => bioApi.refresh(), 'Learning data refreshed.');
    const changeInterests = (body) => act('interests', () => bioApi.interests(body));
    const download = () => { setBusy('download'); setNotice(''); bioApi.downloadPdf(data?.user?.name).catch((e) => { if (!isWalletCancel(e)) setError(e); }).finally(() => setBusy('')); };

    if (data === undefined) return <div className="mx-auto max-w-5xl pb-12"><Analyzing /></div>;
    if (!data) return <div className="mx-auto max-w-5xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;

    const bio = data.bio;
    const generating = busy === 'regenerate';

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-40 animate-fade-in sm:pb-12">{/* pb-40 on a phone (2026-11-16): room for the last card to scroll up clear of Yati in the corner. */}
            <Link to="/profile#your-resume" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> My Profile</Link>

            {/* ── Header ───────────────────────────────────────────── */}
            {/* Redesigned 2026-11-16 ("redesign it"): photo and name side by side, the profile strength as a ring
                with its next step, and the three actions as one row of tiles (Download the bright one). */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-5 text-white shadow-xl shadow-indigo-300/40 sm:p-7">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-2xl" />
                <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                    <div className="flex items-center gap-4">
                        <span className="rounded-[1.4rem] bg-gradient-to-br from-amber-300 via-pink-300 to-sky-300 p-[3px] shadow-lg">
                            <Avatar src={pictureUrl(data.user.avatar)} name={data.user.name} size="h-20 w-20 sm:h-24 sm:w-24" />
                        </span>
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white/90 ring-1 ring-white/25"><Sparkles size={11} /> My Learning Bio</p>
                            <h1 className="mt-1.5 text-2xl font-black leading-tight drop-shadow-sm sm:text-3xl">{data.user.name}</h1>
                            <p className="mt-0.5 text-sm font-semibold text-white/90">{bio.headline || (data.learningGoal ? `Aspiring ${data.learningGoal}` : 'Learner on YATICORPX3')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-4 ring-1 ring-white/25 backdrop-blur">
                        <StrengthRing percent={data.strength.percent} />
                        <div className="min-w-0">
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80">Profile strength</p>
                            <p className="mt-0.5 text-sm font-bold leading-snug">{data.strength.nextStep || 'Your profile is complete.'}</p>
                        </div>
                    </div>
                </div>
                <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                    <HeaderAction icon={Download} onClick={download} loading={busy === 'download'} primary>Download Bio</HeaderAction>
                    <HeaderAction icon={RefreshCw} onClick={refresh} loading={busy === 'refresh'}>Refresh data</HeaderAction>
                    <HeaderAction icon={Settings} onClick={() => setModal('settings')}>Settings</HeaderAction>
                </div>
            </header>

            {error && <ErrorBox error={error} onRetry={load} />}
            {notice && <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"><Check size={15} /> {notice}</p>}

            {/* ── A. About Me: photo on the left, a first-person story on the right ── */}
            <Section id="about" icon={Sparkles} title="About Me"
                hint={bio.source === 'custom' ? `Your own wording · edited ${new Date(bio.custom.editedAt).toLocaleDateString('en-IN')}` : bio.ai.generatedAt ? `${bio.ai.isMock ? 'Written from your learning data' : `Written by AI (${data.ai.model}) from your learning data`} · ${new Date(bio.ai.generatedAt).toLocaleDateString('en-IN')}${bio.ai.stale ? ' · data has changed since' : ''}` : ''}
                action={<div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2"><Btn icon={Sparkles} onClick={regenerate} loading={generating}>Regenerate Bio</Btn><GeminiCreditTip /></span><Btn icon={PenLine} onClick={() => setModal('edit')}>Edit Bio</Btn></div>}>
                {(
                    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="mx-auto w-full max-w-[260px] md:mx-0">
                            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-md ring-1 ring-indigo-100">
                                <ProfileImage src={data.user.avatar} alt={data.user.name} className="h-full w-full object-cover"
                                    fallback={<div className="flex h-full w-full flex-col items-center justify-center text-indigo-400"><Avatar name={data.user.name} size="h-24 w-24" /><Link to="/profile" className="mt-3 text-xs font-bold text-indigo-600 hover:underline">Add a photo on your profile</Link></div>} />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-left">Hi! I&apos;m {data.user.name.split(' ')[0]}.</h3>
                            {generating ? (
                                <div className="mt-4 space-y-3" aria-busy="true"><p className="flex items-center gap-2 text-sm font-semibold text-indigo-700"><Sparkles size={15} className="animate-pulse" /> ✨ Creating your Learning Bio…</p><div className="skeleton h-4 w-11/12 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-4 w-5/6 rounded" /></div>
                            ) : (
                                <>
                                    <blockquote className="mt-4 text-lg leading-relaxed text-slate-700">“<BioText text={bio.bio} className="inline" />”</blockquote>
                                    {bio.source === 'custom' && bio.ai.bio && (
                                        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"><summary className="cursor-pointer text-xs font-bold text-slate-500">AI-written version</summary><BioText text={bio.ai.bio} className="mt-2" /></details>
                                    )}
                                    {bio.generation?.reason === 'daily-cap' && <p className="mt-2 text-xs text-amber-700">Daily regeneration limit reached — the bio updates again tomorrow.</p>}
                                    {data.learningGoal && <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800"><Flag size={12} /> Goal: {data.learningGoal}</p>}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Section>

            <div className="grid gap-5 lg:grid-cols-2">
                {/* ── B. Learning Journey ───────────────────────────── */}
                <Section id="journey" icon={Route} title="Learning Journey" hint="Newest first. Tap an event for what it means.">
                    <LearningTimeline events={data.timeline} />
                </Section>
                {/* ── C. Skills ─────────────────────────────────────── */}
                <Section id="skills" icon={Brain} title="Skills" hint="Status is earned: Advanced needs a passed quiz or a certificate behind it.">
                    <SkillProgress skills={data.skills} />
                </Section>
            </div>

            {/* ── D. Courses ───────────────────────────────────────── */}
            <Section id="courses" icon={BookOpen} title="Courses">
                <div className="grid gap-4 md:grid-cols-3">
                    {[['Completed', data.courses.completed, 'text-emerald-700', Check], ['Currently learning', data.courses.ongoing, 'text-indigo-700', ChevronRight], ['Recommended next', data.courses.recommended, 'text-violet-700', Sparkles]].map(([label, rows, tone, Icon]) => (
                        <div key={label}>
                            <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${tone}`}>{label}</p>
                            {rows.length ? (
                                <ul className="stagger mt-2 space-y-1.5">
                                    {rows.map((c) => (
                                        <li key={c.id}>
                                            {label === 'Recommended next' ? (
                                                // Not theirs yet: what is inside it, then enrol.
                                                <button type="button" onClick={() => setPreview(c)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-800 transition-colors hover:border-indigo-200 hover:bg-indigo-50">
                                                    <Icon size={14} className={`shrink-0 ${tone}`} /><span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                                                    <span className="shrink-0 text-xs font-bold text-violet-700">Preview</span>
                                                </button>
                                            ) : (
                                                <Link to={`/learn/${c.id}`} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 transition-colors hover:border-indigo-200 hover:bg-indigo-50">
                                                    <Icon size={14} className={`shrink-0 ${tone}`} /><span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                                                    {typeof c.percentage === 'number' && !c.completed && <span className="text-xs tabular-nums text-slate-500">{c.percentage}%</span>}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="mt-2 text-sm text-slate-500">{label === 'Completed' ? 'Nothing finished yet.' : label === 'Currently learning' ? 'No course in progress.' : 'Every published course is already yours.'}</p>}
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── E. Certificates ──────────────────────────────────── */}
            <Section id="certificates" icon={Award} title="Certificates"><CertificateList certificates={data.certificates} /></Section>

            {/* ── F. Projects ──────────────────────────────────────── */}
            <Section id="projects" icon={Rocket} title="Projects" hint="Build tasks you completed on your Career Path roadmap."><ProjectList projects={data.projects} /></Section>

            {/* ── G. Achievements ──────────────────────────────────── */}
            <Section id="achievements" icon={Trophy} title="Achievements"><AchievementBadges achievements={data.achievements} /></Section>

            {/* ── H. Interests ─────────────────────────────────────── */}
            <Section id="interests" icon={Heart} title="Interests" hint="Detected from your courses, skills, projects and goal. Add or remove any."><InterestTags interests={data.interests} onChange={changeInterests} busy={busy === 'interests'} /></Section>

            {modal === 'edit' && <BioEditor bio={bio} onSave={(body) => bioApi.saveBio(body).then(setData)} onClose={() => setModal('')} />}
            {modal === 'settings' && <BioSettings settings={data.settings} onSave={(body) => bioApi.settings(body).then(setData)} onClose={() => setModal('')} />}
            {preview && (
                <CourseOutlineDialog
                    courseId={preview.id}
                    initial={{ title: preview.title }}
                    onClose={() => setPreview(null)}
                    onEnroll={() => navigate(`/?tab=available&enroll=${encodeURIComponent(preview.id)}`)}
                />
            )}
        </div>
    );
}
