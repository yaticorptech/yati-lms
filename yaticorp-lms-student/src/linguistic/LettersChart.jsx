/**
 * Language Learning — every letter of the course's language on one page (asked 2026-10-31: "first give all the
 * letters in one page; each letter with its English above it, and the voice"), the first stop of Beginner's Letters
 * unit and its "Letters chart" button. The vowels and the consonants (and, for the scripts of India, the kagunita:
 * each consonant with each vowel sign), each letter with its sound in English letters above it; tapped, the device
 * reads it in the course's voice (Kannada with no Kannada voice: meta.js reads it with a Telugu or Hindi one).
 * Drawn here; the student's reference pictures only showed the idea.
 */
import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { linguisticApi } from './api';
import { useNavigate } from 'react-router-dom';
import { COLORS, play, canSpeakIn, prefetch, setVoiceCourse } from './meta';
import AudioPack, { needsPack, lettersPackId } from './AudioPack';
import { chartSpeech } from './speechText';
import { Loading, Problem, Panel } from './ui';

const TONE = ['blue', 'green', 'purple', 'orange', 'red'];

/**
 * One letter: its sound in English letters above it, the letter big; tapped, heard. `wide`: a few characters long.
 * `pinyin` (Chinese A–Z, 2026-10-31): how the characters are said, under them.
 */
function Letter({ char, say, speak, pinyin = '', locale, color, small = false, wide = false, onHear, heard }) {
    const c = COLORS[color];
    return (
        <button type="button" onClick={() => onHear(char, speak)} aria-label={`${char}: ${say}${pinyin ? `, ${pinyin}` : ''}. Tap to hear it.`}
            className={`lingo-tile flex flex-col items-center justify-center gap-0.5 px-1 transition-transform active:scale-95 ${small ? 'min-h-16 min-w-16 py-1.5' : 'min-h-20 py-2'}`}
            style={heard ? { borderColor: c.face, background: c.light } : undefined} data-letter-tile={char}>
            <span className={`font-extrabold leading-none ${small ? 'text-[11px]' : 'text-xs sm:text-[13px]'}`} style={{ color: c.ink }} lang="en">{say}</span>
            <span className={`font-bold leading-tight text-[#3c3c3c] ${small ? 'text-2xl' : wide ? 'text-lg min-[420px]:text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`} lang={locale.split('-')[0]}>{char}</span>
            {pinyin && <span className="text-center text-[11px] font-bold leading-tight text-[#777] sm:text-xs" lang="zh-Latn" data-letter-pinyin>{pinyin}</span>}
        </button>
    );
}

export default function LettersChart() {
    const [chart, setChart] = useState(undefined);
    const [error, setError] = useState(null);
    const [heard, setHeard] = useState('');
    const [packed, setPacked] = useState(false); // the letters' audio is on the device
    const navigate = useNavigate();
    const load = () => linguisticApi.letters().then((c) => { setChart(c); setError(null); }).catch((e) => { setError(e); setChart(null); });
    useEffect(() => { load(); }, []);
    // Every letter's sound made ahead, so a tap plays at once (2026-11-05).
    useEffect(() => {
        if (!chart) return undefined;
        return prefetch(chartSpeech(chart));
    }, [chart]);
    if (chart === undefined) return <Loading label="Opening the letters…" />;
    if (!chart) return <Problem error={error} onRetry={load} />;
    setVoiceCourse(chart.course.code);
    // Every letter's sound downloaded first, as a unit's audio is (2026-11-11).
    if (!packed && needsPack(lettersPackId(chart.course.code))) return <AudioPack chart={chart} onReady={() => setPacked(true)} onCancel={() => navigate('/linguistic')} />;
    const hear = (char, speak) => { setHeard(char); play(null, speak || char, chart.locale); };
    const voice = canSpeakIn(chart.locale);
    // The vowel signs' own lesson repeats the kagunita's first row: the table has them all.
    const groups = chart.table ? chart.groups.filter((g) => g.id !== 'signs') : chart.groups;
    return (
        <div className="space-y-5" data-letters-chart={chart.course.code}>
            <div>
                <h1 className="text-2xl font-extrabold text-[#3c3c3c] sm:text-3xl">{chart.course.name} letters <span className="font-bold text-[#AFAFAF]" lang={chart.course.code}>· {chart.course.native}</span></h1>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-[#777]"><Volume2 size={18} style={{ color: COLORS.blue.face }} /> Tap a letter to hear it. Its sound is written above it in English letters.</p>
                {!voice && <p className="mt-2 rounded-xl bg-[#FFF5D3] px-3 py-2 text-sm font-bold text-[#CD7900]" role="status">This device has no voice for {chart.course.name}: add one in its text-to-speech settings to hear the letters.</p>}
            </div>
            {groups.map((g, i) => (
                <Panel key={g.id} className="p-4 sm:p-5" data-letters-group={g.id}>
                    <h2 className="mb-3 text-lg font-extrabold text-[#3c3c3c]">{g.title} <span className="text-sm font-bold text-[#AFAFAF]">· {g.letters.length}</span></h2>
                    {/* A wide group (Chinese A–Z: 豆贝尔维 is W) gets fewer, bigger tiles, each name on one line. */}
                    <div className={`grid gap-2 ${g.wide ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6' : 'grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-7 lg:grid-cols-9'}`}>
                        {g.letters.map((l) => <Letter key={l.char} char={l.char} say={l.say} speak={l.speak} pinyin={l.pinyin} locale={chart.locale} color={TONE[i % TONE.length]} wide={g.wide} onHear={hear} heard={heard === l.char} />)}
                    </div>
                </Panel>
            ))}
            {chart.table && (
                <Panel className="p-4 sm:p-5" data-kagunita>
                    <h2 className="text-lg font-extrabold text-[#3c3c3c]">Letters with vowel signs <span className="text-sm font-bold text-[#AFAFAF]">· kagunita / barakhadi</span></h2>
                    <p className="mb-3 text-sm font-semibold text-[#777]">Each consonant with each vowel sign. Slide sideways to see them all.</p>
                    <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
                        <table className="border-separate border-spacing-1.5">
                            <thead>
                                <tr>
                                    <th aria-label="Consonant" />
                                    {chart.table.columns.map((col) => (
                                        <th key={col.say} className="px-1 text-center text-xs font-extrabold text-[#AFAFAF]" scope="col">
                                            <span className="block text-base text-[#777]" lang={chart.course.code}>{col.sign ? `◌${col.sign}` : '—'}</span>{col.say}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {chart.table.rows.map((r, i) => (
                                    <tr key={r.char} data-kagunita-row={r.say}>
                                        <th scope="row" className="sticky left-0 z-[1] bg-white pr-1 text-left text-sm font-extrabold text-[#AFAFAF]">{r.say}</th>
                                        {r.cells.map((cell) => (
                                            <td key={cell.char}><Letter char={cell.char} say={cell.say} locale={chart.locale} color={TONE[i % TONE.length]} small onHear={hear} heard={heard === cell.char} /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}
        </div>
    );
}
