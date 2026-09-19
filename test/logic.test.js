import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/lib/logic.js';

const cur = JSON.parse(readFileSync(new URL('../curricula/drawabox.json', import.meta.url), 'utf8'));
const settings = { studyMinutes: 30, warmupMinutes: 10, warmupCount: 2, playMinutes: 30 };
const T = '2026-09-18';

function progressWith(counts) {
  const p = {};
  for (const [id, count] of Object.entries(counts)) p[id] = { count, sessions: 1, warmups: 0, minutes: 0, last: T };
  return p;
}
function completeUnits(...ids) {
  const p = {};
  for (const id of ids) for (const ex of L.unitById(cur, id).exercises) p[ex.id] = { count: ex.quota, sessions: 1, warmups: 0, minutes: 0, last: '2026-09-01' };
  return p;
}

test('calendar helpers cross month and year boundaries', () => {
  assert.equal(L.addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(L.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(L.daysBetween('2026-02-27', '2026-03-02'), 3);
  assert.equal(L.daysBetween('2026-03-02', '2026-02-27'), -3);
  assert.equal(L.fmtClock(65), '1:05');
  assert.equal(L.fmtClock(-3), '0:00');
  assert.equal(L.fmtMinutes(125), '2h 5m');
  assert.equal(L.fmtMinutes(9), '9m');
  assert.equal(L.unitLabel('boxes', 1), 'box');
  assert.equal(L.unitLabel('pages', 2), 'pages');
});

test('the path starts with Lesson 0 and puts the box challenge right after Lesson 1', () => {
  const ids = L.exercises(cur).map(e => e.id);
  assert.equal(ids[0], 'l0-read');
  assert.equal(ids[1], 'l1-superimposed');
  assert.equal(ids.indexOf('c250boxes-boxes'), ids.indexOf('l1-organic') + 1);
  assert.equal(ids.indexOf('l2-arrows'), ids.indexOf('c250boxes-boxes') + 1);
  assert.equal(ids[ids.length - 1], 'c25textures-rows');
  assert.ok(L.exercises(cur).find(e => e.id === 'c25textures-rows').parallel);
});

test('nextExercise walks the path and skips the parallel challenge', () => {
  assert.equal(L.nextExercise(cur, {}).id, 'l0-read');
  assert.equal(L.nextExercise(cur, progressWith({ 'l0-read': 1 })).id, 'l1-superimposed');
  assert.equal(L.nextExercise(cur, progressWith({ 'l0-read': 1, 'l1-superimposed': 1 })).id, 'l1-superimposed', 'one of two pages is not done');
  assert.equal(L.nextExercise(cur, completeUnits('l0', 'l1')).id, 'c250boxes-boxes');
  assert.equal(L.nextExercise(cur, { ...completeUnits('l0', 'l1'), 'c250boxes-boxes': { count: 250 } }).id, 'l2-arrows');
  const all = completeUnits(...cur.order);
  assert.equal(L.nextExercise(cur, all), null);
  assert.equal(L.nextParallel(cur, all).id, 'c25textures-rows');
  assert.equal(L.nextParallel(cur, {}), null, 'textures are locked until Lesson 2');
});

test('unit status respects prerequisites', () => {
  const l1 = L.unitById(cur, 'l1');
  const l2 = L.unitById(cur, 'l2');
  assert.equal(L.unitStatus(cur, L.unitById(cur, 'l0'), {}), 'available');
  assert.equal(L.unitStatus(cur, l1, {}), 'locked');
  assert.equal(L.unitStatus(cur, l1, progressWith({ 'l0-read': 1 })), 'available');
  assert.equal(L.unitStatus(cur, l1, progressWith({ 'l0-read': 1, 'l1-funnels': 1 })), 'active');
  assert.equal(L.unitStatus(cur, l1, completeUnits('l1')), 'complete');
  assert.equal(L.unitStatus(cur, l2, completeUnits('l0', 'l1')), 'locked', 'boxes first');
  assert.equal(L.unitStatus(cur, l2, completeUnits('l0', 'l1', 'c250boxes')), 'available');
  assert.equal(L.unitProgress(l1, progressWith({ 'l1-superimposed': 1 })), 0.05);
  assert.equal(L.stageOf(L.exerciseById(cur, 'c250boxes-boxes'), 0).name, 'The First Fifty');
  assert.equal(L.stageOf(L.exerciseById(cur, 'c250boxes-boxes'), 50).name, 'The Next Fifty');
  assert.equal(L.stageOf(L.exerciseById(cur, 'c250boxes-boxes'), 250).name, 'The Last 150');
});

test('warm-ups unlock once an exercise has been started', () => {
  assert.deepEqual(L.unlockedWarmups(cur, {}), []);
  assert.deepEqual(L.unlockedWarmups(cur, progressWith({ 'l0-read': 1 })), [], 'reading is not a warm-up');
  assert.deepEqual(L.unlockedWarmups(cur, progressWith({ 'l1-ghostedlines': 1, 'l3-plants': 2 })).map(e => e.id), ['l1-ghostedlines']);
});

test('pickWarmups is deterministic per seed and day, never repeats, and leans to stale exercises', () => {
  const p = completeUnits('l1');
  const a = L.pickWarmups(cur, p, { count: 3, seed: 'x', today: T });
  const b = L.pickWarmups(cur, p, { count: 3, seed: 'x', today: T });
  assert.deepEqual(a.map(e => e.id), b.map(e => e.id));
  assert.equal(new Set(a.map(e => e.id)).size, 3);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(L.pickWarmups(cur, p, { count: 2, seed: 's' + i, today: T }).map(e => e.id).join());
  assert.ok(seen.size > 3, 'different seeds give different plans');
  assert.equal(L.pickWarmups(cur, progressWith({ 'l1-funnels': 1 }), { count: 2 }).length, 1, 'never more than the pool');

  const stale = { ...p, 'l1-funnels': { count: 1, warmups: 0, last: '2026-08-01' }, 'l1-tables': { count: 2, warmups: 5, last: T } };
  let funnelsFirst = 0;
  let tablesFirst = 0;
  for (let i = 0; i < 300; i++) {
    const first = L.pickWarmups(cur, stale, { count: 1, seed: 'w' + i, today: T })[0].id;
    if (first === 'l1-funnels') funnelsFirst++;
    if (first === 'l1-tables') tablesFirst++;
  }
  assert.ok(funnelsFirst > tablesFirst * 3, `stale ${funnelsFirst} vs fresh ${tablesFirst}`);
  assert.ok(L.warmupWeight({ last: '2026-08-01', warmups: 0 }, T) > L.warmupWeight({ last: T, warmups: 5 }, T));
});

test('planSession splits the study time and always ends with play', () => {
  const bare = L.planSession(cur, {}, settings, { today: T });
  assert.deepEqual(bare.blocks.map(b => [b.kind, b.minutes]), [['homework', 15], ['play', 30]], 'reading Lesson 0 is capped at fifteen minutes');
  assert.equal(bare.blocks[0].exerciseId, 'l0-read');
  assert.equal(bare.parallel, null);

  const p = completeUnits('l0', 'l1');
  const plan = L.planSession(cur, p, settings, { seed: 'k', today: T });
  assert.deepEqual(plan.blocks.map(b => b.kind), ['warmup', 'warmup', 'homework', 'play']);
  assert.deepEqual(plan.blocks.map(b => b.minutes), [5, 5, 20, 30]);
  assert.equal(plan.blocks[2].exerciseId, 'c250boxes-boxes');
  assert.equal(new Set(plan.blocks.slice(0, 2).map(b => b.exerciseId)).size, 2);

  const tight = L.planSession(cur, p, { ...settings, studyMinutes: 10, warmupMinutes: 10 }, { today: T });
  assert.equal(tight.blocks.find(b => b.kind === 'homework').minutes, 5, 'homework never drops under five minutes');

  const withTextures = L.planSession(cur, completeUnits('l0', 'l1', 'c250boxes', 'l2'), settings, { today: T });
  assert.equal(withTextures.parallel, 'c25textures-rows');
});

test('applySession adds and, with sign -1, takes back', () => {
  const s = { date: T, blocks: [{ kind: 'warmup', exerciseId: 'l1-funnels', minutes: 5, count: 0 }, { kind: 'homework', exerciseId: 'l1-rough', minutes: 20, count: 1 }, { kind: 'play', minutes: 30 }] };
  const p = L.applySession({}, s);
  assert.deepEqual(p['l1-funnels'], { count: 0, sessions: 1, warmups: 1, minutes: 5, last: T });
  assert.deepEqual(p['l1-rough'], { count: 1, sessions: 1, warmups: 0, minutes: 20, last: T });
  assert.equal(p.play, undefined);
  const back = L.applySession(p, s, -1);
  assert.equal(back['l1-rough'].count, 0);
  assert.equal(back['l1-rough'].sessions, 0);
  assert.equal(back['l1-funnels'].warmups, 0);
});

test('streak counts consecutive active days ending today or yesterday', () => {
  const day = (date, minutes = 20, count = 1) => ({ date, start: date, blocks: [{ kind: 'homework', exerciseId: 'l1-rough', minutes, count }] });
  assert.equal(L.streak([], T), 0);
  assert.equal(L.streak([day(T)], T), 1);
  assert.equal(L.streak([day(T), day('2026-09-17'), day('2026-09-16')], T), 3);
  assert.equal(L.streak([day('2026-09-17'), day('2026-09-16')], T), 2, 'yesterday keeps it alive');
  assert.equal(L.streak([day('2026-09-16')], T), 0, 'two days off ends it');
  assert.equal(L.streak([day(T), day('2026-09-16')], T), 1, 'a gap resets');
  assert.equal(L.streak([day(T, 0, 0)], T), 0, 'an empty session does not count');
  assert.equal(L.streak([{ date: T, start: T, blocks: [{ kind: 'play', minutes: 15 }] }], T), 1, 'play alone counts');
});

test('totals, day totals and the heatmap', () => {
  const sessions = [
    { date: T, start: T, blocks: [{ kind: 'homework', exerciseId: 'l1-rough', minutes: 20, count: 1 }, { kind: 'play', minutes: 10 }] },
    { date: T, start: T, blocks: [{ kind: 'play', minutes: 20 }] },
    { date: '2026-09-10', start: '2026-09-10', blocks: [{ kind: 'warmup', exerciseId: 'l1-funnels', minutes: 10, count: 0 }] },
  ];
  const t = L.totals(sessions);
  assert.deepEqual(t, { study: 30, play: 30, days: 2, ratio: 0.5 });
  assert.deepEqual(L.dayTotals(sessions).get(T), { study: 20, play: 30, count: 1 });
  const map = L.heatmap(sessions, T, 12);
  assert.equal(map.length, 12);
  assert.ok(map.every(col => col.length === 7));
  const flat = map.flat();
  assert.equal(flat.filter(d => d.date === T).length, 1);
  assert.equal(flat[0].date, '2026-06-29', 'starts on a Monday twelve weeks back');
  assert.ok(flat.some(d => d.future), 'the rest of this week is marked as future');
  assert.equal(flat.find(d => d.date === '2026-09-10').study, 10);
});

test('weekView counts the Monday-first week, the goal and the spare days', () => {
  const day = date => ({ date, start: date, blocks: [{ kind: 'homework', exerciseId: 'l1-rough', minutes: 10, count: 1 }] });
  const w = L.weekView([day('2026-09-14'), day('2026-09-15'), day('2026-09-17')], '2026-09-18', 5);
  assert.equal(w.days[0].date, '2026-09-14');
  assert.deepEqual(w.days.map(d => d.label).join(''), 'MTWTFSS');
  assert.equal(w.done, 3);
  assert.equal(w.days[4].today, true);
  assert.equal(w.days[5].future, true);
  assert.equal(w.reserve, 1, 'two spare days minus the Wednesday already missed');
  assert.equal(w.met, false);
  assert.equal(L.weekView([], '2026-09-14', 5).reserve, 2);
  assert.equal(L.daysDrawn([day('2026-09-14'), day('2026-09-14'), day('2026-09-15')]), 2);
});

test('photoPair, comparable and lastNote', () => {
  const photos = [{ id: 'b', exerciseId: 'l1-rough', date: '2026-09-10' }, { id: 'a', exerciseId: 'l1-rough', date: '2026-08-01' }, { id: 'c', exerciseId: 'l1-funnels', date: '2026-09-11' }];
  const pair = L.photoPair(photos, 'l1-rough');
  assert.equal(pair.first.id, 'a');
  assert.equal(pair.latest.id, 'b');
  assert.equal(pair.count, 2);
  assert.equal(L.photoPair(photos, 'l1-tables'), null);
  assert.deepEqual(L.comparable(cur, photos).map(e => e.id), ['l1-rough']);
  const sessions = [{ date: '2026-09-01', note: 'old', blocks: [{ exerciseId: 'l1-rough' }] }, { date: '2026-09-02', note: 'newer', blocks: [{ exerciseId: 'l1-rough' }] }, { date: '2026-09-03', note: '', blocks: [{ exerciseId: 'l1-rough' }] }];
  assert.equal(L.lastNote(sessions, 'l1-rough'), 'newer');
  assert.deepEqual(L.sessionTotals({ blocks: [{ kind: 'warmup', minutes: 5 }, { kind: 'homework', minutes: 20 }, { kind: 'play', minutes: 12 }] }), { study: 25, play: 12 });
});

test('after a session, the next plan within the hour is just the next exercise', () => {
  const p = completeUnits('l0', 'l1');
  const plan = L.continuationPlan(cur, p, settings, { today: T, playDone: 0 });
  assert.deepEqual(plan.blocks.map(b => [b.kind, b.exerciseId ?? null]), [['homework', 'c250boxes-boxes'], ['play', null]]);
  assert.equal(plan.blocks[0].minutes, 20);
  assert.equal(plan.continuing, true);
  assert.deepEqual(L.continuationPlan(cur, p, settings, { today: T, playDone: 5 }).blocks.map(b => b.kind), ['homework'], 'any free drawing today means none is suggested again');
  const now = new Date('2026-09-18T20:00:00');
  const s = date => ({ date, start: date + 'T19:00:00', end: date + 'T19:30:00', blocks: [{ kind: 'homework', exerciseId: 'l1-rough', minutes: 30, count: 1 }] });
  assert.equal(L.minutesSinceLastSession([s(T)], T, now), 30);
  assert.equal(L.minutesSinceLastSession([], T, now), null);
  assert.equal(L.minutesSinceLastSession([{ ...s(T), quick: true }], T, now), null, 'quick taps are not sessions');
  const far = L.todaySoFar(cur, [s(T), { ...s(T), quick: true, blocks: [{ kind: 'homework', exerciseId: 'l1-rough', minutes: 0, count: 2 }] }], T);
  assert.equal(far.study, 30);
  assert.equal(far.sessions, 1);
  assert.deepEqual(far.items.map(i => [i.name, i.count]), [['Rough perspective', 3]]);
});

test('exercise context and progress words read like a person', () => {
  const ex = L.exerciseById(cur, 'l1-ghostedlines');
  assert.equal(L.exerciseContext(cur, ex), 'Lesson 1 · exercise 2 of 10');
  assert.equal(L.exerciseContext(cur, L.exerciseById(cur, 'c250boxes-boxes')), '250 Box Challenge');
  assert.equal(L.exerciseContext(cur, L.exerciseById(cur, 'l0-read')), 'Lesson 0');
  assert.equal(L.progressWords(ex, {}), 'page 1 of 1');
  assert.equal(L.progressWords(L.exerciseById(cur, 'c250boxes-boxes'), { 'c250boxes-boxes': { count: 62 } }), 'box 63 of 250');
  assert.equal(L.progressWords(L.exerciseById(cur, 'l0-read'), {}), 'not read yet');
  assert.equal(L.blockSentence(cur, { kind: 'homework', exerciseId: 'l1-rough', count: 2, minutes: 20 }), 'Rough perspective · 2 pages · 20 min');
  assert.equal(L.blockSentence(cur, { kind: 'play', minutes: 30 }), 'Free drawing · 30 min');
  assert.equal(L.blockSentence(cur, { kind: 'homework', exerciseId: 'l0-read', count: 1, minutes: 12 }), 'Read Lesson 0 · read · 12 min');
});
