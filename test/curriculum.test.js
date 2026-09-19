// The curriculum file is an index of Drawabox's public structure. These pin it to what the site says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { units, exercises } from '#lib/logic.js';

const cur = JSON.parse(readFileSync(new URL('../curricula/drawabox.json', import.meta.url), 'utf8'));
const UNITS = new Set(['pages', 'boxes', 'cylinders', 'wheels', 'rows', 'read']);

test('ids are unique and the path covers every unit exactly once', () => {
  const us = units(cur);
  assert.equal(new Set(us.map(u => u.id)).size, us.length);
  const exs = us.flatMap(u => u.exercises);
  assert.equal(new Set(exs.map(e => e.id)).size, exs.length);
  const path = [...cur.order, ...cur.parallel];
  assert.deepEqual([...path].sort(), us.map(u => u.id).sort());
  assert.equal(exercises(cur).length, exs.length);
});

test('every exercise is well formed and links to drawabox.com', () => {
  for (const u of units(cur)) {
    assert.match(u.url, /^https:\/\/drawabox\.com\//, u.id);
    assert.ok(u.summary.length > 20 && u.tools.length > 3, u.id);
    for (const id of u.after) assert.ok(units(cur).some(x => x.id === id), `${u.id} after ${id}`);
    for (const ex of u.exercises) {
      assert.ok(Number.isInteger(ex.quota) && ex.quota > 0, ex.id);
      assert.ok(UNITS.has(ex.unit), `${ex.id} unit ${ex.unit}`);
      assert.match(ex.url, /^https:\/\/drawabox\.com\//, ex.id);
      assert.equal(typeof ex.warmup, 'boolean', ex.id);
      assert.ok(ex.note && ex.note.length < 160, ex.id);
      if (ex.sameAs) assert.ok(exercises(cur).some(x => x.id === ex.sameAs), `${ex.id} sameAs ${ex.sameAs}`);
      if (ex.stages) {
        assert.equal(ex.stages[ex.stages.length - 1].to, ex.quota, ex.id);
        for (let i = 1; i < ex.stages.length; i++) assert.ok(ex.stages[i].to > ex.stages[i - 1].to, ex.id);
      }
    }
  }
});

test('warm-ups only come from the basics and the box and cylinder challenges', () => {
  const allowed = new Set(['l1', 'l2', 'l3', 'c250boxes', 'c250cylinders']);
  for (const ex of exercises(cur)) if (ex.warmup) assert.ok(allowed.has(ex.unitId), ex.id);
  for (const ex of exercises(cur)) if (ex.sameAs) assert.equal(ex.warmup, false, `${ex.id} is a repeat, the original is the warm-up`);
});

test('homework quotas match the site', () => {
  const q = Object.fromEntries(exercises(cur).map(e => [e.id, e.quota]));
  const sum = ids => ids.reduce((a, id) => a + q[id], 0);
  assert.equal(sum(['l1-superimposed', 'l1-ghostedlines', 'l1-ghostedplanes']), 5, 'lines');
  assert.equal(sum(['l1-tables', 'l1-ellipsesinplanes', 'l1-funnels']), 5, 'ellipses');
  assert.equal(sum(['l1-plotted', 'l1-rough', 'l1-rotated', 'l1-organic']), 6, 'boxes');
  assert.equal(q['c250boxes-boxes'], 250);
  assert.deepEqual(exercises(cur).find(e => e.id === 'c250boxes-boxes').stages.map(s => s.to), [50, 100, 250]);
  assert.equal(sum(['l2-arrows', 'l2-contour', 'l2-texture', 'l2-dissections', 'l2-intersections', 'l2-organicint']), 13);
  assert.equal(sum(['l3-arrows', 'l3-leaves', 'l3-branches', 'l3-plants']), 11);
  assert.equal(sum(['l4-contour', 'l4-construction', 'l4-detail']), 12);
  assert.equal(sum(['l5-organicint', 'l5-birds', 'l5-nonhooved', 'l5-hooved', 'l5-random', 'l5-hybrids']), 15);
  assert.equal(q['c250cyl-axis'] + q['c250cyl-box'], 250);
  assert.equal(sum(['l6-intersections', 'l6-objects']), 11);
  assert.equal(q['c25wheels-wheels'], 25);
  assert.equal(sum(['l7-intersections', 'l7-cylinders', 'l7-primitives', 'l7-vehicles']), 14);
  assert.equal(q['c25textures-rows'], 25);
});

test('prerequisites follow the recommended order', () => {
  const by = Object.fromEntries(units(cur).map(u => [u.id, u]));
  assert.deepEqual(by.l1.after, ['l0']);
  assert.deepEqual(by.c250boxes.after, ['l1']);
  assert.deepEqual(by.l2.after, ['c250boxes']);
  assert.deepEqual(by.l6.after, ['l5', 'c250cylinders']);
  assert.deepEqual(by.c25wheels.after, ['l6', 'c250cylinders']);
  assert.deepEqual(by.l7.after, ['l6', 'c25wheels']);
  assert.deepEqual(by.c25textures.after, ['l2']);
});
