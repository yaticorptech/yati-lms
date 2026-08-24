/**
 * @description Shareable milestone badges for completed roadmap phases.
 *
 * Two of these endpoints are PUBLIC and unauthenticated, which is the whole
 * point: LinkedIn, X and WhatsApp fetch a shared link with a crawler that has
 * no session and never will. What protects a badge is that its `shareCode` is
 * 16 random hex characters and nothing else in the response identifies the
 * student beyond the name they chose to put on it.
 */
const MilestoneBadge = require('../models/MilestoneBadge');
const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const User = require('../../models/User');
const { renderBadge } = require('../services/badgeImage');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

/** The label a phase shows on the roadmap, so the badge matches the page. */
const phaseTitleOf = (phase, index) =>
  phase?.phase || phase?.title || `Phase ${index + 1}`;

/**
 * Where this server is reachable from the outside.
 *
 * Behind a proxy the request's own host is the internal one, so the forwarded
 * headers win, and an explicit PUBLIC_API_URL wins over both — a share link is
 * permanent and pointing it at an internal hostname cannot be taken back once
 * a student has posted it.
 */
const publicBaseUrl = (req) => {
  const configured = process.env.PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}`;
};

/** Where the student app lives, for the "open in the app" link on the page. */
const appBaseUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Share links live at /b/<code>, not under /api.
 *
 * A student pastes this into LinkedIn and people click it. A URL that reads
 * .../api/career/milestones/<code> announces itself as plumbing; /b/<code> is
 * short enough to survive being retyped and looks like a link to a page,
 * which is what it is.
 */
const linksFor = (req, badge) => {
  const base = `${publicBaseUrl(req)}/b/${badge.shareCode}`;
  return { shareUrl: base, imageUrl: `${base}/image.png` };
};

const publicShape = (req, badge) => ({
  _id: badge._id,
  phaseIndex: badge.phaseIndex,
  phaseTitle: badge.phaseTitle,
  studentName: badge.studentName,
  careerGoal: badge.careerGoal,
  shareCode: badge.shareCode,
  issuedAt: badge.issuedAt,
  ...linksFor(req, badge)
});

// @desc    Issue (or fetch) the badge for a completed roadmap phase
// @route   POST /api/career/milestones/badge
// @access  Private
const issuePhaseBadge = async (req, res) => {
  try {
    const index = Number(req.body.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: 'A non-negative phase index is required.' });
    }

    const userId = req.user._id;
    const [roadmap, goal, user] = await Promise.all([
      Roadmap.findOne({ userId }),
      Goal.findOne({ userId }),
      User.findById(userId)
    ]);

    if (!roadmap) return res.status(404).json({ message: 'No roadmap found.' });

    const phases = roadmap.roadmapData?.educationRoadmap || [];
    if (index >= phases.length) {
      return res.status(400).json({ message: 'Phase index is out of range.' });
    }

    // Earned, not merely requested. Without this anyone could mint a badge for
    // a phase they have not started by calling the endpoint directly, and a
    // badge nobody had to earn is not worth posting.
    if (!(roadmap.completedPhases || []).includes(index)) {
      return res.status(400).json({ message: 'That phase is not completed yet.' });
    }

    let badge = await MilestoneBadge.findOne({ userId, phaseIndex: index });
    if (!badge) {
      badge = await MilestoneBadge.create({
        userId,
        phaseIndex: index,
        phaseTitle: phaseTitleOf(phases[index], index),
        studentName: user.name,
        careerGoal: goal?.careerGoal || ''
      });
    }

    res.status(200).json(publicShape(req, badge));
  } catch (error) {
    console.error('Milestone badge error:', error);
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    Every milestone badge this student has earned
// @route   GET /api/career/milestones
// @access  Private
const getMyBadges = async (req, res) => {
  try {
    const badges = await MilestoneBadge.find({ userId: req.user._id })
      .sort({ phaseIndex: 1 })
      .lean();
    res.status(200).json(badges.map((b) => publicShape(req, b)));
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    The badge image
// @route   GET /b/:code/image.png
// @access  PUBLIC — social crawlers have no session
const getBadgeImage = async (req, res) => {
  try {
    const badge = await MilestoneBadge.findOne({ shareCode: req.params.code }).lean();
    if (!badge) return res.status(404).json({ message: 'No such badge.' });

    const png = await renderBadge(badge);
    res.setHeader('Content-Type', 'image/png');
    // Immutable: the badge is a snapshot and never changes once issued, so a
    // crawler that caches it forever is caching the right thing.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', png.length);
    res.send(png);
  } catch (error) {
    console.error('Badge image error:', error);
    if (!res.headersSent) res.status(error.status || 500).json(aiAwareBody(error));
  }
};

/**
 * Escape for HTML.
 *
 * The phase title comes from a language model and the name comes from the
 * student, and both land in a public page. Neither is trustworthy enough to
 * interpolate raw — a roadmap phase containing a `<script>` would otherwise run
 * for every person who opened the share link.
 */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// @desc    The page a shared badge link opens
// @route   GET /b/:code
// @access  PUBLIC
const getBadgePage = async (req, res) => {
  try {
    const badge = await MilestoneBadge.findOne({ shareCode: req.params.code }).lean();
    if (!badge) {
      return res.status(404).type('html').send(
        '<!doctype html><meta charset="utf-8"><title>Badge not found</title>' +
        '<body style="font-family:system-ui;padding:3rem;text-align:center">' +
        '<h1>Badge not found</h1><p>This link may have expired or been mistyped.</p></body>'
      );
    }

    const { shareUrl, imageUrl } = linksFor(req, badge);

    // Composed from the RAW values and escaped exactly once, at the point each
    // string is written into the page. Escaping first and composing after would
    // double-encode: an ampersand in a student's name became "&amp;amp;".
    const pageTitle = `${badge.studentName} completed ${badge.phaseTitle} — YATICORP Career Path`;
    const description = badge.careerGoal
      ? `A Career Path milestone on the way to becoming a ${badge.careerGoal}.`
      : 'A Career Path milestone at YATICORP.';
    const heading = `${badge.studentName} completed ${badge.phaseTitle}`;
    const name = escapeHtml(badge.studentName);
    const title = escapeHtml(badge.phaseTitle);
    const issued = new Date(badge.issuedAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">

<!-- Open Graph: what LinkedIn, WhatsApp and Facebook read. -->
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:site_name" content="YATICORP">

<!-- Twitter/X reads its own set and ignores most of the above. -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(pageTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem;
    background: radial-gradient(1200px 600px at 50% -10%, #1e2faf, #0b0f15);
    color: #f1f5f9;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .card { width: min(720px, 100%); text-align: center; }
  img { width: 100%; height: auto; border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,.5); display: block; }
  h1 { font-size: 1.35rem; margin: 1.75rem 0 .4rem; line-height: 1.3; }
  p  { margin: 0; color: #9dabbd; font-size: .95rem; line-height: 1.6; }
  .cta {
    display: inline-block; margin-top: 1.75rem; padding: .8rem 1.5rem; border-radius: 12px;
    background: #2547eb; color: #fff; font-weight: 700; text-decoration: none; font-size: .95rem;
  }
  .cta:hover { background: #1d35d8; }
  footer { margin-top: 2rem; font-size: .75rem; color: #5f6e85; letter-spacing: .08em; text-transform: uppercase; }
</style>
</head>
<body>
  <main class="card">
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(heading)}" width="1200" height="630">
    <h1>${name} completed ${title}</h1>
    <p>${escapeHtml(description)}<br>Awarded ${escapeHtml(issued)}.</p>
    <a class="cta" href="${escapeHtml(appBaseUrl())}">Start your own Career Path</a>
    <footer>YATICORP · Career Path</footer>
  </main>
</body>
</html>`);
  } catch (error) {
    console.error('Badge page error:', error);
    res.status(500).type('html').send('<!doctype html><meta charset="utf-8"><p>Something went wrong.</p>');
  }
};

module.exports = { issuePhaseBadge, getMyBadges, getBadgeImage, getBadgePage };
