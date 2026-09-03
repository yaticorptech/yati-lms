/**
 * Intentionally empty.
 *
 * This file used to hold a curated "index" of invented listings — made-up
 * employers at real cities, with plausible salaries and example.com apply
 * links. It existed so the app always had something to show, and it did
 * that job: whenever the live sources returned nothing for a place, these
 * ranked instead and filled the page.
 *
 * That turned out to be the worst possible failure mode. A fabricated
 * listing is indistinguishable from a real one until the moment someone
 * clicks it and lands on "Example Domain" — so the app looked most
 * confident exactly where it knew least, and a user searching a city we had
 * no coverage for was told about six jobs that did not exist.
 *
 * Real listings now come from employers' own boards (see data/companies.js)
 * and the aggregators in services/providerService.js. When a place genuinely
 * has no matches, the UI says so and offers the nearest real ones instead.
 * An empty result is honest; an invented one is not.
 *
 * Keep this export — seed.js still imports it, and leaving the array here
 * makes the deletion deliberate rather than something that looks lost.
 */
const SEED_JOBS = [];

module.exports = { SEED_JOBS };
