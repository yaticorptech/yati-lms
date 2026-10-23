/**
 * Linguistic Ability for a college coordinator — /organization/linguistic:
 * the teacher's view of their own students. Review open-ended writing and
 * passage translations, and follow progress and quiz results. The server
 * limits both to students of this college.
 */
import { useSearchParams } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { PageHeader, Segmented } from '../../components/orgUi';
import { ReviewsPanel, StudentsPanel } from './Panels';

const TABS = [['reviews', 'Writing to review'], ['students', 'Student progress']];

export default function OrgLinguistic() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'students' ? 'students' : 'reviews';
    return (
        <div className="space-y-4">
            <PageHeader icon={Languages} title="English (Linguistic Ability)" subtitle="Your students' English learning: review their writing, and see their levels and quiz results." />
            <Segmented options={TABS} value={tab} onChange={(v) => setParams(v === 'reviews' ? {} : { tab: v })} />
            {tab === 'reviews' ? <ReviewsPanel base="/linguistic/org" /> : <StudentsPanel base="/linguistic/org" />}
        </div>
    );
}
