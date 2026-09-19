// Figures generated from 3D with a pinhole camera, so boxes really converge to their vanishing points and
// ellipses really are circles in perspective. Output is the same ordered-parts format as library.js.
// Camera at the origin looking down +z; focal length f; image centre (cx, cy) in viewBox units; y grows downward.

export function camera({ f = 250, cx = 100, cy = 60 } = {}) {
  return { f, cx, cy };
}

export function project([x, y, z], cam) {
  return [cam.cx + (cam.f * x) / z, cam.cy + (cam.f * y) / z];
}

// Where lines parallel to `dir` converge as they recede (null when parallel to the picture plane).
export function vanishingPoint(dir, cam) {
  let [x, y, z] = dir;
  if (Math.abs(z) < 1e-9) return null;
  if (z < 0) { x = -x; y = -y; z = -z; }
  return [cam.cx + (cam.f * x) / z, cam.cy + (cam.f * y) / z];
}

export function rotate([x, y, z], [ax, ay, az]) {
  let [cx, sx] = [Math.cos(ax), Math.sin(ax)];
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  let [cy, sy] = [Math.cos(ay), Math.sin(ay)];
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  let [cz, sz] = [Math.cos(az), Math.sin(az)];
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  return [x, y, z];
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm = a => { const l = Math.hypot(...a); return scale(a, 1 / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const r1 = n => Math.round(n * 10) / 10;
const seg = (a, b) => `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;
const dot = ([x, y], r = 2.4) => ({ d: `M${r1(x - r)} ${r1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`, fill: true });

// A box in three-point perspective. Returns { parts, corners, vps } with parts ordered Y, near-corner dot,
// visible edges, hidden edges (dashed), extensions (dashed, faint).
export function box({ size = [1, 0.8, 1.1], rotation = [0.55, -0.7, 0.12], center = [0.05, 0.05, 3.1], cam = camera(), extension = 46 } = {}) {
  const corners3 = [];
  for (const ix of [-1, 1]) for (const iy of [-1, 1]) for (const iz of [-1, 1]) corners3.push(add(rotate([ix * size[0] / 2, iy * size[1] / 2, iz * size[2] / 2], rotation), center));
  const pts = corners3.map(p => project(p, cam));
  const idx = (ix, iy, iz) => ix * 4 + iy * 2 + iz;
  const edges = [];
  for (let a = 0; a < 8; a++) for (const bit of [4, 2, 1]) { const b = a ^ bit; if (a < b) edges.push({ a, b, axis: bit }); }
  let near = 0;
  corners3.forEach((p, i) => { if (p[2] < corners3[near][2]) near = i; });
  const far = 7 - near;
  const isY = e => e.a === near || e.b === near;
  const isHidden = e => e.a === far || e.b === far;
  const dirs = { 4: rotate([1, 0, 0], rotation), 2: rotate([0, 1, 0], rotation), 1: rotate([0, 0, 1], rotation) };
  const vps = { 4: vanishingPoint(dirs[4], cam), 2: vanishingPoint(dirs[2], cam), 1: vanishingPoint(dirs[1], cam) };
  const y = edges.filter(isY);
  const hidden = edges.filter(isHidden);
  const rest = edges.filter(e => !isY(e) && !isHidden(e));
  const path = list => list.map(e => seg(pts[e.a], pts[e.b])).join('');
  // Extensions continue each edge away from the viewer for a fixed image length. Straight lines stay straight
  // under projection, so they head to the edge's vanishing point by construction.
  const ext = edges.map(e => {
    const [p, q] = corners3[e.a][2] > corners3[e.b][2] ? [pts[e.b], pts[e.a]] : [pts[e.a], pts[e.b]];
    const d = [q[0] - p[0], q[1] - p[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    return seg(q, [q[0] + (d[0] / l) * extension, q[1] + (d[1] / l) * extension]);
  }).join('');
  const parts = [
    { d: path(y), kind: 'y' },
    { ...dot(pts[near]), kind: 'y' },
    { d: path(rest), kind: 'edge' },
    { d: path(hidden), dash: '2 3', o: .45, kind: 'hidden' },
    { d: ext, dash: '3 4', o: .35, kind: 'ext' },
  ];
  return { parts, corners: pts, corners3, edges, vps, near, dirs };
}

// A circle in 3D, sampled and projected. Returns a closed path string.
export function circlePath(center, normal, r, cam, n = 48) {
  const nrm = norm(normal);
  const helper = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(nrm, helper));
  const v = cross(nrm, u);
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const p = project(add(center, add(scale(u, r * Math.cos(t)), scale(v, r * Math.sin(t)))), cam);
    d += (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1]);
  }
  return d + 'Z';
}

// Two circles sharing an axis, the axis itself (dashed), and two silhouette lines.
export function cylinder({ center = [0.1, 0.05, 3.2], axis = [1, -0.55, 0.35], r = 0.42, len = 1.7, cam = camera(), axisExtra = 0.5 } = {}) {
  const a = norm(axis);
  const c1 = add(center, scale(a, -len / 2));
  const c2 = add(center, scale(a, len / 2));
  const nearFirst = c1[2] <= c2[2];
  const ends = nearFirst ? [c1, c2] : [c2, c1];
  const ring = c => circlePath(c, a, r, cam);
  // Silhouette: the two points of each ring farthest from the projected axis, matched by side.
  const p1 = project(ends[0], cam), p2 = project(ends[1], cam);
  const ax = norm([p2[0] - p1[0], p2[1] - p1[1], 0]);
  const side = (c) => {
    const nrm = a; const helper = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(nrm, helper)); const v = cross(nrm, u);
    let best = [null, -Infinity], worst = [null, Infinity];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const p = project(add(c, add(scale(u, r * Math.cos(t)), scale(v, r * Math.sin(t)))), cam);
      const s = (p[0] - p1[0]) * -ax[1] + (p[1] - p1[1]) * ax[0];
      if (s > best[1]) best = [p, s];
      if (s < worst[1]) worst = [p, s];
    }
    return [best[0], worst[0]];
  };
  const [n1, n2] = side(ends[0]);
  const [f1, f2] = side(ends[1]);
  const axisLine = seg(project(add(ends[0], scale(a, -axisExtra)), cam), project(add(ends[1], scale(a, axisExtra)), cam));
  const parts = [
    { d: axisLine, dash: '3 4', o: .45, kind: 'axis' },
    { d: ring(ends[0]), kind: 'edge' },
    { d: ring(ends[1]), o: .8, kind: 'edge' },
    { d: seg(n1, f1) + seg(n2, f2), kind: 'edge' },
  ];
  return { parts, ends: [p1, p2] };
}

// A cylinder that fits inside a box along the box's local z axis.
export function cylinderInBox({ size = [1, 0.8, 1.6], rotation = [0.5, -0.65, 0.1], center = [0.05, 0.05, 3.3], cam = camera() } = {}) {
  const b = box({ size, rotation, center, cam, extension: 34 });
  const a = rotate([0, 0, 1], rotation);
  const r = Math.min(size[0], size[1]) / 2;
  const cyl = cylinder({ center, axis: a, r, len: size[2], cam, axisExtra: 0.45 });
  return { parts: [...b.parts.slice(0, 4), ...cyl.parts, b.parts[4]] };
}
