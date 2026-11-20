/**
 * The units' audio packs (2026-11-06), shared by the lesson's download screen (AudioPack.jsx) and the download that
 * runs by itself in the background (audioDownloader.js, 2026-11-13): which units are on the device, and every text a
 * unit reads aloud.
 */
import { linguisticApi } from './api';
import { aiVoiceOn } from './meta';
import { letterRev } from './letterVoice';
import { buildLesson } from './session/logic';
import { stepSpeech, chartSpeech } from './speechText';

const MARK = 'lingo-pack4:'; // v2 (2026-11-11): a pack is marked only when every clip is made; v4 (2026-11-19): the letters are made again (meta.js LETTER_V), so each pack is gone over once — what is on the device already is passed over
export const packOf = (lessonId) => { try { return localStorage.getItem(MARK + lessonId); } catch { return null; } };
export const markPack = (key, lessonIds) => { try { lessonIds.forEach((id) => localStorage.setItem(MARK + id, key)); } catch { /* private mode */ } };

/** Whether this lesson's unit still needs its audio downloaded. */
export const needsPack = (lessonId) => aiVoiceOn() && !packOf(lessonId);
/** The letters page's pack id (2026-11-11: the letters page opened without its audio downloaded). */
// With the revision of the recorded letters (letterVoice.js, 2026-11-19): letters recorded again are downloaded again.
export const lettersPackId = (code) => `letters-${code}${letterRev(code) ? `-r${letterRev(code)}` : ''}`;
export const chartPack = (chart, { table = true } = {}) => ({ key: `letters:${chart.course.code}`, title: `${chart.course.name} letters`, lessons: [], chart, table, lessonIds: [lettersPackId(chart.course.code)] });

/** Every [text, lang] a pack's lessons can read aloud. */
export const speechOf = async (pack) => {
    const items = pack.lessons.flatMap((l) => { try { return buildLesson(l).flatMap(stepSpeech); } catch { return []; } });
    if (pack.chart) items.push(...chartSpeech(pack.chart, { table: pack.table !== false }));
    // A letters lesson needs the letters, not the whole table of letter combinations (2026-11-13: it waited on them).
    else if (pack.letters) { try { items.push(...chartSpeech(await linguisticApi.letters(), { table: false })); } catch { /* no letters page */ } }
    return items;
};
