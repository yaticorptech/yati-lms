/**
 * My Progress: the student's progress and their skills in one tab (asked
 * 2026-10-29: "add my skills inside my progress, merge that").
 *
 * Three views behind one switch, kept in the address (?view=) so a link, the
 * back button and a refresh all land on the same one:
 *   • Progress — level, roadmap distance, what is still to do (Profile.jsx);
 *   • My skills — the skills growing as tasks are finished (Skills.jsx);
 *   • What to learn — courses and resources picked for the goal (Recommendations.jsx).
 * /career/skills sends here, so the old links still work.
 */
import { useSearchParams } from 'react-router-dom';
import { UserCircle, Target, Lightbulb } from 'lucide-react';
import Profile from './Profile';
import Skills from './dashboard/Skills';
import Recommendations from './dashboard/Recommendations';

const VIEWS = [
  { id: 'progress', label: 'Progress', icon: UserCircle, tone: 'from-indigo-500 to-violet-600 shadow-indigo-500/30' },
  { id: 'skills', label: 'My skills', icon: Target, tone: 'from-pink-500 to-rose-500 shadow-rose-500/30' },
  { id: 'learn', label: 'What to learn', icon: Lightbulb, tone: 'from-amber-400 to-orange-500 shadow-orange-500/30' }
];

export default function ProgressHub() {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'progress';

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="My Progress" className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100 sm:inline-grid sm:min-w-[36rem]">
        {VIEWS.map(({ id, label, icon: Icon, tone }) => {
          const on = view === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on}
              data-mascot-target={id === 'skills' ? 'skills' : undefined}
              onClick={() => setParams(id === 'progress' ? {} : { view: id }, { replace: true })}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 transition-all duration-300 ${on ? `bg-gradient-to-r ${tone} text-white shadow-lg` : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${on ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Icon size={17} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-black whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
      <div key={view} className="animate-fade-in-up">
        {view === 'skills' ? <Skills /> : view === 'learn' ? <Recommendations /> : <Profile />}
      </div>
    </div>
  );
}
