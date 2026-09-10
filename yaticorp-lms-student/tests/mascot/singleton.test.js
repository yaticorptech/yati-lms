/**
 * The one-mascot rule, checked two ways: the ownership claim that makes a
 * second renderer impossible at runtime, and a scan of the source that makes
 * reintroducing a page-level mascot fail the build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { claimStage, releaseStage, getStageOwner, resetStage } =
  await import('../../src/career/components/mascot/stageOwner.js');

test('only the first stage may claim ownership', () => {
  resetStage();
  assert.equal(claimStage('first'), true);
  assert.equal(claimStage('second'), false, 'a second stage took ownership');
  assert.equal(getStageOwner(), 'first');
});

test('claiming is idempotent for the owner, so a re-render is harmless', () => {
  resetStage();
  claimStage('first');
  assert.equal(claimStage('first'), true);
});

test('a non-owner cannot release the stage', () => {
  resetStage();
  claimStage('first');
  releaseStage('second');
  assert.equal(getStageOwner(), 'first', 'an impostor released the stage');
});

test('releasing lets the next mount take over, which is what a remount is', () => {
  resetStage();
  claimStage('first');
  releaseStage('first');
  assert.equal(getStageOwner(), null);
  assert.equal(claimStage('second'), true);
});

/* ---- The rule, enforced against the source itself --------------------- */

const MASCOT_DIR = join('src', 'career', 'components', 'mascot');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.jsx?$/.test(name)) out.push(path);
  }
  return out;
};

/*
 * The one-mascot rule is scoped to Career Path. Outside it — the loading
 * animation, Community, Enrolled Courses, Scholarships and the sidebar card —
 * pages keep the mascots they have always had, by explicit instruction. Only
 * inside Career Path does the single global character own the screen.
 */
const CAREER_DIR = join('src', 'career');

test('no Career Path file renders its own mascot', () => {
  const offenders = [];
  for (const file of walk(CAREER_DIR)) {
    if (file.startsWith(MASCOT_DIR)) continue;
    // The lab is the workbench and drives the renderer on purpose.
    if (file.endsWith('MascotLab.jsx')) continue;
    const body = readFileSync(file, 'utf8');
    if (/from ['"][^'"]*\/MascotRenderer['"]/.test(body) || /<MascotRenderer\b/.test(body)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these Career Path files render their own mascot; they should declare a MascotSlot:\n  ${offenders.join('\n  ')}`
  );
});

test('the sections outside Career Path keep their own mascots', () => {
  // Guards the instruction in the other direction: if a future change quietly
  // converts one of these to a slot, its mascot disappears from the page.
  /*
   * Scholarships, Community and Enrolled Courses are deliberately absent:
   * their mascots were replaced by page-specific artwork, by request. What is
   * left is the loading animation and the sidebar card, and this list is what
   * stops a future change quietly removing either.
   */
  const keep = [
    join('src', 'components', 'YatiLoader.jsx'),
    join('src', 'components', 'SidebarProgressCard.jsx')
  ];
  for (const file of keep) {
    const body = readFileSync(file, 'utf8');
    assert.match(body, /<MascotRenderer\b/, `${file} lost its own mascot`);
  }
});

test('exactly one component carries the instance marker', () => {
  const marked = walk('src').filter((f) => readFileSync(f, 'utf8').includes('data-mascot-instance'));
  assert.deepEqual(marked, [join(MASCOT_DIR, 'MascotController.jsx')]);
});
