/**
 * Job Preparation: the mock interviews, the aptitude tests and the job search
 * under one sidebar entry, with folder tabs along the top (components/FolderTabs). The live interview itself sits outside this shell (it covers the
 * screen); Job Search is withdrawn with the admin's Jobs switch, as it was in
 * the sidebar.
 */
import { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Mic, Brain, Briefcase } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { interviewApi } from './api';
import FolderTabs from '../components/FolderTabs';

const TABS = [
    { name: 'Mock Interview', to: '/interview', icon: Mic, tone: 'from-violet-500 to-indigo-600 shadow-violet-500/40' },
    { name: 'Aptitude Test', to: '/interview/aptitude', icon: Brain, tone: 'from-amber-400 to-yellow-500 shadow-amber-500/40' },
    { name: 'Job Search', to: '/jobs', icon: Briefcase, tone: 'from-emerald-400 to-teal-600 shadow-emerald-500/40', flag: 'jobs' }
];

const under = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

// Mock Interview owns every /interview screen except the aptitude ones.
const isOn = (tab, pathname) =>
    tab.to === '/interview' ? under(pathname, '/interview') && !under(pathname, '/interview/aptitude') : under(pathname, tab.to);

export default function JobPrepShell() {
    const { isJobsEnabled } = useContext(AuthContext);
    const { pathname } = useLocation();
    // A school student gets IQ questions, not aptitude ones (the server
    // decides, from their class); the tab says so. Kept on this device so the
    // name does not flip on every visit while the answer is fetched.
    const [school, setSchool] = useState(() => { try { return localStorage.getItem('jobprep:school') === '1'; } catch { return false; } });
    useEffect(() => {
        interviewApi.aptitude().then((a) => {
            setSchool(!!a.school);
            try { localStorage.setItem('jobprep:school', a.school ? '1' : '0'); } catch { /* private mode */ }
        }).catch(() => {});
    }, []);
    const tabs = TABS.filter((t) => t.flag !== 'jobs' || isJobsEnabled)
        .map((t) => (school && t.to === '/interview/aptitude' ? { ...t, name: 'IQ Test' } : t));

    return (
        <>
            <FolderTabs label="Job Preparation sections" tabs={tabs.map((t) => ({ ...t, on: isOn(t, pathname) }))} />
            <Outlet />
        </>
    );
}
