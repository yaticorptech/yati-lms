/**
 * Linguistic Ability for a college coordinator — /organization/linguistic:
 * the teacher's view of their own students: progress and quiz results. The
 * server limits it to students of this college. Writing is checked in the
 * lesson and stays the student's own: nothing to review here (2026-10-26).
 */
import { Languages } from 'lucide-react';
import { PageHeader } from '../../components/orgUi';
import { StudentsPanel } from './Panels';

export default function OrgLinguistic() {
    return (
        <div className="space-y-4">
            <PageHeader icon={Languages} title="Language Learning" subtitle="Your students' English learning: their levels, lessons and quiz results." />
            <StudentsPanel base="/linguistic/org" />
        </div>
    );
}
