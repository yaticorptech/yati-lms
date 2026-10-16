/**
 * @author Preethesh Kulal
 * @description Live password strength checklist component shown while typing
 */
const RULES = [
    { label: 'At least 8 characters', test: pw => pw.length >= 8 },
    { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
    { label: 'One number', test: pw => /[0-9]/.test(pw) },
    { label: 'One special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

// A list, so a screen reader says how many rules there are; each rule says
// in words whether it is met, since ✓ and ○ are only shapes.
const PasswordStrengthChecker = ({ password, focused }) => {
    if (!focused && !password) return null;
    return (
        <ul className="mt-2 space-y-1" aria-label="Password requirements">
            {RULES.map(rule => {
                const ok = rule.test(password);
                return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                        <span>{rule.label}<span className="sr-only">{ok ? ' (met)' : ' (not met yet)'}</span></span>
                    </li>
                );
            })}
        </ul>
    );
};

export default PasswordStrengthChecker;
