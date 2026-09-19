// App state (Svelte 5 runes) and persistence. Everything lives on this device; nothing leaves it.
import { idb } from './idb.js';
import { applySession, todayKey, uid } from './logic.js';
import curriculum from '#curricula/drawabox.json';

export const cur = curriculum;

export const DEFAULT_SETTINGS = {
  studyMinutes: 30, warmupMinutes: 10, warmupCount: 2, playMinutes: 30,
  medium: 'paper',      // paper | tablet
  theme: 'auto',        // auto | light | dark
  sound: true,
  weeklyGoal: 5,
  name: '',
};

export const db = $state({
  ready: false,
  settings: { ...DEFAULT_SETTINGS },
  progress: {},   // exerciseId -> { count, sessions, warmups, minutes, last }
  sessions: [],   // { id, date, start, end, blocks: [{ kind, exerciseId, minutes, count, medium }], note, quick? }
  photos: [],     // { id, exerciseId, sessionId, date, w, h }
});

async function persist(...keys) {
  await idb.setMany('kv', keys.map(k => [k, $state.snapshot(db[k])]));
}

export async function load() {
  const [settings, progress, sessions, photos] = await Promise.all([
    idb.get('kv', 'settings'), idb.get('kv', 'progress'), idb.get('kv', 'sessions'), idb.get('kv', 'photos'),
  ]);
  db.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (db.settings.medium === 'both') db.settings.medium = 'paper';
  db.progress = progress || {};
  db.sessions = sessions || [];
  db.photos = photos || [];
  db.ready = true;
}

export async function setSettings(patch) {
  db.settings = { ...db.settings, ...patch };
  await persist('settings');
}

export async function recordSession(session) {
  session.id ??= uid();
  session.date ??= todayKey();
  db.sessions = [...db.sessions, session];
  db.progress = applySession(db.progress, session);
  await persist('sessions', 'progress');
  return session;
}

export async function updateSession(id, patch) {
  db.sessions = db.sessions.map(s => (s.id === id ? { ...s, ...patch } : s));
  await persist('sessions');
}

export async function deleteSession(id) {
  const s = db.sessions.find(x => x.id === id);
  if (!s) return;
  db.sessions = db.sessions.filter(x => x.id !== id);
  db.progress = applySession(db.progress, $state.snapshot(s), -1);
  for (const ph of db.photos.filter(p => p.sessionId === id)) await idb.del('photos', ph.id);
  db.photos = db.photos.filter(p => p.sessionId !== id);
  await persist('sessions', 'progress', 'photos');
}

// + in the path logs a page for today as a zero-minute quick session (merged with a previous tap on the same exercise).
// - takes back a quick tap, or corrects the count directly.
export async function tick(exerciseId, delta) {
  const today = todayKey();
  const quick = db.sessions.find(s => s.quick && s.date === today && s.blocks[0].exerciseId === exerciseId);
  const one = { date: today, blocks: [{ kind: 'homework', exerciseId, count: 1, minutes: 0 }] };
  if (delta > 0) {
    if (quick) {
      db.sessions = db.sessions.map(s => (s === quick ? { ...s, blocks: [{ ...s.blocks[0], count: s.blocks[0].count + 1 }] } : s));
      db.progress = applySession(db.progress, one);
      db.progress[exerciseId].sessions -= 1;
      await persist('sessions', 'progress');
      return;
    }
    const now = new Date().toISOString();
    await recordSession({ date: today, start: now, end: now, quick: true, note: '', blocks: [{ kind: 'homework', exerciseId, count: 1, minutes: 0, medium: db.settings.medium }] });
    return;
  }
  if (quick && quick.blocks[0].count > 0) {
    if (quick.blocks[0].count === 1) return deleteSession(quick.id);
    db.sessions = db.sessions.map(s => (s === quick ? { ...s, blocks: [{ ...s.blocks[0], count: s.blocks[0].count - 1 }] } : s));
    db.progress = applySession(db.progress, one, -1);
    db.progress[exerciseId].sessions += 1;
    await persist('sessions', 'progress');
    return;
  }
  const p = { ...db.progress };
  const c = { count: 0, sessions: 0, warmups: 0, minutes: 0, last: null, ...(p[exerciseId] || {}) };
  c.count = Math.max(0, c.count + delta);
  p[exerciseId] = c;
  db.progress = p;
  await persist('progress');
}

// Change how many pages a finished session's block counted; progress follows.
export async function setBlockCount(sessionId, index, count) {
  const s = db.sessions.find(x => x.id === sessionId);
  const b = s?.blocks[index];
  if (!b || !b.exerciseId) return;
  const delta = count - (b.count || 0);
  if (!delta) return;
  db.sessions = db.sessions.map(x => (x.id === sessionId ? { ...x, blocks: x.blocks.map((bb, i) => (i === index ? { ...bb, count } : bb)) } : x));
  const sign = Math.sign(delta);
  db.progress = applySession(db.progress, { date: s.date, blocks: [{ kind: b.kind, exerciseId: b.exerciseId, count: Math.abs(delta), minutes: 0 }] }, sign);
  db.progress[b.exerciseId].sessions -= sign;
  if (b.kind === 'warmup') db.progress[b.exerciseId].warmups -= sign;
  await persist('sessions', 'progress');
}

// ---------- photos ----------

async function downscale(file, max = 1600) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.86));
  return { blob, w, h };
}

export async function addPhoto(file, meta) {
  const { blob, w, h } = await downscale(file);
  const id = uid();
  await idb.set('photos', id, blob);
  db.photos = [...db.photos, { id, exerciseId: meta.exerciseId || null, sessionId: meta.sessionId || null, kind: meta.kind || 'homework', date: meta.date || todayKey(), w, h }];
  await persist('photos');
  return id;
}

export function photoBlob(id) {
  return idb.get('photos', id);
}

export async function deletePhoto(id) {
  await idb.del('photos', id);
  db.photos = db.photos.filter(p => p.id !== id);
  await persist('photos');
}

// ---------- backup ----------

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
}

export async function exportBackup() {
  const photos = [];
  for (const p of db.photos) { const blob = await idb.get('photos', p.id); if (blob) photos.push({ ...$state.snapshot(p), data: await blobToDataUrl(blob) }); }
  return JSON.stringify({ app: 'kata', version: 2, exported: new Date().toISOString(), settings: $state.snapshot(db.settings), progress: $state.snapshot(db.progress), sessions: $state.snapshot(db.sessions), photos });
}

export async function importBackup(text) {
  const data = JSON.parse(text);
  if (data.app !== 'kata' || !Array.isArray(data.sessions)) throw new Error('This is not a Kata backup.');
  await idb.clear('photos');
  const photos = [];
  for (const p of data.photos || []) { const blob = await (await fetch(p.data)).blob(); await idb.set('photos', p.id, blob); const { data: _d, ...meta } = p; photos.push(meta); }
  db.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  db.progress = data.progress || {};
  db.sessions = data.sessions;
  db.photos = photos;
  await persist('settings', 'progress', 'sessions', 'photos');
}

export async function wipe() {
  await idb.clear('photos');
  await idb.clear('kv');
  db.settings = { ...DEFAULT_SETTINGS };
  db.progress = {};
  db.sessions = [];
  db.photos = [];
}
