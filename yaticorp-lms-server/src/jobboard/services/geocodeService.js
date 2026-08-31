/**
 * Resolves the places named by stored listings into coordinates.
 *
 * The engine behind both `npm run jobs:geocode` (unbounded, with progress
 * output) and the nightly maintenance run (bounded, silent). Ingest itself
 * geocodes only a small slice per run because the geocoder allows roughly one
 * request a second; this is the pass that works through the backlog. Answers
 * persist in GeoCache, so each place name is paid for once ever — a second
 * pass is near-instant and only picks up what's new.
 *
 * Safe to interrupt and re-run; it resumes from whatever is still missing.
 */
const Job = require('../models/Job');
const { geocodePlace } = require('./geoService');

/** Match the listings a given place string was derived from. */
const placeFilter = (place) => {
    const [city, ...rest] = place.split(',').map((s) => s.trim());
    const country = rest.join(', ');
    const base = { active: true, remote: false, geo: { $exists: false } };
    if (city && country) return { ...base, city, country };
    if (city) return { ...base, $or: [{ city }, { location: place }] };
    return { ...base, location: place };
};

/**
 * Work through places that still lack coordinates, busiest first — an
 * interrupted or bounded run buys the most coverage per request spent.
 * Remote roles are excluded on purpose: they are not located anywhere, and
 * pinning them to an office would put a false distance on a card.
 */
const geocodeMissing = async ({ maxPlaces = Infinity, onProgress } = {}) => {
    const missing = await Job.aggregate([
        { $match: { active: true, remote: false, geo: { $exists: false } } },
        {
            $project: {
                place: {
                    $trim: {
                        input: {
                            $cond: [
                                { $gt: [{ $strLenCP: { $ifNull: ['$city', ''] } }, 0] },
                                { $concat: ['$city', ', ', { $ifNull: ['$country', ''] }] },
                                { $ifNull: ['$location', ''] }
                            ]
                        },
                        chars: ' ,'
                    }
                }
            }
        },
        { $match: { place: { $ne: '' } } },
        { $group: { _id: '$place', n: { $sum: 1 } } },
        { $sort: { n: -1 } }
    ]);

    const queue = Number.isFinite(maxPlaces) ? missing.slice(0, maxPlaces) : missing;

    let resolved = 0;
    let failed = 0;
    let written = 0;

    for (const [i, entry] of queue.entries()) {
        const place = entry._id;
        let found = null;
        try {
            found = await geocodePlace(place);
        } catch {
            found = null;
        }

        if (!found) {
            failed++;
        } else {
            resolved++;
            const res = await Job.updateMany(placeFilter(place), {
                $set: {
                    geo: { type: 'Point', coordinates: found.coords },
                    // Correct the country while we're here. Boards write
                    // "Bangalore, Karnataka", which a comma-split reads as a
                    // country named Karnataka; the geocoder is authoritative
                    // and has just answered.
                    ...(found.country ? { country: found.country } : {})
                }
            });
            written += res.modifiedCount ?? 0;
        }

        onProgress?.({ done: i + 1, queued: queue.length, resolved, failed, written });
    }

    return { missing: missing.length, worked: queue.length, resolved, failed, written };
};

module.exports = { geocodeMissing };
