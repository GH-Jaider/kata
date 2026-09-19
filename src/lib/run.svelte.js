// The session runner: a plan, a current block, a wall-clock timer that survives reloads and Procreate.
import { cur, recordSession, deletePhoto } from './store.svelte.js';
import { uid, exerciseById } from './logic.js';

const KEY = 'kata.run';

export const run = $state({ current: null });

export function loadRun() {
  try { run.current = JSON.parse(localStorage.getItem(KEY)) || null; } catch { run.current = null; }
  return run.current;
}

function save() {
  if (run.current) localStorage.setItem(KEY, JSON.stringify($state.snapshot(run.current)));
  else localStorage.removeItem(KEY);
}

export function startRun(plan, medium) {
  run.current = { sessionId: uid(), start: new Date().toISOString(), plan, i: 0, startedAt: Date.now(), elapsed: 0, paused: false, counts: {}, skipped: {}, actual: {}, photos: [], alerted: {}, medium };
  save();
  return run.current;
}

export function elapsedMs() {
  const r = run.current;
  if (!r) return 0;
  return r.elapsed + (r.paused ? 0 : Date.now() - r.startedAt);
}

export function togglePause() {
  const r = run.current;
  if (r.paused) { r.startedAt = Date.now(); r.paused = false; }
  else { r.elapsed = elapsedMs(); r.paused = true; }
  save();
}

export function setCount(n) {
  const r = run.current;
  r.counts[r.i] = Math.max(0, n);
  save();
}

export function setSkipped(on) {
  const r = run.current;
  r.skipped ??= {};
  r.skipped[r.i] = !!on;
  save();
}

// What a step counts: what you set, else what it planned, else nothing; zero if you said you did not finish.
export function countFor(r, i) {
  if (r.skipped?.[i]) return 0;
  return r.counts[i] ?? r.plan.blocks[i].planned ?? 0;
}

export function markAlerted() {
  run.current.alerted[run.current.i] = true;
  save();
}

export function addRunPhoto(id) {
  run.current.photos.push(id);
  save();
}

function closeBlock() {
  const r = run.current;
  r.actual[r.i] = elapsedMs();
}

// A block you actually spent time in counts at least one minute. Reading blocks complete themselves.
function blockRecord(b, i, r) {
  const ms = r.actual[i] ?? 0;
  const ex = b.exerciseId ? exerciseById(cur, b.exerciseId) : null;
  let count = countFor(r, i);
  if (ex && ex.kind === 'reading' && !r.skipped?.[i] && ms > 0) count = 1;
  return { kind: b.kind, exerciseId: b.exerciseId, minutes: ms > 0 ? Math.max(1, Math.round(ms / 60000)) : 0, count, medium: r.medium };
}

export function nextBlock() {
  const r = run.current;
  closeBlock();
  r.i += 1;
  r.startedAt = Date.now();
  r.elapsed = 0;
  r.paused = false;
  save();
}

export async function finishRun() {
  const r = run.current;
  closeBlock();
  const blocks = r.plan.blocks.slice(0, r.i + 1).map((b, i) => blockRecord(b, i, r));
  const session = await recordSession({ id: r.sessionId, date: r.plan.date, start: r.start, end: new Date().toISOString(), blocks, note: '' });
  run.current = null;
  save();
  return session;
}

export async function discardRun() {
  const r = run.current;
  for (const id of r.photos) await deletePhoto(id);
  run.current = null;
  save();
}
