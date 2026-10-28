/**
 * Skills: one tab for what the student is building and what to learn next
 * (asked 2026-10-27: "merge Skills and Ideas, named Skills, simpler").
 *
 * Two views behind one switch, kept in the address (?view=learn) so a link,
 * the back button and a refresh all land on the same one:
 *   • My skills — the skills growing as tasks are finished (Skills.jsx);
 *   • What to learn — courses, certifications, books and practice sites
 *     picked for the goal (Recommendations.jsx, once "Ideas & Resources").
 */
import { useSearchParams } from 'react-router-dom';
import { Target, Lightbulb } from 'lucide-react';
import Skills from './Skills';
import Recommendations from './Recommendations';

const VIEWS = [
  { id: 'mine', label: 'My skills', icon: Target, tone: 'from-pink-500 to-rose-500 shadow-rose-500/30' },
  { id: 'learn', label: 'What to learn', icon: Lightbulb, tone: 'from-amber-400 to-orange-500 shadow-orange-500/30' }
];

export default function SkillsHub() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'learn' ? 'learn' : 'mine';

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Skills" className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100 sm:inline-grid sm:min-w-[28rem]">
        {VIEWS.map(({ id, label, icon: Icon, tone }) => {
          const on = view === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on}
              onClick={() => setParams(id === 'learn' ? { view: 'learn' } : {}, { replace: true })}
              className={`flex items-center justify-center gap-2 rounded-xl px-2.5 py-2.5 transition-all duration-300 ${on ? `bg-gradient-to-r ${tone} text-white shadow-lg` : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Icon size={17} strokeWidth={2.4} />
              </span>
              <span className="text-sm font-black whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
      <div key={view} className="animate-fade-in-up">
        {view === 'learn' ? <Recommendations /> : <Skills />}
      </div>
    </div>
  );
}
