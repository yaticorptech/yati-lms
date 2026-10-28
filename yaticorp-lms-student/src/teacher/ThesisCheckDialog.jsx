/**
 * Thesis Writing → the check shown when PDF or Word is pressed (asked
 * 2026-10-27): what needs a look before the file is made, each with a way
 * to it (the chapter, or Details), then the file — straight away when all is
 * well, or "Download anyway", since a draft is still the teacher's to take.
 * The rules are in thesisCheck.js.
 */
import { useMemo } from 'react';
import { AlertTriangle, Info, CheckCircle2, ArrowRight, FileDown, FileType2, ShieldCheck } from 'lucide-react';
import { Modal } from './ui';
import { btn } from './kit';
import { checkThesis } from './thesisCheck';

const TONE = {
    warn: { icon: AlertTriangle, row: 'border-amber-200 bg-amber-50/60', mark: 'text-amber-600' },
    info: { icon: Info, row: 'border-sky-200 bg-sky-50/60', mark: 'text-sky-600' }
};

export default function ThesisCheckDialog({ thesis, kind, onDownload, onGoTo, onDetails, onClose }) {
    const { issues, passed } = useMemo(() => checkThesis(thesis), [thesis]);
    const warnings = issues.filter((i) => i.level === 'warn').length;
    const file = kind === 'pdf' ? 'PDF' : 'Word';
    const FileIcon = kind === 'pdf' ? FileDown : FileType2;

    return (
        <Modal title="Check before you download" labelId="thesis-check-title" onClose={onClose}
            footer={<>
                <button type="button" onClick={onClose} className={btn.secondary}>Back to writing</button>
                <button type="button" onClick={onDownload} className={btn.primary}><FileIcon size={15} /> {warnings ? 'Download anyway' : `Download ${file}`}</button>
            </>}>
            <div className="space-y-4">
                {warnings ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900">{warnings} {warnings === 1 ? 'thing' : 'things'} to look at</p>
                            <p className="text-xs text-amber-800">Fix them now, or download anyway: it is your draft.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-900">Ready to download</p>
                            <p className="text-xs text-emerald-800">Nothing needs fixing{issues.length ? '; a note or two below' : ''}.</p>
                        </div>
                    </div>
                )}

                {issues.length > 0 && (
                    <ul className="space-y-2" aria-label="What to look at">
                        {issues.map((i) => {
                            const tone = TONE[i.level];
                            const Icon = tone.icon;
                            return (
                                <li key={i.id} className={`flex items-start gap-3 rounded-xl border p-3 ${tone.row}`}>
                                    <Icon size={16} className={`mt-0.5 shrink-0 ${tone.mark}`} aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{i.title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{i.detail}</p>
                                        {(i.chapterId || i.action === 'details') && (
                                            <button type="button" onClick={() => (i.chapterId ? onGoTo(i.chapterId) : onDetails())}
                                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                                                {i.chapterId ? 'Open the chapter' : 'Open Details'} <ArrowRight size={12} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {passed.length > 0 && (
                    <section aria-labelledby="thesis-check-passed">
                        <h3 id="thesis-check-passed" className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Looks good</h3>
                        <ul className="grid gap-1 sm:grid-cols-2">
                            {passed.map((p) => <li key={p} className="flex items-start gap-1.5 text-xs text-slate-700"><CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-600" aria-hidden="true" />{p}</li>)}
                        </ul>
                    </section>
                )}
            </div>
        </Modal>
    );
}
