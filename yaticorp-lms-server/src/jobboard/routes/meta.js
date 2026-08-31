const express = require("express");
const Search = require("../models/Search.js");
const { isConnected } = require("../config/db.js");

const router = express.Router();

/**
 * GET /api/meta/geocode?lat=&lon=
 * Reverse-geocode proxy for the browser's "use my location" button.
 * Proxying keeps third-party calls (and any future API key) on the server.
 */
router.get("/geocode", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat and lon are required." });
    }

    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const city = d.city || d.locality || d.principalSubdivision || "";
      const country = d.countryName || "";
      const label = [city, country].filter(Boolean).join(", ");
      res.json({ label: label || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, city, country, lat, lon });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // A failed lookup shouldn't break the flow — return raw coordinates.
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return res.json({ label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, city: "", country: "", lat, lon });
    }
    next(err);
  }
});

/* Loopback and RFC1918 ranges. In local development the caller's address is
   one of these and geolocates to nothing, so we drop it and let the lookup
   resolve our own egress IP instead — same network as the user, on a dev box. */
const PRIVATE_IP =
  /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|f[cd])/i;

/**
 * GET /api/meta/ip-location
 * Coarse city/country for the caller, used to pre-fill the location box on
 * first load. Unlike the geolocation API this needs no permission prompt.
 *
 * Deliberately returns no coordinates: an IP resolves to the ISP's egress
 * city, which is routinely hundreds of km from the user (a Mangaluru
 * connection commonly reports Bengaluru). The place name is honest at
 * country level; a distance in kilometres would not be. Precise coordinates
 * come only from the browser, via /geocode above.
 */
/* Free IP-geolocation services, tried in order. More than one because any
   single free tier is liable to rate-limit or drop out, and a location box
   that silently stops pre-filling is a poor way to find that out. Each
   normalizes to { city, country }. */
const IP_SERVICES = [
  { url: (ip) => `https://ipwho.is/${ip}`, read: (d) => (d?.success === false ? null : { city: d?.city, country: d?.country }) },
  { url: (ip) => `https://ipapi.co/${ip ? ip + "/" : ""}json/`, read: (d) => (d?.error ? null : { city: d?.city, country: d?.country_name }) },
  { url: (ip) => `http://ip-api.com/json/${ip}`, read: (d) => (d?.status === "fail" ? null : { city: d?.city, country: d?.country }) },
];

router.get("/ip-location", async (req, res) => {
  const raw = String(req.ip ?? "").replace(/^::ffff:/, "");
  const ip = PRIVATE_IP.test(raw) ? "" : raw;

  for (const service of IP_SERVICES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(service.url(ip), {
        signal: ctrl.signal,
        headers: { Accept: "application/json", "User-Agent": "CareerCompass/1.0" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const hit = service.read(await r.json());
      const city = hit?.city || "";
      const country = hit?.country || "";
      const label = [city, country].filter(Boolean).join(", ");
      if (label) return res.json({ label, city, country, approximate: true });
    } catch {
      /* Try the next service. */
    } finally {
      clearTimeout(timer);
    }
  }

  // Best-effort only — a failed lookup must never break the page.
  res.json({ label: "", city: "", country: "", approximate: true });
});

/** GET /api/meta/trending — most-searched roles and skills. */
router.get("/trending", async (_req, res, next) => {
  try {
    if (!isConnected()) return res.json({ roles: [], skills: [] });

    const since = new Date(Date.now() - 30 * 86400000);
    const [roles, skills] = await Promise.all([
      Search.aggregate([
        { $match: { createdAt: { $gte: since }, role: { $ne: "" } } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 8 },
      ]),
      Search.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: "$skills" },
        { $group: { _id: "$skills", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 12 },
      ]),
    ]);

    res.json({
      roles: roles.map((r) => ({ name: r._id, count: r.count })),
      skills: skills.map((s) => ({ name: s._id, count: s.count })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/meta/history — the signed-in student's own recent searches.
 *
 * Read from the session rather than from a query parameter. The standalone app
 * took a client-generated sessionId, which inside the LMS would have meant one
 * student could read another's history by supplying their id.
 */
router.get("/history", async (req, res, next) => {
  try {
    if (!req.user?._id || !isConnected()) return res.json({ items: [] });

    const items = await Search.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(8)
      .select("skills role jobType location remoteOnly resultCount createdAt")
      .lean();

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
