// Thin-line figures as ordered parts, so they can be drawn part by part. viewBox 0 0 200 120 unless noted.
// Hand drawings for organic subjects; boxes and cylinders come from geometry.js, projected from 3D.
import { box, cylinder, cylinderInBox } from './geometry.js';

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
const dot = (cx, cy, r = 2.2) => ({ d: circle(cx, cy, r), fill: true });

export const figures = {
  page: { viewBox: '0 0 200 120', parts: [{ d: 'M60 14h80v92H60z' }, { d: 'M74 40h52M74 56h52M74 72h36', o: .5 }] },

  ghosted: { viewBox: '0 0 200 120', parts: [
    dot(24, 34), dot(176, 34),
    { d: 'M30 24c40-8 100-8 140 0', dash: '2 4', o: .6 }, { d: 'M164 20l6 4-6 4', o: .6 },
    { d: 'M24 34H176' },
    dot(34, 66), dot(150, 66), { d: 'M34 66H150' },
    dot(46, 98), dot(184, 98), { d: 'M46 98H184' },
  ] },

  superimposed: { viewBox: '0 0 200 120', parts: [
    dot(22, 40), { d: 'M22 40H178' }, { d: 'M22 40C80 40 130 38 178 36', o: .7 }, { d: 'M22 40C80 40 130 42 178 44', o: .7 }, { d: 'M22 40C90 40 140 41 178 42', o: .5 }, { d: 'M22 40C90 40 140 39 178 37', o: .5 },
    dot(22, 86), { d: 'M22 86H120' }, { d: 'M22 86C60 86 90 84 120 83', o: .7 }, { d: 'M22 86C60 86 90 88 120 89', o: .6 },
  ] },

  planes: { viewBox: '0 0 200 120', parts: [
    { d: 'M20 24L96 16L104 62L28 70Z' }, { d: 'M20 24L104 62M96 16L28 70M58 20L66 66M24 47L100 39', o: .45 },
    { d: 'M118 40L184 30L178 100L110 96Z' }, { d: 'M118 40L178 100M184 30L110 96M151 35L144 98M114 68L181 65', o: .45 },
  ] },

  ellipses: { viewBox: '0 0 200 120', parts: [
    { d: 'M16 18h168v84H16z' }, { d: 'M16 60H184M72 18v84M128 18v84' },
    { d: ellipse(30, 39, 12, 16) }, { d: ellipse(54, 39, 12, 16) }, { d: ellipse(30, 39, 11.2, 15.2), o: .5 }, { d: ellipse(54, 39, 11.2, 15.2), o: .5 },
    { d: ellipse(86, 39, 13, 17) }, { d: ellipse(113, 39, 13, 17) }, { d: ellipse(86, 39, 12.2, 16.2), o: .5 }, { d: ellipse(113, 39, 12.2, 16.2), o: .5 },
    { d: ellipse(143, 39, 9, 17) }, { d: ellipse(156, 39, 4, 17) }, { d: ellipse(170, 39, 9, 17) },
    { d: ellipse(44, 81, 26, 16) }, { d: ellipse(44, 81, 25, 15), o: .5 },
    { d: ellipse(86, 81, 13, 9) }, { d: ellipse(113, 81, 13, 9) }, { d: ellipse(86, 81, 12, 8), o: .5 }, { d: ellipse(113, 81, 12, 8), o: .5 },
    { d: ellipse(141, 81, 6, 16) }, { d: ellipse(156, 81, 8, 16) }, { d: ellipse(172, 81, 8, 16) },
  ] },

  funnels: { viewBox: '0 0 200 120', parts: [
    { d: 'M14 60H186', o: .5 }, { d: 'M40 20C80 44 120 44 160 20M40 100C80 76 120 76 160 100', o: .5 },
    { d: ellipse(100, 60, 3, 16) }, { d: ellipse(88, 60, 5, 18) }, { d: ellipse(112, 60, 5, 18) }, { d: ellipse(72, 60, 8, 22) }, { d: ellipse(128, 60, 8, 22) }, { d: ellipse(52, 60, 11, 28) }, { d: ellipse(148, 60, 11, 28) }, { d: ellipse(30, 60, 13, 35) }, { d: ellipse(170, 60, 13, 35) },
  ] },

  boxes: { viewBox: '0 0 200 120', parts: box().parts },

  arrows: { viewBox: '0 0 200 120', parts: [
    { d: 'M18 92C60 92 60 30 100 30S140 88 172 60' }, { d: 'M18 100C64 100 66 44 100 44S142 100 178 70' },
    { d: 'M100 30V44M60 62l4 6M140 62l4 4', o: .5 }, { d: 'M172 60l12 2-6 12M178 70l6-8' },
    { d: 'M40 92q6-14 14-16M62 60q4-8 10-10', o: .5 },
  ] },

  cylinder: { viewBox: '0 0 200 120', parts: cylinder().parts },
  cylbox: { viewBox: '0 0 200 120', parts: cylinderInBox().parts },

  sausage: { viewBox: '0 0 200 120', parts: [
    { d: 'M30 70C30 40 70 40 90 56S150 90 170 70', o: 0 },
    { d: circle(44, 62, 22) }, { d: circle(158, 66, 22) }, { d: 'M44 40C80 34 120 36 158 44M44 84C80 90 120 92 158 88' },
    { d: ellipse(80, 63, 5, 22), o: .6 }, { d: ellipse(104, 64, 6, 24), o: .6 }, { d: ellipse(128, 65, 7, 24), o: .6 },
  ] },

  leaf: { viewBox: '0 0 200 120', parts: [
    { d: 'M24 96C60 40 120 20 178 22', dash: '3 4', o: .45 },
    { d: 'M30 94C70 96 130 72 176 24C130 10 70 40 30 94Z' }, { d: 'M30 94C80 70 120 46 170 26', o: .6 },
    { d: 'M70 76l8-14M100 62l6-16M130 48l4-14', o: .4 },
  ] },

  bug: { viewBox: '0 0 200 120', parts: [
    { d: ellipse(120, 64, 40, 26) }, { d: circle(70, 60, 16) }, { d: circle(46, 58, 9) },
    { d: 'M80 48L96 44M80 72L96 76', o: .6 },
    { d: 'M96 46L84 22L70 12M104 42L106 18M96 82L84 106L70 116M104 86L106 110M136 44L150 20L166 14M136 84L150 108L166 114', o: .8 },
    { d: ellipse(120, 64, 30, 14), o: .35 },
  ] },

  animal: { viewBox: '0 0 200 120', parts: [
    { d: circle(64, 54, 18) }, { d: circle(134, 58, 22) }, { d: 'M64 36C90 22 120 24 134 36M64 72C90 84 120 86 134 80' },
    { d: circle(28, 42, 12) }, { d: 'M40 46L50 50M36 32L44 40', o: .6 },
    { d: 'M56 70L52 108M74 70L72 108M126 78L122 110M146 76L150 110' }, { d: 'M154 46L182 30', o: .6 },
  ] },

  mug: { viewBox: '0 0 200 120', parts: [
    { d: 'M60 30h70v66a12 12 0 0 1-12 12H72a12 12 0 0 1-12-12z' }, { d: ellipse(95, 30, 35, 9) }, { d: 'M130 44h18a14 14 0 0 1 0 28h-18', o: .8 },
    { d: 'M60 96a35 9 0 0 0 70 0', o: .4, dash: '2 3' },
  ] },

  wheel: { viewBox: '0 0 200 120', parts: [
    { d: ellipse(100, 60, 46, 50) }, { d: ellipse(100, 60, 32, 36) }, { d: ellipse(100, 60, 8, 9) },
    { d: 'M100 24V51M100 69V96M68 60H92M108 60H132M77 35L94 53M106 67L123 85M123 35L106 53M94 67L77 85', o: .7 },
    { d: 'M54 60C54 40 70 12 86 12', dash: '3 4', o: .4 },
  ] },

  car: { viewBox: '0 0 200 120', parts: [
    { d: 'M20 80L28 52H82L100 30H150L166 52H180L186 80Z' }, { d: 'M28 52H166', o: .4 }, { d: 'M100 30V52M150 30V52M82 52V80M150 52V80', o: .4, dash: '2 3' },
    { d: circle(58, 84, 16) }, { d: circle(148, 84, 16) }, { d: circle(58, 84, 6), o: .6 }, { d: circle(148, 84, 6), o: .6 },
  ] },

  texture: { viewBox: '0 0 200 120', parts: [
    { d: 'M16 30h168v60H16z' },
    { d: 'M24 40l10 8-6 10zM40 44l12 4-4 12zM30 66l8 10-10 4zM48 60l10 10-8 8zM62 42l8 12-10 2z', fill: true }, { d: 'M76 48l8 8-6 8zM92 44l6 12-8 2zM86 66l8 8-10 2z', fill: true, o: .8 }, { d: 'M110 50l6 8-6 4zM126 60l6 6-6 4z', fill: true, o: .55 }, { d: 'M144 56l4 4-4 2z', fill: true, o: .35 },
  ] },
};

// Small glyphs for the path row, 24 by 24.
export const glyphs = {
  l0: { viewBox: '0 0 24 24', parts: [{ d: circle(12, 12, 3) }, { d: 'M12 3v3M12 18v3M3 12h3M18 12h3' }] },
  l1: { viewBox: '0 0 24 24', parts: [{ d: 'M3 6h18' }, { d: ellipse(8, 15, 4, 3) }, { d: 'M15 12l5 1v5l-5 1-3-2v-4z' }] },
  c250boxes: { viewBox: '0 0 24 24', parts: [{ d: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z' }, { d: 'M12 12l8-4.5M12 12v9M12 12L4 7.5' }] },
  l2: { viewBox: '0 0 24 24', parts: [{ d: 'M4 16c4 0 4-8 8-8s4 8 8 8' }, { d: 'M6 20c3 0 4-3 6-3s3 3 6 3' }] },
  l3: { viewBox: '0 0 24 24', parts: [{ d: 'M4 20C8 8 14 4 20 4c0 8-6 14-16 16z' }, { d: 'M4 20l12-12' }] },
  l4: { viewBox: '0 0 24 24', parts: [{ d: ellipse(12, 14, 5, 6) }, { d: circle(12, 6, 2.5) }, { d: 'M7 12l-4-2M7 16l-4 1M17 12l4-2M17 16l4 1' }] },
  l5: { viewBox: '0 0 24 24', parts: [{ d: ellipse(13, 12, 7, 4.5) }, { d: circle(4.5, 9, 2.5) }, { d: 'M8 16v4M11 16v4M15 16v4M18 15v5' }] },
  c250cylinders: { viewBox: '0 0 24 24', parts: [{ d: ellipse(12, 6, 6, 2.5) }, { d: 'M6 6v12a6 2.5 0 0 0 12 0V6' }] },
  l6: { viewBox: '0 0 24 24', parts: [{ d: 'M5 7h11v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z' }, { d: 'M16 9h2a2 2 0 0 1 0 4h-2' }] },
  c25wheels: { viewBox: '0 0 24 24', parts: [{ d: circle(12, 12, 8) }, { d: circle(12, 12, 3) }, { d: 'M12 4v5M12 15v5M4 12h5M15 12h5' }] },
  l7: { viewBox: '0 0 24 24', parts: [{ d: 'M3 15l2-5h11l4 5v3H3z' }, { d: circle(7, 18, 2) }, { d: circle(17, 18, 2) }] },
  c25textures: { viewBox: '0 0 24 24', parts: [{ d: 'M3 5h18v14H3z' }, { d: 'M6 9l3 3-3 3M11 8l4 4-4 4M17 10l1 2-1 2', o: .7 }] },
};

// Which figure illustrates which exercise.
const MAP = {
  'l0-read': 'page', 'l1-superimposed': 'superimposed', 'l1-ghostedlines': 'ghosted', 'l1-ghostedplanes': 'planes', 'l1-tables': 'ellipses', 'l1-ellipsesinplanes': 'ellipses', 'l1-funnels': 'funnels',
  'l1-plotted': 'boxes', 'l1-rough': 'boxes', 'l1-rotated': 'boxes', 'l1-organic': 'boxes', 'c250boxes-boxes': 'boxes',
  'l2-arrows': 'arrows', 'l2-contour': 'sausage', 'l2-texture': 'texture', 'l2-dissections': 'sausage', 'l2-intersections': 'boxes', 'l2-organicint': 'sausage',
  'l3-arrows': 'arrows', 'l3-leaves': 'leaf', 'l3-branches': 'cylinder', 'l3-plants': 'leaf',
  'l4-contour': 'sausage', 'l4-construction': 'bug', 'l4-detail': 'bug',
  'l5-organicint': 'sausage', 'l5-birds': 'animal', 'l5-nonhooved': 'animal', 'l5-hooved': 'animal', 'l5-random': 'animal', 'l5-hybrids': 'animal',
  'c250cyl-axis': 'cylinder', 'c250cyl-box': 'cylbox', 'l6-intersections': 'boxes', 'l6-objects': 'mug', 'c25wheels-wheels': 'wheel',
  'l7-intersections': 'boxes', 'l7-cylinders': 'cylbox', 'l7-primitives': 'car', 'l7-vehicles': 'car', 'c25textures-rows': 'texture',
};
export function figureFor(exerciseId) {
  return MAP[exerciseId] || 'page';
}
