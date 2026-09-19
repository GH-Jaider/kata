// App state and persistence. Everything lives on this device (IndexedDB); nothing leaves it.

import { idb } from './idb.js';
import { applySession, todayKey, uid } from './logic.js';

export const DEFAULT_SETTINGS = {
  studyMinutes: 30,
  warmupMinutes: 10,
  warmupCount: 2,
  playMinutes: 30,
  medium: 'both',   // paper | tablet | both
  theme: 'auto',    // auto | light | dark
  sound: true,
  name: '',
};

const state = {
  ready: false,
  curriculum: null,
  settings: { ...DEFAULT_SETTINGS },
  progress: {},   // exerciseId -> { count, sessions, warmups, minutes, last }
  sessions: [],   // { id, date, start, end, blocks: [{ kind, exerciseId, minutes, count, medium }], note }
  photos: [],     // { id, exerciseId, sessionId, date, w, h }
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

export function get() {
  return state;
}

export async function load(curriculumUrl) {
  const [settings, progress, sessions, photos] = await Promise.all([
    idb.get('kv', 'settings'), idb.get('kv', 'progress'), idb.get('kv', 'sessions'), idb.get('kv', 'photos'),
  ]);
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  state.progress = progress || {};
  state.sessions = sessions || [];
  state.photos = photos || [];
  state.curriculum = await (await fetch(curriculumUrl)).json();
  state.ready = true;
  emit();
  return state;
}

export async function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await idb.set('kv', 'settings', state.settings);
  emit();
}

export async function recordSession(session) {
  session.id ??= uid();
  session.date ??= todayKey();
  state.sessions = [...state.sessions, session];
  state.progress = applySession(state.progress, session);
  await idb.setMany('kv', [['sessions', state.sessions], ['progress', state.progress]]);
  emit();
  return session;
}

export async function deleteSession(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  state.sessions = state.sessions.filter(x => x.id !== id);
  state.progress = applySession(state.progress, s, -1);
  for (const ph of state.photos.filter(p => p.sessionId === id)) await idb.del('photos', ph.id);
  state.photos = state.photos.filter(p => p.sessionId !== id);
  await idb.setMany('kv', [['sessions', state.sessions], ['progress', state.progress], ['photos', state.photos]]);
  emit();
}

// A tap on + or - in the curriculum. Plus logs a page (a zero-minute "quick" session for today, merged with
// the previous tap on the same exercise) so it counts for the streak; minus takes back a quick tap, or
// corrects the count directly when there is nothing to take back.
export async function tick(exerciseId, delta) {
  const today = todayKey();
  const quick = state.sessions.find(s => s.quick && s.date === today && s.blocks[0].exerciseId === exerciseId);
  if (delta > 0) {
    if (quick) {
      quick.blocks[0].count += 1;
      state.sessions = [...state.sessions];
      state.progress = applySession(state.progress, { date: today, blocks: [{ kind: 'homework', exerciseId, count: 1, minutes: 0 }] });
      // applySession also bumps the session counter; a merged tap is the same sitting, so undo that.
      state.progress[exerciseId].sessions -= 1;
      await idb.setMany('kv', [['sessions', state.sessions], ['progress', state.progress]]);
      emit();
      return;
    }
    await recordSession({ date: today, start: new Date().toISOString(), end: new Date().toISOString(), quick: true, note: '', blocks: [{ kind: 'homework', exerciseId, count: 1, minutes: 0, medium: state.settings.medium === 'both' ? null : state.settings.medium }] });
    return;
  }
  if (quick && quick.blocks[0].count > 0) {
    if (quick.blocks[0].count === 1) { await deleteSession(quick.id); return; }
    quick.blocks[0].count -= 1;
    state.sessions = [...state.sessions];
    state.progress = applySession(state.progress, { date: today, blocks: [{ kind: 'homework', exerciseId, count: 1, minutes: 0 }] }, -1);
    state.progress[exerciseId].sessions += 1;
    await idb.setMany('kv', [['sessions', state.sessions], ['progress', state.progress]]);
    emit();
    return;
  }
  await adjustCount(exerciseId, delta);
}

// A direct correction of the count, outside any session.
export async function adjustCount(exerciseId, delta) {
  const p = { ...state.progress };
  const cur = { count: 0, sessions: 0, warmups: 0, minutes: 0, last: null, ...(p[exerciseId] || {}) };
  cur.count = Math.max(0, cur.count + delta);
  if (delta > 0) cur.last = todayKey();
  p[exerciseId] = cur;
  state.progress = p;
  await idb.set('kv', 'progress', p);
  emit();
}

// ---------- photos ----------

async function downscale(file, max = 1600) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.86));
  return { blob, w, h };
}

export async function addPhoto(file, meta) {
  const { blob, w, h } = await downscale(file);
  const id = uid();
  await idb.set('photos', id, blob);
  state.photos = [...state.photos, { id, exerciseId: meta.exerciseId || null, sessionId: meta.sessionId || null, date: meta.date || todayKey(), w, h }];
  await idb.set('kv', 'photos', state.photos);
  emit();
  return id;
}

export function photoBlob(id) {
  return idb.get('photos', id);
}

export async function deletePhoto(id) {
  await idb.del('photos', id);
  state.photos = state.photos.filter(p => p.id !== id);
  await idb.set('kv', 'photos', state.photos);
  emit();
}

// ---------- backup ----------

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function exportBackup() {
  const photos = [];
  for (const p of state.photos) {
    const blob = await idb.get('photos', p.id);
    if (blob) photos.push({ ...p, data: await blobToDataUrl(blob) });
  }
  return JSON.stringify({ app: 'kata', version: 1, exported: new Date().toISOString(), settings: state.settings, progress: state.progress, sessions: state.sessions, photos });
}

export async function importBackup(text) {
  const data = JSON.parse(text);
  if (data.app !== 'kata' || !Array.isArray(data.sessions)) throw new Error('This is not a Kata backup.');
  await idb.clear('photos');
  const photos = [];
  for (const p of data.photos || []) {
    const blob = await (await fetch(p.data)).blob();
    await idb.set('photos', p.id, blob);
    const { data: _drop, ...meta } = p;
    photos.push(meta);
  }
  state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  state.progress = data.progress || {};
  state.sessions = data.sessions;
  state.photos = photos;
  await idb.setMany('kv', [['settings', state.settings], ['progress', state.progress], ['sessions', state.sessions], ['photos', state.photos]]);
  emit();
}

export async function wipe() {
  await idb.clear('photos');
  await idb.clear('kv');
  state.settings = { ...DEFAULT_SETTINGS };
  state.progress = {};
  state.sessions = [];
  state.photos = [];
  emit();
}
