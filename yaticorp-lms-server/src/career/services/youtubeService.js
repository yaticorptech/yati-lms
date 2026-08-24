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

const isAnotherLanguage = (video) => {
  const title = String(video?.title || '');
  return OTHER_LANGUAGE.test(title) || NON_LATIN_RUN.test(title);
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
const rankCandidates = (candidates, query = '', topic = '') => {
  const usable = candidates.filter((v) => v.videoId && v.durationSeconds >= MIN_USEFUL_SECONDS);
  if (!usable.length) return [];

  // English first. Kept as a preference rather than a hard filter: if every
  // candidate is in another language, a video the student can follow along
  // with visually still beats no video at all.
  const english = usable.filter((v) => !isAnotherLanguage(v));
  const pool = english.length ? english : usable;

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
    const overrun = video.durationSeconds / MAX_USEFUL_SECONDS;
    const tooLong = overrun > 1 ? Math.min(1 + (overrun - 1), 3) : 0;

    return relevance * 3 + searchRank * 1 + popularity * 0.5 - tooLong;
  };

  return pool
    .map((video, index) => ({ video, score: score(video, index) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.video);
};

const pickBest = (candidates, query, topic) => rankCandidates(candidates, query, topic)[0] || null;

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
const firstEmbeddable = async (candidates, query, topic, limit = 6) => {
  const ranked = rankCandidates(candidates, query, topic).slice(0, limit);

  for (const video of ranked) {
    if (await isEmbeddable(video.videoId)) return video;
    console.warn(`Skipping "${video.title}" — owner disabled embedding.`);
  }
  return null;
};

/** Attach the real description and chapters so the lesson can be built on them. */
const enrich = async (video) => {
  if (!video) return null;
  const details = await fetchVideoDetails(video.videoId);
  if (!details) return video;

  return {
    ...video,
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
 * Any failure returns null, which degrades to the plain search link.
 */
const searchWithoutKey = async (query, topic) => {
  try {
    const response = await fetch(searchUrlFor(query), {
      // Without a browser-ish UA YouTube serves a stripped page with no results.
      headers: BROWSER_HEADERS
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match =
      /var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s.exec(html) ||
      /ytInitialData"\]\s*=\s*(\{.*?\});/s.exec(html);
    if (!match) return null;

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

    return await enrich(await firstEmbeddable(found, query, topic));
  } catch (error) {
    console.warn('Keyless YouTube search failed:', error.message);
    return null;
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
 * @returns {Promise<object|null>} video metadata, or null when nothing suitable
 */
const findVideoForTopic = async (query, topic = '') => {
  // No key: fall back to resolving an ID from YouTube's public search page so
  // the lesson can still embed a real player rather than sending the student
  // off-site. See searchWithoutKey for the caveats.
  if (!hasApiKey()) return searchWithoutKey(query, topic);

  const search = await callApi(SEARCH_URL, {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '10',
    // Embeddable-only: a video the owner has blocked from embedding would render
    // as a blank player inside the planner.
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'strict',
    relevanceLanguage: 'en'
  });

  const ids = (search.items || []).map((item) => item.id?.videoId).filter(Boolean);
  if (!ids.length) return null;

  const details = await callApi(VIDEOS_URL, {
    part: 'snippet,contentDetails,statistics',
    id: ids.join(',')
  });

  const candidates = (details.items || [])
    .map((item) => {
      const seconds = parseDuration(item.contentDetails?.duration);
      const views = Number(item.statistics?.viewCount || 0);
      return {
        videoId: item.id,
        title: item.snippet?.title || '',
        channel: item.snippet?.channelTitle || '',
        description: item.snippet?.description || '',
        thumbnail:
          item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        publishedAt: item.snippet?.publishedAt,
        durationSeconds: seconds,
        duration: formatDuration(seconds),
        views
      };
    });

  return await enrich(pickBest(candidates, query, topic));
};

module.exports = {
  findVideoForTopic,
  formatDuration,
  hasApiKey,
  searchUrlFor,
  // Exported for tests: both are pure and decide which video a student gets.
  rankCandidates,
  isAnotherLanguage
};
