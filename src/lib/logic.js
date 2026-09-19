// Pure functions, no DOM. Shared by the app and the node tests.

// ---------- dates (local calendar days as 'YYYY-MM-DD') ----------

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

// b minus a, in whole days.
export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function fmtMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function fmtDate(key, { withYear = false } = {}) {
  const [y, m, d] = key.split('-').map(Number);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (withYear) opts.year = 'numeric';
  return new Date(y, m - 1, d).toLocaleDateString('en', opts);
}

const SINGULAR = { pages: 'page', boxes: 'box', cylinders: 'cylinder', wheels: 'wheel', rows: 'row', read: 'read' };
export function unitLabel(unit, n) {
  return n === 1 ? (SINGULAR[unit] || unit) : unit;
}

// ---------- curriculum ----------

export function units(cur) {
  return cur.parts.flatMap(p => p.units.map(u => ({ ...u, partId: p.id, partName: p.name })));
}

export function unitById(cur, id) {
  return units(cur).find(u => u.id === id) || null;
}

// Exercises in the recommended path order, then the parallel challenges.
export function exercises(cur) {
  const all = units(cur);
  const parallel = new Set(cur.parallel || []);
  const out = [];
  for (const uid of [...cur.order, ...(cur.parallel || [])]) {
    const u = all.find(x => x.id === uid);
    if (!u) continue;
    for (const ex of u.exercises) {
      out.push({ ...ex, unitId: u.id, unitName: u.name, unitShort: u.short, unitKind: u.kind, parallel: parallel.has(uid) });
    }
  }
  return out;
}

export function exerciseById(cur, id) {
  return exercises(cur).find(e => e.id === id) || null;
}

export function countOf(progress, id) {
  return progress[id]?.count || 0;
}

export function exerciseState(ex, progress) {
  const count = countOf(progress, ex.id);
  return { count, quota: ex.quota, done: count >= ex.quota, pct: Math.min(1, count / ex.quota), remaining: Math.max(0, ex.quota - count) };
}

export function stageOf(ex, count) {
  if (!ex.stages) return null;
  return ex.stages.find(s => count < s.to) || ex.stages[ex.stages.length - 1];
}

export function unitDone(unit, progress) {
  return unit.exercises.every(ex => exerciseState(ex, progress).done);
}

export function unitStarted(unit, progress) {
  return unit.exercises.some(ex => countOf(progress, ex.id) > 0);
}

export function unitStatus(cur, unit, progress) {
  if (unitDone(unit, progress)) return 'complete';
  if (unitStarted(unit, progress)) return 'active';
  const prereqs = (unit.after || []).map(id => unitById(cur, id)).filter(Boolean);
  return prereqs.every(u => unitDone(u, progress)) ? 'available' : 'locked';
}

// Mean completion across the unit's exercises, so 250 boxes do not drown a one-page exercise.
export function unitProgress(unit, progress) {
  const s = unit.exercises.map(ex => exerciseState(ex, progress).pct);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
}

// First unfinished exercise on the main path.
export function nextExercise(cur, progress) {
  for (const ex of exercises(cur)) {
    if (ex.parallel) continue;
    if (!exerciseState(ex, progress).done) return ex;
  }
  return null;
}

// The parallel challenge, if its prerequisites are met and it is not finished.
export function nextParallel(cur, progress) {
  for (const ex of exercises(cur)) {
    if (!ex.parallel) continue;
    const unit = unitById(cur, ex.unitId);
    if (unitStatus(cur, unit, progress) !== 'locked' && !exerciseState(ex, progress).done) return ex;
  }
  return null;
}

// Warm-ups: exercises flagged for it that you have already started.
export function unlockedWarmups(cur, progress) {
  return exercises(cur).filter(ex => ex.warmup && countOf(progress, ex.id) > 0);
}

// ---------- session planning ----------

// Deterministic PRNG (mulberry32) seeded from a string, so the plan for a given day stays put.
export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted pick without replacement. The weight grows with the days since the exercise was last practised
// and shrinks with how often it has already come up as a warm-up: a loose Leitner box.
export function warmupWeight(p, today) {
  const days = p?.last ? Math.min(30, Math.max(0, daysBetween(p.last, today))) : 30;
  return 1 + days + 6 / (1 + (p?.warmups || 0));
}

export function pickWarmups(cur, progress, { count = 2, seed = '', today = todayKey() } = {}) {
  const pool = unlockedWarmups(cur, progress).map(ex => ({ ex, w: warmupWeight(progress[ex.id], today) }));
  const rnd = seeded(`${seed}|${today}`);
  const out = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((a, x) => a + x.w, 0);
    let r = rnd() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w;
      if (r <= 0) break;
    }
    out.push(pool[i].ex);
    pool.splice(i, 1);
  }
  return out;
}

// What one homework step is worth: one page, or one page's worth of boxes, cylinders, wheels or rows.
export function plannedUnits(ex) {
  if (!ex || ex.kind === 'reading') return 1;
  return ex.unit === 'pages' ? 1 : (ex.perPage || 1);
}

export function planSession(cur, progress, settings, { seed = '', today = todayKey() } = {}) {
  const warmups = pickWarmups(cur, progress, { count: settings.warmupCount, seed, today });
  const per = warmups.length ? Math.max(1, Math.round(settings.warmupMinutes / warmups.length)) : 0;
  const homework = nextExercise(cur, progress);
  const parallel = nextParallel(cur, progress);
  const blocks = warmups.map(ex => ({ kind: 'warmup', exerciseId: ex.id, minutes: per, planned: 0 }));
  if (homework) blocks.push({ kind: 'homework', exerciseId: homework.id, minutes: homework.kind === 'reading' ? 15 : Math.max(5, settings.studyMinutes - per * warmups.length), planned: plannedUnits(homework) });
  blocks.push({ kind: 'play', minutes: settings.playMinutes });
  return { date: today, seed, blocks, parallel: parallel ? parallel.id : null };
}

// ---------- history ----------

export function applySession(progress, session, sign = 1) {
  const p = { ...progress };
  for (const b of session.blocks) {
    if (!b.exerciseId) continue;
    const cur = { count: 0, sessions: 0, warmups: 0, minutes: 0, last: null, ...(p[b.exerciseId] || {}) };
    cur.count = Math.max(0, cur.count + sign * (b.count || 0));
    cur.minutes = Math.max(0, cur.minutes + sign * (b.minutes || 0));
    cur.sessions = Math.max(0, cur.sessions + sign);
    if (b.kind === 'warmup') cur.warmups = Math.max(0, cur.warmups + sign);
    if (sign > 0 && (!cur.last || cur.last < session.date)) cur.last = session.date;
    p[b.exerciseId] = cur;
  }
  return p;
}

function counts(session) {
  return session.blocks.some(b => (b.minutes || 0) > 0 || (b.count || 0) > 0);
}

// Map of date -> { study, play, count }
export function dayTotals(sessions) {
  const m = new Map();
  for (const s of sessions) {
    if (!counts(s)) continue;
    const t = m.get(s.date) || { study: 0, play: 0, count: 0 };
    for (const b of s.blocks) {
      if (b.kind === 'play') t.play += b.minutes || 0;
      else t.study += b.minutes || 0;
      t.count += b.count || 0;
    }
    m.set(s.date, t);
  }
  return m;
}

// Consecutive days with activity, ending today or yesterday.
export function streak(sessions, today = todayKey()) {
  const days = dayTotals(sessions);
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function totals(sessions) {
  let study = 0;
  let play = 0;
  let days = 0;
  for (const t of dayTotals(sessions).values()) {
    study += t.study;
    play += t.play;
    days++;
  }
  return { study, play, days, ratio: study + play ? play / (study + play) : 0 };
}

// Columns of weeks (Monday first), the last column ending today.
export function heatmap(sessions, today = todayKey(), weeks = 12) {
  const tot = dayTotals(sessions);
  const [y, m, d] = today.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const start = addDays(today, -(dow + 7 * (weeks - 1)));
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i);
      const t = tot.get(date);
      col.push({ date, study: t?.study || 0, play: t?.play || 0, count: t?.count || 0, future: date > today });
    }
    out.push(col);
  }
  return out;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- weekly goal (v0.2): 5 of 7 with 2 reserve days instead of a daily streak ----------

// Monday-first view of the week containing `today`.
export function weekView(sessions, today = todayKey(), goal = 5) {
  const tot = dayTotals(sessions);
  const [y, m, d] = today.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const start = addDays(today, -dow);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    days.push({ date, done: tot.has(date), today: date === today, future: date > today, label: 'MTWTFSS'[i] });
  }
  const done = days.filter(x => x.done).length;
  const left = days.filter(x => !x.done && !x.future && !x.today).length; // days already missed
  const reserve = Math.max(0, 7 - goal - left);
  return { days, done, goal, reserve, met: done >= goal };
}

// Days with any activity, ever.
export function daysDrawn(sessions) {
  return dayTotals(sessions).size;
}

// First and latest photo of an exercise, or null.
export function photoPair(photos, exerciseId) {
  const ps = photos.filter(p => p.exerciseId === exerciseId).sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  if (!ps.length) return null;
  return { first: ps[0], latest: ps[ps.length - 1], count: ps.length };
}

// Exercises photographed at least twice, in path order.
export function comparable(cur, photos) {
  return exercises(cur).filter(ex => photos.filter(p => p.exerciseId === ex.id).length >= 2);
}

// The last note written after a session that included this exercise.
export function lastNote(sessions, exerciseId) {
  const s = [...sessions].reverse().find(x => x.note && x.blocks.some(b => b.exerciseId === exerciseId));
  return s ? s.note : '';
}

// Total minutes and counts of a session.
export function sessionTotals(session) {
  let study = 0, play = 0;
  for (const b of session.blocks) (b.kind === 'play' ? play += b.minutes || 0 : study += b.minutes || 0);
  return { study, play };
}

// Minutes since the last timed session ended today, or null.
export function minutesSinceLastSession(sessions, today = todayKey(), now = new Date()) {
  const ends = sessions.filter(s => s.date === today && !s.quick && s.end).map(s => new Date(s.end).getTime());
  if (!ends.length) return null;
  return Math.max(0, (now.getTime() - Math.max(...ends)) / 60000);
}

// After a session, the next plan within the hour is just the next exercise: no warm-up again, play only if none yet.
export function continuationPlan(cur, progress, settings, { today = todayKey(), playDone = 0 } = {}) {
  const homework = nextExercise(cur, progress);
  const blocks = [];
  if (homework) blocks.push({ kind: 'homework', exerciseId: homework.id, minutes: homework.kind === 'reading' ? 15 : Math.max(10, settings.studyMinutes - settings.warmupMinutes), planned: plannedUnits(homework) });
  if (!playDone) blocks.push({ kind: 'play', minutes: settings.playMinutes });
  return { date: today, seed: '', blocks, parallel: null, continuing: true };
}

// What happened today, per exercise, for the "so far" strip.
export function todaySoFar(cur, sessions, today = todayKey()) {
  const list = sessions.filter(s => s.date === today);
  const t = list.reduce((a, s) => { const x = sessionTotals(s); return { study: a.study + x.study, play: a.play + x.play }; }, { study: 0, play: 0 });
  const counts = new Map();
  for (const s of list) for (const b of s.blocks) if (b.exerciseId && b.count) counts.set(b.exerciseId, (counts.get(b.exerciseId) || 0) + b.count);
  const items = [...counts.entries()].map(([id, count]) => { const ex = exerciseById(cur, id); return { id, name: ex?.name || id, count, unit: ex?.unit || 'pages' }; });
  return { ...t, items, sessions: list.filter(s => !s.quick).length };
}

// "Lesson 1 · exercise 3 of 10" for lessons, "250 Box Challenge" for challenges.
export function exerciseContext(cur, ex) {
  const u = unitById(cur, ex.unitId);
  if (!u) return '';
  const i = u.exercises.findIndex(e => e.id === ex.id) + 1;
  if (u.kind !== 'lesson') return u.name;
  return u.exercises.length > 1 ? `${u.short} · exercise ${i} of ${u.exercises.length}` : u.short;
}

// "page 1 of 2", "box 63 of 250", "read" for reading.
export function progressWords(ex, progress) {
  if (ex.kind === 'reading') return countOf(progress, ex.id) ? 'read' : 'not read yet';
  const n = Math.min(ex.quota, countOf(progress, ex.id) + 1);
  return `${unitLabel(ex.unit, 1)} ${n} of ${ex.quota}`;
}

// A plain sentence for a finished block.
export function blockSentence(cur, b) {
  const ex = b.exerciseId ? exerciseById(cur, b.exerciseId) : null;
  const mins = b.minutes ? `${b.minutes} min` : null;
  if (!ex) return ['Free drawing', mins].filter(Boolean).join(' · ');
  const count = b.count ? (ex.kind === 'reading' ? 'read' : `${b.count} ${unitLabel(ex.unit, b.count)}`) : null;
  return [ex.name, count, mins].filter(Boolean).join(' · ');
}
