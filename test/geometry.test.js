import { test } from 'node:test';
import assert from 'node:assert/strict';
import { box, camera, project, vanishingPoint, circlePath, cylinder, cylinderInBox } from '../src/lib/figures/geometry.js';

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// Distance from point v to the infinite line through a and b.
const lineDist = (a, b, v) => Math.abs((b[0] - a[0]) * (a[1] - v[1]) - (a[0] - v[0]) * (b[1] - a[1])) / dist(a, b);

test('projection puts the image centre where the camera says and shrinks with distance', () => {
  const cam = camera({ f: 100, cx: 50, cy: 30 });
  assert.deepEqual(project([0, 0, 2], cam), [50, 30]);
  assert.deepEqual(project([1, 0, 2], cam), [100, 30]);
  assert.deepEqual(project([1, 0, 4], cam), [75, 30]);
  assert.equal(vanishingPoint([1, 0, 0], cam), null, 'parallel to the picture plane');
  assert.deepEqual(vanishingPoint([0, 0, 1], cam), [50, 30]);
  assert.deepEqual(vanishingPoint([0, 0, -1], cam), [50, 30], 'sign does not matter');
});

test('every box edge points at the vanishing point of its axis', () => {
  const b = box();
  for (const e of b.edges) {
    const vp = b.vps[e.axis];
    assert.ok(vp, 'finite vanishing point');
    assert.ok(lineDist(b.corners[e.a], b.corners[e.b], vp) < 0.05, `edge ${e.a}-${e.b} misses its VP by ${lineDist(b.corners[e.a], b.corners[e.b], vp)}`);
  }
});

test('the Y comes first, from the nearest corner, and the far corner is hidden', () => {
  const b = box();
  assert.equal(b.parts[0].kind, 'y');
  assert.equal(b.parts[1].kind, 'y');
  assert.equal(b.parts[3].dash, '2 3');
  assert.equal(b.parts[4].kind, 'ext');
  const ys = b.edges.filter(e => e.a === b.near || e.b === b.near);
  assert.equal(ys.length, 3);
  assert.ok(new Set(ys.map(e => e.axis)).size === 3, 'one arm per axis');
  const y = b.parts[0].d;
  assert.equal((y.match(/M/g) || []).length, 3);
  for (const p of b.parts) assert.ok(!/NaN/.test(p.d));
});

test('the extensions stay inside a sensible canvas', () => {
  const b = box();
  const nums = b.parts[4].d.match(/-?\d+(\.\d+)?/g).map(Number);
  assert.ok(nums.every(n => n > -60 && n < 260));
});

test('a circle in perspective is a closed path with the right number of samples', () => {
  const d = circlePath([0, 0, 3], [0, 0, 1], 1, camera(), 12);
  assert.ok(d.startsWith('M') && d.endsWith('Z'));
  assert.equal((d.match(/L/g) || []).length, 11);
});

test('a cylinder has an axis, two rings and two silhouette lines', () => {
  const c = cylinder();
  assert.equal(c.parts.length, 4);
  assert.equal(c.parts[0].kind, 'axis');
  assert.equal((c.parts[3].d.match(/M/g) || []).length, 2);
  assert.ok(c.parts.every(p => !/NaN/.test(p.d)));
  assert.ok(cylinderInBox().parts.length > 8);
});
