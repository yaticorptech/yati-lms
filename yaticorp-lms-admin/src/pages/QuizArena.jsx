/**
 * Quiz Arena's question bank. The contests are in Games & Competitions
 * (Competitions.jsx); each opens in QuizArenaCompetition.jsx, where its
 * questions are chosen, it is published and started, and its results are
 * reviewed and published.
 *
 * The bank: questions are drafts until reviewed and approved here; only
 * approved ones go into a contest. Editing an approved question sends it
 * back to draft. A published contest keeps its own copy of its questions, so
 * nothing done here changes it.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain } from 'lucide-react';
import api from '../utils/api';
import { PageHeader } from '../components/orgUi';
import { arenaApi, arenaHome } from '../arena/shared';
import Bank from '../arena/Bank';
import useGoBack from '../hooks/useGoBack';

/** The Quiz Arena question bank, opened from Games & Competitions. (Its contests are in that page's list.) */
export default function QuizArena() {
    const goBack = useGoBack();
    // How many questions each round shows: the contest's numbers (?counts=12,5,10
    // from its page), else the latest draft contest's, else the bank's defaults.
    const [params] = useSearchParams();
    const given = (params.get('counts') || '').split(',').map(Number);
    const [counts, setCounts] = useState(given.length === 3 && given.every((n) => n >= 0) ? { 1: given[0], 2: given[1], 3: given[2] } : null);
    useEffect(() => {
        if (counts) return;
        api.get(arenaApi()).then((r) => {
            const list = r.data.competitions || [];
            const c = list.find((x) => x.status === 'draft') || list[0];
            if (c?.counts) setCounts(c.counts);
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <div className="-mt-4 space-y-4 lg:-mt-8">
            <Link to={arenaHome()} onClick={goBack} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
            <Bank {...(counts ? { counts } : {})}
                header={(generate) => (
                    <PageHeader icon={Brain} title="Quiz Arena question bank" subtitle="Questions for the three rounds — Live Quiz Battle, Picture Challenge and Current Affairs Clash. Drafts until reviewed; only approved questions go into a Quiz Arena.">
                        {generate}
                    </PageHeader>
                )} />
        </div>
    );
}
