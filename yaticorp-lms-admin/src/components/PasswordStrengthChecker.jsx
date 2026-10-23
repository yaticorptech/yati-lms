/**
 * @author Preethesh Kulal
 * @description Live password strength checklist component shown while typing
 */
import { Check, Circle } from 'lucide-react';

const RULES = [
    { label: 'At least 8 characters', test: pw => pw.length >= 8 },
    { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
    { label: 'One number', test: pw => /[0-9]/.test(pw) },
    { label: 'One special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

const PasswordStrengthChecker = ({ password, focused }) => {
    if (!focused && !password) return null;
    return (
        <div className="mt-2 space-y-1">
            {RULES.map(rule => {
                const ok = rule.test(password);
                return (
                    <div key={rule.label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {ok ? <Check size={13} strokeWidth={3} aria-hidden className="shrink-0" /> : <Circle size={11} aria-hidden className="mx-px shrink-0" />}
                        <span>{rule.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default PasswordStrengthChecker;
