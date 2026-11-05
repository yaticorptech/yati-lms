/**
 * Language Learning — going straight to a section not open yet (asked 2026-10-31: "if he directly goes to the
 * advanced section, conduct one assessment; if he is not eligible he will learn from the basics" — "how much English
 * they know"): the section's entry test, 10 questions on the section before it and 10 on its own, half of each right
 * to pass, one try (the server's service.js `startJump`). Under a locked section, on the path and on the sections
 * page; once tried and not passed, what happens now.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { linguisticApi } from '../api';
import { COLORS, levelOf } from '../meta';

export default function JumpTest({ section, number }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const jump = section.jump;
    if (!jump || section.open) return null;
    const from = levelOf(jump.from).label;
    const to = levelOf(section.level).label;
    if (jump.status === 'failed') {
        return (
            <p className="mt-3 rounded-xl bg-[#F7F7F7] px-3 py-2 text-sm font-bold text-[#777]" data-jump-test="failed">
                You took the {to} entry test{jump.percent != null ? ` (${jump.percent}%)` : ''}: you learn from Section {number - 1}, {from}. Finish it and pass its assessment to open {to}.
            </p>
        );
    }
    const start = () => {
        setBusy(true);
        setError('');
        linguisticApi.jump(section.level).then((r) => navigate(`/linguistic/${r.module}/${r.lesson}`)).catch((e) => { setError(e.message || 'The test could not open. Try again.'); setBusy(false); });
    };
    return (
        <div className="mt-3 rounded-2xl border-2 p-3 text-left sm:p-4" style={{ borderColor: COLORS.purple.light, background: '#FBF7FF' }} data-jump-test={jump.status}>
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#3c3c3c]"><Rocket size={18} style={{ color: COLORS.purple.face }} /> {to} entry test</p>
            <p className="mt-1 text-sm font-semibold text-[#777]">Know the language well already? Find out how much: 20 questions, 10 on {from} and 10 on {to}. Get half of each right and {to} opens now. Below that, you learn from Section {number - 1}, {from}. You have one try.</p>
            <button type="button" onClick={start} disabled={busy} className="lingo-btn mt-3 h-11 w-full text-[15px] transition-[filter] hover:brightness-105 disabled:opacity-60"
                style={{ background: COLORS.purple.face, borderColor: COLORS.purple.edge, color: '#fff' }} data-jump-start>
                {busy ? 'Opening the test…' : `Take the ${to} entry test`}
            </button>
            {error && <p role="alert" className="mt-2 text-sm font-bold text-[#EA2B2B]">{error}</p>}
        </div>
    );
}
