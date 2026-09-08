/** A shared Learning Bio, read by anyone with the link. Public fields only. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Brain, BookOpen, Award, Rocket, Trophy, Heart } from 'lucide-react';
import client from '../utils/api';
import SkillProgress from './SkillProgress';
import CertificateList from './CertificateList';
import ProjectList from './ProjectList';
import AchievementBadges from './AchievementBadges';
import InterestTags from './InterestTags';
import { Section, Avatar, ErrorBox, Analyzing } from './ui';
import BioText from './BioText';

export default function SharedBioPage() {
    const { code } = useParams();
    const [data, setData] = useState(undefined);
    useEffect(() => {
        client.get(`/learning-bio/public/${code}`).then((r) => setData(r.data)).catch((e) => setData({ error: e.response?.data?.message || 'This Learning Bio is not available.' }));
    }, [code]);
    if (data === undefined) return <div className="mx-auto max-w-4xl p-6"><Analyzing label="Loading Learning Bio…" /></div>;
    if (data.error) return <div className="mx-auto max-w-4xl p-6"><ErrorBox error={{ message: data.error }} /></div>;
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-5">
                <header className="flex items-center gap-4 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
                    <Avatar src={data.user.avatar} name={data.user.name} size="h-16 w-16" />
                    <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">✨ Learning Bio · YATICORP LMS</p><h1 className="text-2xl font-black text-slate-900">{data.user.name}</h1><p className="text-sm font-semibold text-indigo-700">{data.bio.headline}</p></div>
                </header>
                <Section icon={Sparkles} title={`Hi! I'm ${data.user.name.split(' ')[0]}.`}><BioText text={data.bio.bio} /></Section>
                <Section icon={Brain} title="Skills"><SkillProgress skills={data.skills} /></Section>
                <Section icon={BookOpen} title="Completed courses">{data.courses.completed.length ? <ul className="grid gap-1.5 sm:grid-cols-2">{data.courses.completed.map((c) => <li key={c.title} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">✓ {c.title}</li>)}</ul> : <p className="text-sm text-slate-500">None yet.</p>}</Section>
                <Section icon={Award} title="Certificates"><CertificateList certificates={data.certificates.map((c, i) => ({ ...c, id: String(i), source: 'lms' }))} /></Section>
                <Section icon={Rocket} title="Projects"><ProjectList projects={data.projects.map((p, i) => ({ ...p, id: String(i), status: 'Completed' }))} /></Section>
                <Section icon={Trophy} title="Achievements"><AchievementBadges achievements={data.achievements.map((a, i) => ({ ...a, id: String(i) }))} /></Section>
                <Section icon={Heart} title="Interests"><InterestTags interests={data.interests} /></Section>
            </div>
        </div>
    );
}
