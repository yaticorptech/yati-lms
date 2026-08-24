/**
 * Repair a mentor reply so its lists render as lists.
 *
 * The model sometimes writes bullets as literal "•" characters strung along a
 * single line — "• Razorpay for X. • Zomato for Y." Markdown has no idea that
 * is a list, so it renders as one long paragraph and the reader has to unpick
 * three items from a wall of text.
 *
 * The prompt now asks for proper markdown, but a prompt is a request, not a
 * guarantee, and there are replies already saved in the database written the
 * old way. Normalising at render time fixes both at once.
 */

// The bullet characters models actually reach for.
const BULLETS = '[•●◦‣▪·]';

export function toMentorMarkdown(text) {
  if (typeof text !== 'string' || !text) return '';

  let out = text.replace(/\r\n/g, '\n');

  // A bullet part-way through a line starts a new line instead.
  out = out.replace(new RegExp(`[ \\t]*${BULLETS}[ \\t]+`, 'g'), (match, offset, whole) =>
    offset === 0 || whole[offset - 1] === '\n' ? match : '\n' + match.trimStart()
  );

  // Every bullet character becomes a markdown list marker.
  out = out.replace(new RegExp(`^[ \\t]*${BULLETS}[ \\t]+`, 'gm'), '- ');

  // A list has to start on its own line to be a list. Give it a blank line
  // after a paragraph, but never between two items of the same list.
  const lines = out.split('\n');
  const repaired = [];
  lines.forEach((line, i) => {
    const isItem = /^[ \t]*(?:-|\d+\.)[ \t]+/.test(line);
    const previous = lines[i - 1];
    const previousIsItem = previous !== undefined && /^[ \t]*(?:-|\d+\.)[ \t]+/.test(previous);
    if (isItem && previous !== undefined && previous.trim() && !previousIsItem) {
      repaired.push('');
    }
    repaired.push(line);
  });

  // Three or more blank lines read as a gap in the conversation; collapse them.
  return repaired.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
