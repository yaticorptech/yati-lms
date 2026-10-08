/**
 * A skill reader that needs no network.
 *
 * The Gemini-backed parser reads a resume properly — roles, education,
 * seniority. But it is metered, and on some networks it simply never
 * answers, and a student who has just uploaded a resume should still see
 * their skills reach the Jobs section. This pulls the text out of a PDF
 * with zlib and a little PDF syntax, then matches it against the job
 * board's own skill vocabulary. Deterministic, instant, and good enough to
 * prefill a search; the AI parser overrides it when it does answer.
 *
 * A Word document (.docx) is read the same way: it is a zip of XML, and the
 * text is in word/document.xml. Images, and the old binary .doc, cannot be
 * read this way and return nothing.
 */
const zlib = require('zlib');
const { ALL_SKILLS, SKILL_ALIASES } = require('../data/roles');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ── Word (.docx) text ───────────────────────────────────────────────────────

/**
 * The text of a .docx: find word/document.xml in the zip's central directory,
 * inflate it, and turn the XML into lines. Null when the file is not a zip
 * holding that part.
 */
const extractDocxText = (buffer) => {
  try {
    if (!buffer || buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) return null;
    // The end-of-central-directory record sits in the last 64 KB.
    let eocd = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
      if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return null;
    const count = buffer.readUInt16LE(eocd + 10);
    let at = buffer.readUInt32LE(eocd + 16);
    for (let n = 0; n < count && at + 46 <= buffer.length; n += 1) {
      if (buffer.readUInt32LE(at) !== 0x02014b50) return null;
      const method = buffer.readUInt16LE(at + 10);
      const size = buffer.readUInt32LE(at + 20);
      const nameLen = buffer.readUInt16LE(at + 28);
      const extraLen = buffer.readUInt16LE(at + 30);
      const commentLen = buffer.readUInt16LE(at + 32);
      const local = buffer.readUInt32LE(at + 42);
      const name = buffer.slice(at + 46, at + 46 + nameLen).toString('utf8');
      if (name === 'word/document.xml') {
        const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        const raw = buffer.slice(start, start + size);
        const xml = (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
        return xml
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<\/w:p>|<w:br\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
          .replace(/[ \t]+/g, ' ')
          .trim() || null;
      }
      at += 46 + nameLen + extraLen + commentLen;
    }
    return null;
  } catch {
    return null;
  }
};

// ── PDF text ────────────────────────────────────────────────────────────────

// Unescape a PDF literal string: \( \) \\ \n and octal codes.
const literal = (s) => s
  .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
  .replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, ' ')
  .replace(/\\([()\\])/g, '$1');

const hex = (h) => {
  const clean = h.replace(/[^0-9a-fA-F]/g, '');
  let out = '';
  // Two-byte (Identity-H) text is unreadable without the font's map; try
  // one byte per glyph first and keep it only if it looks like text.
  for (let i = 0; i + 1 < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return out;
};

// Text-showing operators inside one content stream, in order.
const textFromContent = (content) => {
  const parts = [];
  // (string) Tj / '  and [ (a) -20 (b) ] TJ
  const re = /\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")|<([0-9a-fA-F\s]+)>\s*Tj|(T\*|Td|TD|Tm|ET)/g;
  let m;
  while ((m = re.exec(content))) {
    if (m[1] != null) {
      const inner = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>|(-?\d+\.?\d*)/g;
      let x; let s = '';
      while ((x = inner.exec(m[1]))) {
        if (x[1] != null) s += literal(x[1]);
        else if (x[2] != null) s += hex(x[2]);
        else if (Number(x[3]) < -180) s += ' '; // a big kern is a space
      }
      parts.push(s);
    } else if (m[2] != null) parts.push(literal(m[2]));
    else if (m[3] != null) parts.push(hex(m[3]));
    else parts.push('\n'); // a text-position change is a line break, near enough
  }
  return parts.join('');
};

const extractPdfText = (buffer) => {
  const src = buffer.toString('latin1');
  const out = [];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = re.exec(src))) {
    const head = src.slice(Math.max(0, m.index - 400), m.index);
    let body = Buffer.from(m[1], 'latin1');
    if (/\/FlateDecode/.test(head)) {
      try { body = zlib.inflateSync(body); } catch { try { body = zlib.inflateSync(body, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch { continue; } }
    } else if (/\/Filter/.test(head)) {
      continue; // an image or an encoding this reader does not speak
    }
    const content = body.toString('latin1');
    if (!/\b(Tj|TJ)\b/.test(content)) continue;
    out.push(textFromContent(content));
  }
  return out.join('\n').replace(/[^\x20-\x7E\n]+/g, ' ').replace(/[ \t]+/g, ' ').trim();
};

// ── Skills ──────────────────────────────────────────────────────────────────

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word boundaries that also work for "C++", "C#", ".NET", "Node.js".
const boundary = (term) => new RegExp(`(?<![A-Za-z0-9+#.])${escapeRe(term)}(?![A-Za-z0-9+#])`, 'i');

// Alias keys and canonical names, longest first so "React Native" wins over "React".
const TERMS = (() => {
  const seen = new Map();
  for (const s of ALL_SKILLS) seen.set(s.toLowerCase(), s);
  for (const [alias, canon] of Object.entries(SKILL_ALIASES)) if (!seen.has(alias.toLowerCase())) seen.set(alias.toLowerCase(), canon);
  return [...seen.entries()].map(([term, canon]) => ({ term, canon, re: boundary(term) })).sort((a, b) => b.term.length - a.term.length);
})();

// Two-letter terms ("Go", "R", "C") match ordinary prose too often; require
// them to sit in a skills-looking context: a list, or beside another skill.
const SHORT = 2;

const skillsFromText = (text) => {
  if (!text) return [];
  const found = new Map();
  for (const t of TERMS) {
    if (t.term.length <= SHORT) {
      // …and must be a whole token, not the tail of "React" or "Object".
      const ctx = new RegExp(`(?:[,•|/·\\-:]\\s*|\\bskills?\\b[^\\n]{0,40}[\\s,:/|])(?<![A-Za-z0-9+#.])${escapeRe(t.term)}(?![A-Za-z0-9+#])`, 'i');
      if (!ctx.test(text)) continue;
    } else if (!t.re.test(text)) continue;
    if (!found.has(t.canon)) found.set(t.canon, true);
    if (found.size >= 30) break;
  }
  return [...found.keys()];
};

const experienceFromText = (text) => {
  const m = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i.exec(text || '');
  return m ? Math.min(40, Number(m[1])) : 0;
};

/**
 * @returns {{ skills: string[], skillsRaw: string[], experienceYears: number, text: string } | null}
 *          null when the file is not a PDF or .docx this reader can open.
 */
const localParse = (buffer, mimeType = 'application/pdf') => {
  if (!buffer) return null;
  let text = null;
  if (mimeType === DOCX_MIME) text = extractDocxText(buffer);
  else if (mimeType === 'application/pdf' && buffer.slice(0, 5).toString('latin1') === '%PDF-') text = extractPdfText(buffer);
  if (!text) return null;
  const skills = skillsFromText(text);
  return { skills, skillsRaw: [...skills], experienceYears: experienceFromText(text), text };
};

module.exports = { localParse, extractPdfText, extractDocxText, skillsFromText, DOCX_MIME };
