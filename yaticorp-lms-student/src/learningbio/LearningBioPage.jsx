/**
 * The full My Learning Bio page: About Me, Learning Journey, Skills,
 * Courses, Certificates, Projects, Achievements, Interests — every section
 * read live from the LMS, the bio written from the same data.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, PenLine, RefreshCw, Settings, ArrowLeft, Route, Brain, BookOpen, Award, Rocket, Trophy, Heart, Check, ChevronRight, Flag } from 'lucide-react';
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

export default function LearningBioPage() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState('');     // 'regenerate' | 'refresh' | 'interests' | ''
    const [modal, setModal] = useState('');   // 'edit' | 'settings' | ''
    const [notice, setNotice] = useState('');

    const load = useCallback(() => bioApi.full().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const act = (kind, call, doneText) => {
        setBusy(kind); setNotice('');
        return call().then((d) => { setData(d); if (doneText) setNotice(doneText); }).catch((e) => setError(e)).finally(() => setBusy(''));
    };
    const regenerate = () => act('regenerate', () => bioApi.regenerate(), 'Your bio was rewritten from today\'s learning data.');
    const refresh = () => act('refresh', () => bioApi.refresh(), 'Learning data refreshed.');
    const changeInterests = (body) => act('interests', () => bioApi.interests(body));

    if (data === undefined) return <div className="mx-auto max-w-5xl pb-12"><Analyzing /></div>;
    if (!data) return <div className="mx-auto max-w-5xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;

    const bio = data.bio;
    const generating = busy === 'regenerate';

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-12 animate-fade-in">
            <Link to="/#learning-bio" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Dashboard</Link>

            {/* ── Header ───────────────────────────────────────────── */}
            <header className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-500 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Avatar src={data.user.avatar} name={data.user.name} size="h-20 w-20" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">✨ My Learning Bio</p>
                        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{data.user.name}</h1>
                        <p className="text-sm font-semibold text-indigo-100">{bio.headline || (data.learningGoal ? `Aspiring ${data.learningGoal}` : 'Learner on YATICORP LMS')}</p>
                        <div className="mt-3 max-w-md rounded-2xl bg-white/15 p-3 backdrop-blur"><BioStrength percent={data.strength.percent} compact /><p className="mt-1.5 text-xs text-indigo-50">{data.strength.nextStep}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col">
                        <Btn icon={RefreshCw} onClick={refresh} loading={busy === 'refresh'} className="border-white/40 bg-white/15 text-white hover:bg-white/25">Refresh Learning Data</Btn>
                        <Btn icon={Settings} onClick={() => setModal('settings')} className="border-white/40 bg-white/15 text-white hover:bg-white/25">Bio Settings</Btn>
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} onRetry={load} />}
            {notice && <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"><Check size={15} /> {notice}</p>}

            {/* ── A. About Me: photo on the left, a first-person story on the right ── */}
            <Section id="about" icon={Sparkles} title="About Me"
                hint={bio.source === 'custom' ? `Your own wording · edited ${new Date(bio.custom.editedAt).toLocaleDateString('en-IN')}` : bio.ai.generatedAt ? `${bio.ai.isMock ? 'Written from your learning data' : `Written by AI (${data.ai.model}) from your learning data`} · ${new Date(bio.ai.generatedAt).toLocaleDateString('en-IN')}${bio.ai.stale ? ' · data has changed since' : ''}` : ''}
                action={<div className="flex flex-wrap gap-2"><Btn icon={Sparkles} onClick={regenerate} loading={generating}>Regenerate Bio</Btn><Btn icon={PenLine} onClick={() => setModal('edit')}>Edit Bio</Btn></div>}>
                {(
                    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="mx-auto w-full max-w-[260px] md:mx-0">
                            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-md ring-1 ring-indigo-100">
                                {data.user.avatar
                                    ? <img src={data.user.avatar} alt={data.user.name} className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full flex-col items-center justify-center text-indigo-400"><Avatar name={data.user.name} size="h-24 w-24" /><Link to="/" className="mt-3 text-xs font-bold text-indigo-600 hover:underline">Add a photo on your profile</Link></div>}
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
                                            <Link to={label === 'Recommended next' ? `/preview/${c.id}` : `/learn/${c.id}`} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 transition-colors hover:border-indigo-200 hover:bg-indigo-50">
                                                <Icon size={14} className={`shrink-0 ${tone}`} /><span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                                                {typeof c.percentage === 'number' && !c.completed && <span className="text-xs tabular-nums text-slate-500">{c.percentage}%</span>}
                                            </Link>
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
        </div>
    );
}
