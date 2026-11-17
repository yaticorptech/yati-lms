/**
 * The unit's audio pack (2026-11-06, user: "before a unit starts, download all its audio, then they can start").
 * Before the first lesson of a unit opens, every text the unit's lessons read aloud is made and kept on the
 * device (meta.js downloadClips), so no tap waits for the voice service. Downloaded once per unit and course.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Headphones, CheckCircle2, RotateCcw } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS } from './meta';
import { Chunky, Mascot } from './ui';
import { chartPack, lettersPackId } from './audioPacks';
import { packJob } from './audioDownloader';

// Kept here for the pages that import them from this file (audioPacks.js has them).
// eslint-disable-next-line react-refresh/only-export-components
export { needsPack, lettersPackId } from './audioPacks';

export default function AudioPack({ lessonId, chart, onReady, onCancel }) {
    const [state, setState] = useState({ phase: 'preparing' }); // preparing | downloading | failed | done
    const [unit, setUnit] = useState(() => (chart ? chartPack(chart) : null));
    const [attempt, setAttempt] = useState(0);
    const id = chart ? lettersPackId(chart.course.code) : lessonId;
    // The download belongs to the unit, not to this screen (audioDownloader.js packJob): leaving, Back or "Start now"
    // only stop showing it; it goes on, and coming back shows it where it has got to.
    useEffect(() => {
        // Only this lesson (2026-11-13): its own bar, short; the unit's other lessons follow in the background.
        const job = packJob(id, async () => {
            // The letters page waits only for the letters themselves (2026-11-13: the whole table — hundreds of
            // sounds — timed out); the table of combinations comes down in the background afterwards.
            const pack = chart ? chartPack(chart, { table: false }) : await linguisticApi.lessonPack(lessonId);
            setUnit(pack);
            return pack;
        }, chart ? null : lessonId);
        let left = false;
        // Opens only when every clip of the lesson is on the device (2026-11-14, "if it's not completely downloaded
        // then don't open it"): the clips the server has not made yet are made first (the server puts a lesson
        // being opened ahead of the background work), so the wait is as short as it can be.
        const off = job.listen((s) => {
            setState(s);
            if (s.title) setUnit((u) => u || { title: s.title, lessons: [] });
            if (s.phase === 'done' && !left) setTimeout(() => { if (!left) onReady(); }, 600);
        });
        return () => { left = true; off(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, attempt]);
    const start = () => setAttempt((n) => n + 1);

    const { phase } = state;
    const pct = phase === 'downloading' && state.total ? Math.round((state.done / state.total) * 100) : phase === 'done' ? 100 : 0;
    const busy = phase === 'preparing' || phase === 'downloading';

    return (
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center" data-audio-pack>
            {/* Back (2026-11-13): the download goes on while the student is away (audioDownloader.js packJob). */}
            {/* One Back only (2026-11-13): the letters page has its own at the top, so none here for it. */}
            {!chart && <button type="button" onClick={onCancel} aria-label="Back" className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-extrabold text-[#777] hover:bg-[#F7F7F7] hover:text-[#4b4b4b]" data-audio-back><ArrowLeft size={22} /> Back</button>}
            <Mascot pose={phase === 'done' ? 'thumbs-up' : busy ? 'thinking' : 'wave-hi'} className="h-32 w-32" />
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: COLORS.blue.ink }}>Your lesson</p>
            <h1 className="mt-1 max-w-md text-2xl font-extrabold text-[#3c3c3c]">{state.title || unit?.title ? `Preparing “${state.title || unit.title}”` : 'Preparing your lesson'}</h1>
            <p className="mt-2 max-w-md text-[15px] font-semibold text-[#777]">
                {phase === 'done' ? 'Ready. Opening your lesson…'
                    : 'Please wait a moment while your lesson loads.'}
            </p>
            {unit && phase === 'idle' && <p className="mt-1 text-sm font-bold text-[#AFAFAF]">{unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'} in this unit</p>}

            {(busy || phase === 'done') && (
                <div className="mt-7 w-full max-w-sm" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Loading your lesson">
                    <div className="h-4 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                        <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${busy && pct < 3 ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(pct, busy ? 3 : 0)}%`, background: phase === 'done' ? COLORS.green.face : COLORS.blue.face }} />
                    </div>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-[#777]">
                        {phase === 'done' ? <><CheckCircle2 size={16} style={{ color: COLORS.green.face }} /> Ready</>
                            : phase === 'preparing' ? 'Loading…'
                                : `Loading… ${pct}%`}
                    </p>
                    {phase === 'downloading' && <p className="mt-1 text-xs font-semibold text-[#AFAFAF]">It will open automatically as soon as it is ready.</p>}
                </div>
            )}

            {phase === 'failed' && (
                <p role="alert" className="mt-6 max-w-sm rounded-2xl border-2 px-4 py-3 text-sm font-bold" style={{ borderColor: COLORS.red.light, color: COLORS.red.ink, background: '#FFF5F5' }}>
                    {state.message || "Your lesson could not be loaded. Check your connection and try again."}
                </p>
            )}

            <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                {phase === 'idle' && <Chunky color="blue" onClick={start} className="w-full"><Download size={18} /> Download and start</Chunky>}
                {busy && <Chunky color="blue" disabled className="w-full"><Headphones size={18} /> Loading…</Chunky>}
                {phase === 'failed' && <>
                    <Chunky color="blue" onClick={start} className="w-full"><RotateCcw size={18} /> Try again</Chunky>
                </>}
                {/* No "Start now" (2026-11-13, "open the lesson only once it is fully downloaded, so it never stops in the
                    middle"): the lesson opens by itself the moment its last voice is ready. */}
            </div>
        </div>
    );
}
