/**
 * A conversation to listen to, as chat bubbles. "Play the conversation" plays
 * every line's recording in turn and lights up the one playing; any line can
 * be played on its own. The words are always shown (2026-10-27, user: "show it
 * in only words", no "Line 1" placeholders). An uploaded recording of
 * the whole conversation, when the lesson has one, plays in a normal player.
 * `compact`: the quiz's "hear it again", without the scenario.
 */
import { useEffect, useRef, useState } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { mediaUrl } from '../api';
import { COLORS, canSpeak } from '../meta';

const SPEAKER_COLORS = ['blue', 'orange', 'purple', 'green'];

export default function Dialogue({ dialogue, audio, compact = false }) {
    const lines = dialogue?.lines || [];
    const speakers = [...new Set(lines.map((l) => l.speaker))];
    const [current, setCurrent] = useState(-1);
    const [playingAll, setPlayingAll] = useState(false);
    const player = useRef(null);
    const stopped = useRef(false);

    const stop = () => {
        stopped.current = true;
        if (player.current) { player.current.pause(); player.current = null; }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setCurrent(-1); setPlayingAll(false);
    };
    useEffect(() => () => { stopped.current = true; player.current?.pause(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);

    /** Play line i; resolves when it ends (or fails). */
    const playLine = (i) => new Promise((resolve) => {
        const line = lines[i];
        setCurrent(i);
        if (line.audio) {
            const a = new Audio(mediaUrl(line.audio));
            player.current = a;
            a.onended = resolve; a.onerror = resolve;
            a.play().catch(resolve);
        } else if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(line.text);
            u.lang = 'en-IN'; u.onend = resolve; u.onerror = resolve;
            window.speechSynthesis.speak(u);
        } else resolve();
    });
    const playOne = async (i) => { stop(); stopped.current = false; await playLine(i); if (!stopped.current) setCurrent(-1); };
    const playAll = async () => {
        stop(); stopped.current = false; setPlayingAll(true);
        for (let i = 0; i < lines.length && !stopped.current; i++) {
            await playLine(i);
            await new Promise((r) => setTimeout(r, 350));
        }
        if (!stopped.current) { setCurrent(-1); setPlayingAll(false); }
    };

    const playable = lines.some((l) => canSpeak(l.audio));
    const btn = 'lingo-btn inline-flex min-h-11 items-center gap-2 px-4 text-sm';
    return (
        <div data-dialogue>
            {!compact && dialogue?.scenario && <p className="mb-3 rounded-2xl px-4 py-3 text-[15px] font-bold" style={{ background: COLORS.orange.light, color: COLORS.orange.ink }}>🎧 {dialogue.scenario}</p>}
            {audio && <audio controls preload="none" src={mediaUrl(audio)} className="mb-3 w-full" aria-label="The whole conversation" />}
            {playable && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {playingAll
                        ? <button type="button" onClick={stop} className={btn} style={{ background: COLORS.red.face, borderColor: COLORS.red.edge, color: '#fff' }}><Square size={15} /> Stop</button>
                        : <button type="button" onClick={playAll} className={btn} style={{ background: COLORS.blue.face, borderColor: COLORS.blue.edge, color: '#fff' }} data-play-all><Play size={15} /> Play the conversation</button>}
                </div>
            )}
            <ol className="space-y-2.5">
                {lines.map((l, i) => {
                    const who = speakers.indexOf(l.speaker);
                    const c = COLORS[SPEAKER_COLORS[who % SPEAKER_COLORS.length]];
                    const right = who % 2 === 1;
                    return (
                        <li key={i} className={`flex items-end gap-2 ${right ? 'flex-row-reverse' : ''}`} data-line={i}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: c.face }} title={l.speaker} aria-hidden="true">{String(l.speaker).slice(0, 1)}</span>
                            <div className={`min-w-0 max-w-[78%] rounded-2xl border-2 px-3.5 py-2.5 transition-colors ${right ? 'rounded-br-md' : 'rounded-bl-md'}`}
                                style={current === i ? { borderColor: c.face, background: c.light } : { borderColor: '#E5E5E5', background: '#fff' }}>
                                <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: c.ink }}>{l.speaker}</p>
                                <p className="break-words text-[15px] font-semibold text-[#4b4b4b]">{l.text}</p>
                            </div>
                            {canSpeak(l.audio) && (
                                <button type="button" onClick={() => playOne(i)} aria-label={`Play line ${i + 1}, ${l.speaker}`} className="lingo-btn flex h-10 w-10 shrink-0 items-center justify-center !rounded-xl !border-b-[3px]" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.face }}><Volume2 size={17} /></button>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
