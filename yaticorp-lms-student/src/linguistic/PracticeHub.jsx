/**
 * Linguistic Ability — the Practice tab: the daily vocabulary challenge, the
 * mistakes to fix, and the placement test (English's; another language's
 * course has none). Today's quests and the timeline are on the dashboard
 * (2026-10-26).
 */
import { Link, useOutletContext } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { COLORS, levelOf } from './meta';
import { Mascot } from './ui';

function Card({ to, color, pose, title, text, cta, done = false, attr = {} }) {
    const c = COLORS[color];
    return (
        <Link to={to} className="flex items-center gap-4 rounded-2xl border-2 border-b-4 bg-white p-4 transition-colors hover:bg-[#F7F7F7] active:translate-y-0.5 active:border-b-2" style={{ borderColor: '#E5E5E5' }} {...attr}>
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl" style={{ background: c.light }}><Mascot pose={pose} className="h-[4.5rem] w-[4.5rem]" /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-extrabold text-[#3c3c3c]">{title}</span>
                <span className="mt-0.5 block text-[15px] font-semibold text-[#777]">{text}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: done ? COLORS.green.ink : c.ink }}>{cta} <ChevronRight size={16} /></span>
            </span>
        </Link>
    );
}

export default function PracticeHub() {
    const { dash } = useOutletContext();
    return (
        <div className="space-y-5" data-practice-hub>
            <h1 className="text-2xl font-extrabold text-[#3c3c3c]">Practice</h1>
            <div className="grid gap-3">
                <Card to="/linguistic/daily" color="gold" pose={dash.daily.done ? 'thumbs-up' : 'flex-content'} title="Daily challenge" done={dash.daily.done}
                    text={dash.daily.done ? `Done today: ${dash.daily.score}/${dash.daily.total}. New words tomorrow!` : `${dash.daily.total} quick word questions at your level, new every day.`}
                    cta={dash.daily.done ? 'See results' : 'Play now'} attr={{ 'data-daily': dash.daily.done ? 'done' : 'open' }} />
                <Card to="/linguistic/review" color="red" pose={dash.mistakes ? 'curious-question' : 'heart-hands'} title="Fix your mistakes" done={!dash.mistakes}
                    text={dash.mistakes ? `${dash.mistakes} answer${dash.mistakes === 1 ? '' : 's'} to practise until you get them right.` : 'Nothing to fix right now. Well done!'}
                    cta={dash.mistakes ? 'Practise' : 'Open'} attr={{ 'data-mistakes': dash.mistakes }} />
                {(!dash.course || dash.course.code === 'en') && <Card to="/linguistic/placement" color="blue" pose="thinking" title="Placement test"
                    // The test shows the level; units and sections still open in turn (2026-10-28).
                    text={dash.placement?.chosen || !dash.placement ? 'Check your English level in 15 questions. Your lessons still open one unit at a time.' : `Your last test: ${levelOf(dash.placement.found || dash.placement.level).label} (${dash.placement.score}/${dash.placement.total}). Take it again any time.`}
                    cta={dash.placement && !dash.placement.chosen ? 'Retake' : 'Start'} attr={{ 'data-placement-card': dash.placement ? dash.placement.level : 'none' }} />}
            </div>
        </div>
    );
}
