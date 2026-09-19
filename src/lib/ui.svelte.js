// Small UI state: toasts, the current route, and the motion helper every screen change goes through.
import { tick } from 'svelte';

export const ui = $state({ toast: null, route: parse(location.hash) });

export const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Run a state change inside a view transition (a 200 ms cross-fade, and a morph for elements that share a
// view-transition-name), or plainly when the browser cannot or the user prefers no motion.
let pending = null;
export function withTransition(change) {
  if (!document.startViewTransition || reduceMotion()) { change(); return Promise.resolve(); }
  if (pending) { change(); return pending; }
  const vt = document.startViewTransition(async () => { change(); await tick(); });
  // A transition can be skipped by the browser (viewport resized, another one started); that is fine.
  vt.ready.catch(() => {});
  vt.updateCallbackDone.catch(() => {});
  pending = vt.finished.catch(() => {}).finally(() => { pending = null; });
  return pending;
}

let timer = null;
export function toast(msg, ms = 2200) {
  ui.toast = msg;
  clearTimeout(timer);
  timer = setTimeout(() => { ui.toast = null; }, ms);
}

export function parse(hash) {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'today', id: parts[1] || null };
}

export function navigate(path) {
  const target = '#/' + path.replace(/^\/+/, '');
  if (location.hash === target) withTransition(() => { ui.route = parse(target); });
  else location.hash = target;
}

window.addEventListener('hashchange', () => { withTransition(() => { ui.route = parse(location.hash); window.scrollTo(0, 0); }); });

export function applyTheme(pref = 'auto') {
  const root = document.documentElement;
  if (pref === 'light' || pref === 'dark') root.dataset.theme = pref; else delete root.dataset.theme;
  try { if (pref === 'auto') localStorage.removeItem('kata.theme'); else localStorage.setItem('kata.theme', pref); } catch {}
}

// Sound: primed on a user gesture so the timer can chime later on iOS.
let audio = null;
export function primeAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
}
export function chime() {
  if (!audio) return;
  try {
    const t = audio.currentTime;
    for (const [f, dt] of [[660, 0], [880, 0.18]]) {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.5);
      o.connect(g).connect(audio.destination); o.start(t + dt); o.stop(t + dt + 0.55);
    }
  } catch {}
}
