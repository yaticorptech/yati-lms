/**
 * The question bank over the competition form (its Edit button): add, edit
 * and approve questions without leaving the form. Closing it tells the form
 * whether anything changed, so it can say "Question bank updated".
 * `counts`: the form's questions per round, so the bank shows that many.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import Bank from './Bank';

export default function QuestionBankDialog({ counts, onClose }) {
    const [changed, setChanged] = useState(false);
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => onClose(changed)}>
            <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl" role="dialog" aria-modal="true" aria-label="Question bank">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <h2 className="font-bold text-slate-800">Quiz Arena question bank</h2>
                    <div className="flex items-center gap-2">
                        {changed && <span className="text-xs font-bold text-emerald-600">Saved</span>}
                        <button type="button" onClick={() => onClose(changed)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Done</button>
                        <button type="button" onClick={() => onClose(changed)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                    </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"><Bank counts={counts} onChanged={() => setChanged(true)} /></div>
            </div>
        </div>
    );
}
