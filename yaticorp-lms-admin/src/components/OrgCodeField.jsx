/**
 * The Organization ID box, used where an organization is registered and where
 * a superadmin creates one. The ID is chosen, never generated: it is typed
 * here, handle style (@st_agnes_college), and the box says as it is typed
 * whether it is usable and whether it is still free.
 *
 * `onChange` gets the tidied ID. `onStatus` gets { state, message }, where
 * state is 'invalid' | 'checking' | 'available' | 'taken' | 'unknown' — the
 * form uses it to hold back a submit it already knows will be refused.
 */
import React, { useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import api from '../utils/api';
import { orgCodeProblem, suggestOrgCode, tidyOrgCode } from '../utils/orgCode';

const OrgCodeField = ({ id, value, onChange, onStatus, error, name, bad }) => {
    const [status, setStatus] = useState({ state: '', message: '' });
    const timer = useRef(null);
    const asked = useRef('');

    const report = (next) => { setStatus(next); onStatus?.(next); };

    const change = (raw) => {
        const code = tidyOrgCode(raw);
        onChange(code);
        clearTimeout(timer.current);
        if (!code) return report({ state: '', message: '' });
        const problem = orgCodeProblem(code);
        if (problem) return report({ state: 'invalid', message: problem });
        report({ state: 'checking', message: 'Checking…' });
        // Asked once typing pauses, not on every key.
        timer.current = setTimeout(async () => {
            asked.current = code;
            try {
                const res = await api.get('/organizations/code-available', { params: { code } });
                if (asked.current !== code) return;   // a newer one was typed meanwhile
                report(res.data.available
                    ? { state: 'available', message: 'This ID is available.' }
                    : { state: 'taken', message: res.data.message || 'That organization ID already exists.' });
            } catch {
                if (asked.current === code) report({ state: 'unknown', message: '' });
            }
        }, 350);
    };

    const suggestion = suggestOrgCode(name);
    const offer = !value && suggestion.length >= 3 && !orgCodeProblem(suggestion);
    // A server message (after submit) wins over the live one.
    const shown = error ? { state: 'taken', message: error } : status;
    const tone = { available: 'text-emerald-600', taken: 'text-red-500', invalid: 'text-red-500', checking: 'text-slate-500' }[shown.state] || 'text-slate-500';
    const red = bad || shown.state === 'taken' || shown.state === 'invalid';

    return (
        <div>
            <div className={`flex items-center rounded-xl border bg-white focus-within:ring-2 ${red ? 'border-red-400 focus-within:ring-red-400/40' : shown.state === 'available' ? 'border-emerald-400 focus-within:ring-emerald-400/40' : 'border-slate-300 focus-within:ring-indigo-500/40'}`}>
                {/* A plain @ set against the text, so it reads as one handle: @st_agnes_college. */}
                <span aria-hidden className="pl-3 font-mono text-sm text-slate-400">@</span>
                <input id={id} value={value} onChange={(e) => change(e.target.value)}
                    autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={30}
                    placeholder="xx_xxxxx_xxx"
                    aria-invalid={red || undefined} aria-describedby={`${id}-status`}
                    className="min-w-0 flex-1 rounded-xl bg-transparent py-2.5 pl-0.5 pr-2 font-mono text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none" />
                <span className="pr-3">
                    {shown.state === 'checking' && <Loader2 size={16} className="animate-spin text-slate-400" />}
                    {shown.state === 'available' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {(shown.state === 'taken' || shown.state === 'invalid') && <XCircle size={16} className="text-red-500" />}
                </span>
            </div>
            <p id={`${id}-status`} role="status" className={`mt-1 min-h-4 text-xs ${tone}`}>
                {shown.message || 'Letters, numbers, underscores and full stops. Students type this to join you, so keep it simple.'}
            </p>
            {offer && (
                <button type="button" onClick={() => change(suggestion)}
                    className="mt-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-2 py-1 font-mono text-xs text-indigo-700 hover:bg-indigo-100">
                    Use @{suggestion}
                </button>
            )}
        </div>
    );
};

export default OrgCodeField;
