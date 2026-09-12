/**
 * Which Career Path pages the companion appears on, as a fact rather than a
 * habit.
 *
 * The table in careerPathPages.js is the single place that decides this, and
 * `show` is the switch: a page carrying one gets a companion, a page without
 * one never does. Three pages deliberately have none, and the reason they
 * keep their entries at all — rather than being deleted from the table — is
 * that `pageFor` is what tells the rest of the section a route is inside
 * Career Path, which is what lets the companion be sent away on arriving
 * there from a page it was showing on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { CAREER_PAGES, pageFor, stepsFor } = await import(
  '../../src/career/components/mascot/careerPathPages.js'
);

/** The pages the companion is deliberately kept off. */
const SILENT = ['/career/profile', '/career/badges', '/career/settings', '/career/games', '/career/recommendations'];

test('Ideas, My Progress, Rewards, Settings and Games have no companion', () => {
  for (const route of SILENT) {
    const page = pageFor(route);
    assert.ok(page, `${route} fell out of the table and now reads as outside Career Path`);
    assert.equal(page.show, undefined, `${route} would show a companion`);
    assert.deepEqual(stepsFor(page), [], `${route} still produces a sequence to run`);
  }
});

test('every other page still has one, and it names a real element and line', () => {
  const rest = CAREER_PAGES.filter((p) => !SILENT.includes(p.route));
  assert.ok(rest.length >= 5, 'the tour lost pages it was not meant to lose');
  for (const page of rest) {
    assert.ok(page.show, `${page.route} lost its companion`);
    assert.ok(page.show.at, `${page.route} points at nothing`);
    assert.ok(page.show.say, `${page.route} has nothing to say`);
    assert.equal(stepsFor(page).length, 1);
  }
});

test('every page is still reachable by its own route', () => {
  for (const page of CAREER_PAGES) {
    assert.equal(pageFor(page.route)?.key, page.key);
  }
});

test('a route outside the section is still nobody', () => {
  assert.equal(pageFor('/enrolled-courses'), null);
  assert.deepEqual(stepsFor(null), []);
});
