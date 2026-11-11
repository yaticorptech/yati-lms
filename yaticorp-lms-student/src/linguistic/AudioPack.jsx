/**
 * The unit's audio pack (2026-11-06, user: "before a unit starts, download all its audio, then they can start").
 * Before the first lesson of a unit opens, every text the unit's lessons read aloud is made and kept on the
 * device (meta.js downloadClips), so no tap waits for the voice service. Downloaded once per unit and course.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Headphones, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, aiVoiceOn, downloadClips } from './meta';
import { Chunky, Mascot } from './ui';
import { buildLesson } from './session/logic';
import { stepSpeech, chartSpeech } from './speechText';

const MARK = 'lingo-pack3:'; // v2 (2026-11-11): a pack is marked only when every clip is made
const packOf = (lessonId) => { try { return localStorage.getItem(MARK + lessonId); } catch { return null; } };
const markPack = (key, lessonIds) => { try { lessonIds.forEach((id) => localStorage.setItem(MARK + id, key)); } catch { /* private mode */ } };

/** Whether this lesson's unit still needs its audio downloaded. */
// eslint-disable-next-line react-refresh/only-export-components
export const needsPack = (lessonId) => aiVoiceOn() && !packOf(lessonId);
/** The letters page's pack id (2026-11-11: the letters page opened without its audio downloaded). */
// eslint-disable-next-line react-refresh/only-export-components
export const lettersPackId = (code) => `letters-${code}`;
const chartPack = (chart) => ({ key: `letters:${chart.course.code}`, title: `${chart.course.name} letters`, lessons: [], chart, lessonIds: [lettersPackId(chart.course.code)] });

/** Every [text, lang] a pack's lessons can read aloud. */
const speechOf = async (pack) => {
    const items = pack.lessons.flatMap((l) => { try { return buildLesson(l).flatMap(stepSpeech); } catch { return []; } });
    if (pack.chart) items.push(...chartSpeech(pack.chart));
    else if (pack.letters) { try { items.push(...chartSpeech(await linguisticApi.letters())); } catch { /* no letters page */ } }
    return items;
};

export default function AudioPack({ lessonId, chart, onReady, onCancel }) {
    const [state, setState] = useState({ phase: 'idle' }); // idle | preparing | downloading | failed | done
    const [unit, setUnit] = useState(() => (chart ? chartPack(chart) : null));
    const signal = useRef({ stopped: false });
    // Set again on every mount: React's development mode mounts, unmounts and mounts again, which left this
    // stopped and the download ended before a single clip was asked for.
    useEffect(() => { const s = signal.current; s.stopped = false; return () => { s.stopped = true; }; }, []);

    const start = async () => {
        setState({ phase: 'preparing' });
        try {
            const pack = unit || (chart ? chartPack(chart) : await linguisticApi.lessonPack(lessonId));
            setUnit(pack);
            const items = await speechOf(pack);
            setState({ phase: 'downloading', done: 0, total: items.length });
            const out = await downloadClips(items, { signal: signal.current, onProgress: (done, total) => setState({ phase: 'downloading', done, total }) });
            if (signal.current.stopped) return;
            if (out.failed) { setState({ phase: 'failed', failed: out.failed, total: out.total }); return; }
            markPack(pack.key, pack.lessonIds);
            setState({ phase: 'done' });
            setTimeout(onReady, 600);
        } catch (e) {
            setState({ phase: 'failed', message: e.message });
        }
    };

    // Starts on its own (2026-11-11): the lesson opens only once every voice is ready, with no extra tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => { start(); }, [lessonId, chart]);

    const { phase } = state;
    const pct = phase === 'downloading' && state.total ? Math.round((state.done / state.total) * 100) : phase === 'done' ? 100 : 0;
    const busy = phase === 'preparing' || phase === 'downloading';

    return (
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center" data-audio-pack>
            <button type="button" onClick={onCancel} aria-label="Back to the path" className="absolute top-4 left-4 rounded-xl p-2 text-[#AFAFAF] hover:bg-[#F7F7F7] hover:text-[#777]"><X size={24} /></button>
            <Mascot pose={phase === 'done' ? 'thumbs-up' : busy ? 'thinking' : 'wave-hi'} className="h-32 w-32" />
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: COLORS.blue.ink }}>Audio pack</p>
            <h1 className="mt-1 max-w-md text-2xl font-extrabold text-[#3c3c3c]">{unit?.title ? `Download ${unit.title}` : 'Download this unit’s audio'}</h1>
            <p className="mt-2 max-w-md text-[15px] font-semibold text-[#777]">
                {phase === 'done' ? 'All set. Every word and sentence in this unit will play instantly.'
                    : 'Get every word and sentence of this unit onto your device first, so the audio plays the moment you tap it.'}
            </p>
            {unit && phase === 'idle' && <p className="mt-1 text-sm font-bold text-[#AFAFAF]">{unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'} in this unit</p>}

            {(busy || phase === 'done') && (
                <div className="mt-7 w-full max-w-sm" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Audio download">
                    <div className="h-4 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                        <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${busy && pct < 3 ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(pct, busy ? 3 : 0)}%`, background: phase === 'done' ? COLORS.green.face : COLORS.blue.face }} />
                    </div>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-[#777]">
                        {phase === 'done' ? <><CheckCircle2 size={16} style={{ color: COLORS.green.face }} /> Downloaded</>
                            : phase === 'preparing' ? 'Getting the unit ready…'
                                : state.done === 0 ? `Making the first clips… (${state.total} in all)` : `${state.done} of ${state.total} clips · ${pct}%`}
                    </p>
                    {phase === 'downloading' && <p className="mt-1 text-xs font-semibold text-[#AFAFAF]">Keep this screen open. The lesson opens as soon as every voice is ready.</p>}
                </div>
            )}

            {phase === 'failed' && (
                <p role="alert" className="mt-6 max-w-sm rounded-2xl border-2 px-4 py-3 text-sm font-bold" style={{ borderColor: COLORS.red.light, color: COLORS.red.ink, background: '#FFF5F5' }}>
                    {state.message || `${state.failed} of ${state.total} clips could not be downloaded. Check your connection and try again.`}
                </p>
            )}

            <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                {phase === 'idle' && <Chunky color="blue" onClick={start} className="w-full"><Download size={18} /> Download and start</Chunky>}
                {busy && <Chunky color="blue" disabled className="w-full"><Headphones size={18} /> Downloading…</Chunky>}
                {phase === 'failed' && <>
                    <Chunky color="blue" onClick={start} className="w-full"><RotateCcw size={18} /> Try again</Chunky>
                </>}
            </div>
        </div>
    );
}
