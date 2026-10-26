/**
 * Research — for a teacher who has both the organisation dashboard and the
 * teacher dashboard. Their teacher-dashboard tools as tabs along the top, each
 * opening that page of the teacher dashboard below, signed in as their own
 * teacher account (the server hands this panel a teacher session for it:
 * GET /organizations/me/research-session). The teacher dashboard lives in the
 * student app; it opens there at /teacher/sso, in its embedded layout.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FlaskConical, LayoutDashboard, Route, BookMarked, FileText, PenLine, ShieldCheck, Users, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import { PageHeader, Segmented, Banner, Rows, CARD } from '../../components/orgUi';

const STUDENT_PORTAL = import.meta.env.VITE_STUDENT_URL || 'http://localhost:5174';
// The teacher dashboard's pages, as tabs: [tab, teacher-dashboard path, label, icon].
const TOOLS = [
    ['overview', '/teacher', 'Overview', LayoutDashboard],
    ['methods', '/teacher/methods', 'Methodologies', FlaskConical],
    ['path', '/teacher/research-path', 'Research Path', Route],
    ['publications', '/teacher/publications', 'Publications', BookMarked],
    ['thesis', '/teacher/thesis', 'Thesis', FileText],
    ['writing', '/teacher/writing', 'Writing', PenLine],
    ['plagiarism', '/teacher/plagiarism', 'Plagiarism Check', ShieldCheck],
    ['clubs', '/teacher/clubs', 'My Clubs', Users]
];

export default function OrgResearch() {
    const { tool = 'overview' } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let live = true;
        api.get('/organizations/me/research-session')
            .then((r) => { if (live) setSession(r.data); })
            .catch((err) => { if (live) setError(err.response?.data?.message || 'Could not open Research.'); });
        return () => { live = false; };
    }, []);

    const current = TOOLS.find(([k]) => k === tool) || TOOLS[0];
    // The token travels in the fragment, which is never sent to a server or kept in its logs.
    const link = (embed) => `${STUDENT_PORTAL}/teacher/sso?${embed ? 'embed=1&' : ''}next=${encodeURIComponent(current[1])}#token=${encodeURIComponent(session.token)}&teacher=${encodeURIComponent(JSON.stringify(session.teacher))}`;
    const src = session ? link(true) : null;

    return (
        <div className="space-y-4 animate-fade-in pb-6">
            <PageHeader icon={FlaskConical} title="Research" subtitle="Your teacher dashboard: methodologies, research path, publications, thesis and writing." />
            {error && <Banner>{error}</Banner>}
            <Segmented options={TOOLS.map(([k, , label]) => [k, label])} value={current[0]} onChange={(k) => navigate(k === 'overview' ? '/organization/research' : `/organization/research/${k}`)} />
            {!session ? (!error && <Rows count={3} height="h-24" />) : (
                <div className={`${CARD} overflow-hidden`}>
                    <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2">
                        <a href={link(false)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            Open in a new tab <ExternalLink size={13} />
                        </a>
                    </div>
                    <iframe key={current[0]} title={`Research — ${current[2]}`} src={src} className="block h-[calc(100dvh-16rem)] min-h-[520px] w-full border-0 bg-slate-50" />
                </div>
            )}
        </div>
    );
}
