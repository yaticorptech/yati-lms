/**
 * "Jump here?" on a unit (2026-11-13, the user's Duolingo picture "UP NEXT … JUMP HERE?" — "give both options: what is
 * there now, and this"): between a unit and the shut one after it, that unit's name and its button. Its test is the
 * unit review of the unit before it (the server's service.js startUnitJump): passed, the unit opens, and the units
 * skipped open too, still to do; not passed, nothing changes and it can be tried again. Going unit by unit stays.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { linguisticApi } from '../api';
import { COLORS } from '../meta';

export default function JumpUnit({ unit, upNext = false }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (!unit?.jump) return null;
    const start = () => {
        setBusy(true);
        setError('');
        linguisticApi.jumpUnit(unit.id)
            .then((r) => navigate(`/linguistic/${r.module}/${r.lesson}`))
            .catch((e) => { setError(e.message || 'The test could not open. Try again.'); setBusy(false); });
    };
    return (
        <div className="mx-auto mb-10 w-full max-w-[640px] rounded-2xl border-2 border-[#E5E5E5] bg-white px-4 py-5 text-center sm:px-8 sm:py-6" data-jump-unit={unit.id}>
            {upNext && <span className="inline-block rounded-lg bg-[#F2F2F2] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]" data-jump-up-next>Up next</span>}
            <p className="mt-2 text-xl font-extrabold leading-tight text-[#3c3c3c] sm:text-2xl" style={{ textWrap: 'balance' }}>{unit.title}</p>
            {unit.jump.percent != null && <p className="mt-1 text-sm font-bold text-[#AFAFAF]" data-jump-last>Last try: {unit.jump.percent}%</p>}
            <button type="button" onClick={start} disabled={busy}
                className="lingo-btn mt-4 h-12 w-full text-[15px] uppercase tracking-wide disabled:opacity-60"
                style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.ink }} data-jump-here>
                {busy ? 'Opening the test…' : 'Jump here?'}
            </button>
            {error && <p role="alert" className="mt-2 text-sm font-bold text-[#EA2B2B]">{error}</p>}
        </div>
    );
}
