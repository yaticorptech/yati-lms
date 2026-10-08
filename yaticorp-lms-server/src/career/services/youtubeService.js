/**
 * YouTube Data API v3 lookup for a single, real, watchable video.
 *
 * The AI cannot know real video IDs — inventing them produces dead links, which
 * is why the older skill-level study pack only ever emitted search queries. Here
 * we resolve one concrete video up front so the notes and quiz can be written
 * *about that video* rather than about the topic in the abstract.
 */

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

// Long lectures make poor daily-task material: a student with a 30-minute task
// will not finish a 3-hour conference talk. Anything past this is deprioritised.
const MAX_USEFUL_SECONDS = 45 * 60;

// Under two minutes is almost always a teaser, a short, or an ad.
const MIN_USEFUL_SECONDS = 120;

/** ISO 8601 duration (PT1H2M10S) -> seconds. */
const parseDuration = (iso) => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
};

/** Seconds -> "12:04" / "1:02:10", for display next to the player. */
const formatDuration = (seconds) => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/**
 * The API returns a generic 403 for several unrelated problems. Mapping them
 * here means the student sees what to fix instead of "Request failed with 403".
 */
const describeError = (status, body) => {
  const reason = body?.error?.errors?.[0]?.reason || '';
  if (status === 403 && reason === 'quotaExceeded') {
    return 'YouTube API daily quota exceeded. It resets at midnight Pacific Time.';
  }
  if (status === 403) {
    return 'YouTube API rejected the key. Check that YouTube Data API v3 is enabled for this key in Google Cloud, and that any HTTP-referrer restriction allows server-side use.';
  }
  if (status === 400) {
    return 'YouTube API rejected the request — the API key in YOUTUBE_API_KEY looks malformed.';
  }
  return body?.error?.message || `YouTube API request failed (HTTP ${status}).`;
};

/** Whether a real video lookup is possible at all. */
const hasApiKey = () => Boolean(process.env.YOUTUBE_API_KEY?.trim());

/** The search URL used when no key is configured, or a lookup returns nothing. */
const searchUrlFor = (query) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const callApi = async (url, params) => {
  const query = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  const response = await fetch(`${url}?${query}`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(describeError(response.status, body));
  }
  return body;
};

// Words that carry no topic signal, so they must not count towards a match.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'for', 'and', 'or', 'to', 'in', 'on', 'of', 'with', 'how',
  'what', 'why', 'your', 'you', 'is', 'are', 'be', 'learn', 'learning', 'tutorial',
  'guide', 'course', 'video', 'explained', 'beginners', 'beginner', 'introduction',
  'intro', 'basics', 'basic', 'crash', 'full', 'complete', 'best', 'top', 'easy',
  // Instruction words. A task reads "Spend 45 minutes practising CSS Flexbox
  // alignment"; only the last three words describe a video. Leaving the rest in
  // dilutes every candidate's score equally and flattens the differences that
  // decide which video the student actually gets.
  'spend', 'minute', 'minutes', 'hour', 'hours', 'day', 'today', 'week', 'using',
  'practise', 'practice', 'practising', 'practicing', 'revise', 'revision',
  'study', 'studying', 'build', 'building', 'write', 'writing', 'read', 'reading',
  'understand', 'understanding', 'solve', 'solving', 'review', 'reviewing',
  'watch', 'watching', 'finish', 'finishing', 'first', 'own', 'them', 'then'
]);

/**
 * Videos taught in another language.
 *
 * The lesson around the video — its notes, its quiz, every word of this app —
 * is in English, so a tutorial in Hindi or Tamil is the wrong video however
 * well it matches the topic. "Git Branching and Merging - Detailed Tutorial in
 * Hindi" was a real pick for an English task.
 *
 * Two signals: a title that says so outright, and a title written in a
 * non-Latin script. Both are checked against the title only — descriptions are
 * full of multilingual boilerplate and would reject half of YouTube.
 */
const OTHER_LANGUAGE = new RegExp(
  [
    'in\\s+(hindi|urdu|tamil|telugu|kannada|malayalam|marathi|gujarati|punjabi|bengali|bangla',
    '|nepali|sinhala|arabic|spanish|french|german|portuguese|russian|chinese|japanese|korean',
    '|indonesian|vietnamese|thai|turkish|persian|filipino|tagalog)\\b',
    '|\\b(hindi|urdu|tamil|telugu|kannada|malayalam|marathi|bangla)\\s+(me|mai|mein|version|language)\\b',
    '|\\b(en\\s+espa|auf\\s+deutsch|en\\s+fran)'
  ].join(''),
  'i'
);

// A run of letters from a non-Latin writing system. One stray glyph is not
// enough — titles pick up decorative characters — but several in a row means
// the title itself is written in that script.
const NON_LATIN_RUN =
  /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]{3,}/;

/**
 * Channels that teach in Hindi under English titles. The title checks above
 * cannot see these — "Verify JWT Token in Node.js" from Thapa Technical is
 * spoken in Hindi — and the keyless search path has no audio-language field to
 * fall back on. Lower-case, compared against the whole channel name.
 */
const HINDI_CHANNELS = new Set([
  'thapa technical', 'codewithharry', 'code with harry', 'apna college', 'chai aur code',
  'hitesh choudhary', 'geeky shows', 'technical suneja', 'wscube tech', 'love babbar',
  'coder army', 'anuj bhaiya', 'sheryians coding school', 'yahoo baba', 'learn code with durgesh',
  'easy engineering classes', 'gate smashers', 'knowledge gate', 'knowledgegate', 'codehelp - by babbar',
  'technical guftgu', 'satish dhawale', 'piyush garg', 'rohit negi', 'ritik saxena', 'bhanu priya',
  'code step by step', 'study glance', 'great learning hindi', 'edureka hindi', 'simplilearn hindi',
  'intellipaat hindi', 'ultimate code', 'pw skills', 'physics wallah', 'skillvertex hindi',
  'college wallah', 'code with sk', 'tech gun', 'coding wallah', 'lecture by sumit'
]);

const DEVANAGARI = /[\u0900-\u097F]/g;

/** The audio language YouTube reports, e.g. 'en', 'en-IN', 'hi'. Empty when unknown. */
const audioOf = (video) => String(video?.audioLanguage || '').toLowerCase();

const isHindiChannel = (video) => HINDI_CHANNELS.has(String(video?.channel || '').trim().toLowerCase());

/**
 * Spoken in Hindi, as far as we can tell. A known Hindi-teaching channel wins
 * outright: several of them (Thapa Technical, Piyush Garg) label their Hindi
 * videos as English audio, so YouTube's own field cannot be trusted over it.
 * Otherwise the audio language when the API gives one, else a title that says
 * so, or a description with real Devanagari text in it (a few glyphs are
 * boilerplate; a sentence's worth is the creator writing in Hindi).
 */
const isHindi = (video) => {
  if (isHindiChannel(video)) return true;
  const audio = audioOf(video);
  if (audio) return audio.startsWith('hi');
  const title = String(video?.title || '');
  const description = String(video?.description || '');
  return (
    /\bhindi\b/i.test(title) ||
    /[\u0900-\u097F]{3,}/.test(title) ||
    (description.match(DEVANAGARI) || []).length >= 15
  );
};

/** The languages a student can ask for, with the name used in the search. */
const LANGUAGES = { en: 'English', hi: 'Hindi' };

/** 'en' or 'hi' for a video we can place; 'other' for anything else. */
const languageOf = (video) => {
  if (isHindi(video)) return 'hi';
  return isAnotherLanguage(video) ? 'other' : 'en';
};

const isAnotherLanguage = (video) => {
  if (isHindiChannel(video)) return true;
  const title = String(video?.title || '');
  if (OTHER_LANGUAGE.test(title) || NON_LATIN_RUN.test(title)) return true;
  // The audio language decides the rest when YouTube reports one.
  const audio = audioOf(video);
  if (audio) return !audio.startsWith('en');
  return isHindi(video);
};

const keywords = (text) =>
  new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );

/**
 * Rank candidates for THIS task, not by popularity alone.
 *
 * Sorting purely on view count was the reason a lesson could arrive with a
 * hugely popular but tangential video: "react hooks" would surface a famous
 * general React course over the precise hooks tutorial. Relevance leads now —
 * how much of the search topic appears in the title, and where YouTube itself
 * ranked it — with views only breaking ties between equally relevant videos.
 */
// Titles of things that are not a lesson on one topic: long compilations,
// whole courses, streams and shorts. Penalised, not banned — sometimes they
// are all a niche topic has.
const NOT_A_LESSON = /\b(compilation|full course|complete course|one shot|marathon|live stream|livestream|#shorts?|podcast)\b/i;

/** '45 mins' / '2 hours' / '1.5 hrs' -> minutes, or 0 when it cannot be read. */
const parseBudgetMinutes = (text) => {
  const match = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i.exec(String(text || ''));
  if (!match) return 0;
  const n = Number(match[1]);
  return /^h/i.test(match[2]) ? n * 60 : n;
};

const rankCandidates = (candidates, query = '', topic = '', lang = 'en', { budgetMinutes = 0 } = {}) => {
  const usable = candidates.filter((v) => v.videoId && v.durationSeconds >= MIN_USEFUL_SECONDS);
  if (!usable.length) return [];

  // The student's language first — English unless they asked for Hindi. Kept
  // as a preference rather than a hard filter: if every candidate is in
  // another language, a video they can follow along with visually still beats
  // no video at all.
  const preferred = usable.filter((v) => (lang === 'hi' ? isHindi(v) : !isAnotherLanguage(v)));
  // No video in the asked-for language falls back to English before anything
  // else.
  const english = usable.filter((v) => !isAnotherLanguage(v));
  const pool = preferred.length ? preferred : english.length ? english : usable;

  // The search phrase is written by a model and can drift from the task it came
  // from ("practise CSS flexbox alignment" -> "css tutorial"). Scoring against
  // the task's own words as well means a drifting phrase cannot pull the pick
  // away from what the student was actually asked to do.
  const wanted = new Set([...keywords(query), ...keywords(topic)]);
  const total = pool.length;

  // How well the best candidate does, so relevance can be scored as "compared
  // with the other options" rather than as a fraction of every word in the
  // topic. Dividing by the whole topic made a long task title deflate every
  // candidate equally — the scores stayed far enough apart in absolute terms
  // that YouTube's own ordering decided the pick, and a general "CSS Full
  // Course" beat the exact flexbox-alignment tutorial that was asked for.
  const matchesOf = (video) => {
    const inTitle = keywords(video.title);
    return [...wanted].filter((word) => inTitle.has(word)).length;
  };
  const bestMatch = Math.max(1, ...pool.map(matchesOf));

  const score = (video, index) => {
    const matched = matchesOf(video);

    // 0..1, measured against the most on-topic candidate available.
    const relevance = matched / bestMatch;
    // 0..1, YouTube's own relevance ordering — a decent tiebreaker, but no
    // longer strong enough to override being on-topic.
    const searchRank = total > 1 ? 1 - index / (total - 1) : 1;
    // 0..1-ish, compressed so a 10M-view video cannot outweigh being on-topic.
    const popularity = Math.min(Math.log10(video.views + 10) / 7, 1);

    // A task is half an hour; a three-hour conference talk is not a lesson for
    // it however popular. The penalty grows with the overrun instead of being a
    // flat nudge that popularity simply absorbed.
    // The ceiling follows the task's own time budget when it has one — a video
    // should leave time to read the notes and take the quiz — within 10 to 45
    // minutes.
    const maxSeconds = budgetMinutes
      ? Math.min(MAX_USEFUL_SECONDS, Math.max(10 * 60, budgetMinutes * 60 * 0.75))
      : MAX_USEFUL_SECONDS;
    const overrun = video.durationSeconds / maxSeconds;
    const tooLong = overrun > 1 ? Math.min(1 + (overrun - 1), 3) : 0;
    const notALesson = NOT_A_LESSON.test(video.title) ? 1 : 0;

    return relevance * 3 + searchRank * 1 + popularity * 0.5 - tooLong - notALesson;
  };

  return pool
    .map((video, index) => ({ video, score: score(video, index) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.video);
};

/**
 * The candidates in the order to try them: ranked, minus any to skip (the
 * video the student just asked to replace), with the chooser's pick moved to
 * the front. The chooser reads only the top of the ranking — that is where
 * the on-topic videos are, and a short list keeps its call cheap.
 *
 * `rejected` is true when the chooser read the shortlist and said none of it
 * teaches the task; `retry` is the search it suggested instead. A chooser that
 * fails leaves the ranking as it is — picking the video is never worth
 * failing the lesson over.
 */
const SHORTLIST = 8;
const orderCandidates = async (candidates, query, topic, { lang = 'en', exclude = [], choose, budgetMinutes } = {}) => {
  const skip = new Set(exclude.filter(Boolean));
  const ranked = rankCandidates(candidates, query, topic, lang, { budgetMinutes }).filter((v) => !skip.has(v.videoId));
  if (!choose || !ranked.length) return { ordered: ranked, rejected: false, retry: null };

  try {
    const shortlist = ranked.slice(0, SHORTLIST);
    const answer = await choose(shortlist);
    const index = typeof answer === 'number' ? answer : Number(answer?.index ?? -1);
    if (index >= 0 && index < shortlist.length) {
      return { ordered: [shortlist[index], ...ranked.filter((_, i) => i !== index)], rejected: false, retry: null };
    }
    return { ordered: ranked, rejected: true, retry: typeof answer === 'object' ? answer?.search || null : null };
  } catch (error) {
    console.warn('Video choice failed, using the ranking:', error.message);
    return { ordered: ranked, rejected: false, retry: null };
  }
};

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Chapter markers from a description ("0:39 flex-direction").
 *
 * These are the single best description of what a video actually teaches and in
 * what order — effectively the creator's own syllabus. Captions would be better
 * still, but YouTube now gates the timedtext endpoint (it answers 200 with an
 * empty body from a server), so chapters are the richest signal available.
 */
const extractChapters = (description = '') => {
  const chapters = [];
  for (const line of description.split('\n')) {
    const match = /^\s*\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-–—:.]?\s*(.+?)\s*$/.exec(line);
    if (match && match[2].length > 1 && match[2].length < 90) {
      chapters.push({ time: match[1], label: match[2] });
    }
  }
  // One or two stray timestamps in prose are not a chapter list.
  return chapters.length >= 3 ? chapters : [];
};

/**
 * Full description and chapters for one video, from its watch page.
 *
 * Search results carry only a truncated snippet — usually the sponsor blurb —
 * which is a poor basis for notes. One extra request buys the real description.
 */
const fetchVideoDetails = async (videoId) => {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: BROWSER_HEADERS
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match = /ytInitialPlayerResponse\s*=\s*(\{.*?\});/s.exec(html);
    if (!match) return null;

    const details = JSON.parse(match[1]).videoDetails || {};
    const description = details.shortDescription || '';

    return {
      description,
      chapters: extractChapters(description),
      keywords: details.keywords || []
    };
  } catch (error) {
    console.warn('Could not fetch video details:', error.message);
    return null;
  }
};

/**
 * Whether a video may be played inside another site.
 *
 * The official search API filters this with videoEmbeddable=true; the keyless
 * path cannot, and roughly one in three popular tutorials disables embedding.
 * oEmbed answers 401 for those, needs no key, and is a single cheap request —
 * without this check the planner would regularly render "Video unavailable".
 */
const isEmbeddable = async (videoId) => {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    // A network blip should not disqualify an otherwise good video.
    return true;
  }
};

/** The best-ranked candidate that will actually play inline. */
const firstEmbeddable = async (ordered, limit = 6) => {
  for (const video of ordered.slice(0, limit)) {
    if (await isEmbeddable(video.videoId)) return video;
    console.warn(`Skipping "${video.title}" — owner disabled embedding.`);
  }
  return null;
};

/** Attach the real description and chapters so the lesson can be built on them. */
const enrich = async (video) => {
  if (!video) return null;
  const details = await fetchVideoDetails(video.videoId);
  if (!details) return { ...video, language: languageOf(video) };

  return {
    ...video,
    language: languageOf(video),
    // The watch-page description is the full text; keep the snippet only if the
    // fetch came back empty.
    description: details.description || video.description,
    chapters: details.chapters
  };
};

/** "20:37" / "1:02:10" -> seconds. */
const parseClockDuration = (text) => {
  if (!text) return 0;
  const parts = text.split(':').map((n) => parseInt(n, 10));
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

/** "1,234,567 views" -> 1234567 */
const parseViews = (text) => Number(String(text || '').replace(/[^\d]/g, '')) || 0;

/**
 * Resolve a video from YouTube's public search page, with no API key.
 *
 * The search page embeds its results as JSON in a `ytInitialData` blob; reading
 * that is far steadier than scraping rendered markup, but it is still an
 * UNOFFICIAL route. It can break whenever YouTube changes their page shape, it
 * cannot filter for embeddable-only (so an occasional pick may refuse to play
 * inline), and it is slower than the API. Setting YOUTUBE_API_KEY switches back
 * to the supported path automatically.
 *
 * Returns the candidates found; any failure returns none, which degrades to
 * the plain search link.
 */
const candidatesWithoutKey = async (query) => {
  try {
    const response = await fetch(searchUrlFor(query), {
      // Without a browser-ish UA YouTube serves a stripped page with no results.
      headers: BROWSER_HEADERS
    });
    if (!response.ok) return [];

    const html = await response.text();
    const match =
      /var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s.exec(html) ||
      /ytInitialData"\]\s*=\s*(\{.*?\});/s.exec(html);
    if (!match) return [];

    const data = JSON.parse(match[1]);

    // Results are nested several containers deep and the shape shifts between
    // layouts, so walk the tree for videoRenderer nodes rather than indexing a
    // fixed path that would break on the next redesign.
    const found = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.videoRenderer?.videoId) {
        const v = node.videoRenderer;
        const seconds = parseClockDuration(v.lengthText?.simpleText);
        found.push({
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || '',
          channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
          description:
            v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join('') ||
            v.descriptionSnippet?.runs?.map((r) => r.text).join('') ||
            '',
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          durationSeconds: seconds,
          duration: formatDuration(seconds),
          views: parseViews(v.viewCountText?.simpleText)
        });
      }
      for (const key of Object.keys(node)) walk(node[key]);
    };
    walk(data);

    return found;
  } catch (error) {
    console.warn('Keyless YouTube search failed:', error.message);
    return [];
  }
};

/**
 * Find the best teaching video for a task.
 *
 * Two calls: search returns matches but no duration, so a second videos.list
 * call fetches contentDetails/statistics for ranking. Both are cheap against the
 * default 10,000-unit daily quota (search is 100 units, videos.list is 1).
 *
 * @param {string} query  the search phrase written for this task
 * @param {string} [topic] the task's own title, used to keep ranking anchored
 *                         to what was actually asked when the phrase drifts
 * @param {object} [options]
 * @param {'en'|'hi'} [options.lang] the language the student wants the video in
 * @param {string[]} [options.exclude] video ids not to return (the one being replaced)
 * @param {string} [options.budget] the task's time budget, e.g. '45 mins'
 * @param {(shortlist: object[]) => Promise<number>} [options.choose] picks the
 *        best of the top candidates for the task; -1 for none
 * @returns {Promise<object|null>} video metadata, or null when nothing suitable
 */
const findVideoForTopic = async (query, topic = '', { lang = 'en', exclude = [], budget, choose } = {}) => {
  if (!LANGUAGES[lang]) lang = 'en';
  const options = { lang, exclude, choose, budgetMinutes: parseBudgetMinutes(budget) };
  // Asking for Hindi says so in the search itself; YouTube's
  // relevanceLanguage alone barely moves the results for Indian tech topics.
  const inLanguage = (q) => (lang !== 'en' && !new RegExp(LANGUAGES[lang], 'i').test(q) ? `${q} in ${LANGUAGES[lang]}` : q);

  // No key: fall back to resolving IDs from YouTube's public search page so
  // the lesson can still embed a real player rather than sending the student
  // off-site. See candidatesWithoutKey for the caveats.
  const fetchCandidates = (q) => (hasApiKey() ? candidatesFromApi(q, lang) : candidatesWithoutKey(q));
  const pass = async (q) => orderCandidates(await fetchCandidates(q), q, topic, options);

  let result = await pass(inLanguage(query));

  // The chooser read the whole shortlist and none of it teaches the task —
  // a vague search ("solve 2 LeetCode problems") or an unusual topic. One more
  // search with the phrase it suggested, and keep it only if that one finds a
  // fit; a second search is 100 quota units, so it is spent only here.
  if (result.rejected && result.retry) {
    try {
      const second = await pass(inLanguage(result.retry));
      if (!second.rejected && second.ordered.length) result = second;
    } catch (error) {
      console.warn('Second video search failed:', error.message);
    }
  }

  const pick = hasApiKey() ? result.ordered[0] : await firstEmbeddable(result.ordered);
  return await enrich(pick || null);
};

/**
 * One search through the official API.
 *
 * Two calls: search returns matches but no duration, so a second videos.list
 * call fetches contentDetails/statistics for ranking.
 */
const candidatesFromApi = async (query, lang) => {
  const search = await callApi(SEARCH_URL, {
    part: 'snippet',
    q: query,
    type: 'video',
    // Wide enough that the English pick survives a first page dominated by
    // Hindi-language tutorials; a search costs the same 100 units either way.
    maxResults: '25',
    // Embeddable-only: a video the owner has blocked from embedding would render
    // as a blank player inside the planner.
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'strict',
    relevanceLanguage: lang
  });

  const ids = (search.items || []).map((item) => item.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  const details = await callApi(VIDEOS_URL, {
    part: 'snippet,contentDetails,statistics',
    id: ids.join(',')
  });

  return (details.items || []).map((item) => {
    const seconds = parseDuration(item.contentDetails?.duration);
    return {
      videoId: item.id,
      title: item.snippet?.title || '',
      channel: item.snippet?.channelTitle || '',
      description: item.snippet?.description || '',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt,
      // What YouTube says is spoken. The reliable signal when it is set —
      // titles are English on plenty of Hindi tutorials.
      audioLanguage: item.snippet?.defaultAudioLanguage || '',
      durationSeconds: seconds,
      duration: formatDuration(seconds),
      views: Number(item.statistics?.viewCount || 0)
    };
  });
};

module.exports = {
  findVideoForTopic,
  formatDuration,
  hasApiKey,
  searchUrlFor,
  // Exported for tests: both are pure and decide which video a student gets.
  rankCandidates,
  isAnotherLanguage,
  isHindi,
  languageOf,
  LANGUAGES
};
