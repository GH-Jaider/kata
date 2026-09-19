// DOM helpers: element builder, icons, progress ring, sheets, toasts, theme, sound.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

const ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  bars: '<path d="M4 20v-7M10 20V6M16 20v-10M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  external: '<path d="M7 17L17 7M8 7h9v9"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
  next: '<path d="M5 4l10 8-10 8zM19 5v14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  box: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  flame: '<path d="M12 22c4.4 0 7-3 7-7 0-3-1.6-5-3-7-1 2-2 3-3 3 0-3-1-6-3-8-1 3-5 6-5 11 0 4.4 2.6 8 7 8z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};

export function icon(name, size = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.classList.add('i');
  if (size !== 20) s.style.cssText = `width:${size}px;height:${size}px`;
  s.innerHTML = ICONS[name] || '';
  return s;
}

// Progress ring, 0..1.
export function ring(pct, size = 34, stroke = 3, color = 'var(--ink)') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${size} ${size}`);
  s.classList.add('ring');
  s.style.cssText = `width:${size}px;height:${size}px`;
  s.innerHTML = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--fill-strong)" stroke-width="${stroke}"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" ` +
    `stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, pct)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  return s;
}

export function sheet({ title, body, onClose }) {
  const back = h('div', { class: 'sheet-back' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
    h('div', { class: 'grab' }),
    h('div', { class: 'head' }, h('h2', {}, title), h('button', { class: 'btn icon', 'aria-label': 'Close', onclick: () => close() }, icon('close'))),
    body,
  );
  back.append(panel);
  function esc(e) { if (e.key === 'Escape') close(); }
  function close() {
    back.remove();
    document.removeEventListener('keydown', esc);
    if (!document.querySelector('.sheet-back')) document.body.classList.remove('locked');
    onClose?.();
  }
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc);
  document.body.classList.add('locked');
  document.body.append(back);
  return { close, el: panel };
}

export function confirmSheet({ title, text, ok = 'OK', danger = false }) {
  return new Promise(resolve => {
    const body = h('div', {},
      h('p', { class: 'muted' }, text),
      h('div', { class: 'btns mt-lg' },
        h('button', { class: 'btn', onclick: () => { s.close(); resolve(false); } }, 'Cancel'),
        h('button', { class: 'btn ' + (danger ? 'primary' : 'dark'), onclick: () => { s.close(); resolve(true); } }, ok),
      ),
    );
    const s = sheet({ title, body, onClose: () => resolve(false) });
  });
}

let toastEl = null;
let toastTimer = null;
export function toast(msg, ms = 2200) {
  toastEl?.remove();
  toastEl = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(toastEl);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl?.remove(); toastEl = null; }, ms);
}

// ---------- theme ----------

const THEME_KEY = 'kata.theme';
const COLORS = { light: '#F4F3EF', dark: '#0F0F10' };

export function applyTheme(pref = 'auto') {
  const root = document.documentElement;
  if (pref === 'light' || pref === 'dark') root.dataset.theme = pref;
  else delete root.dataset.theme;
  try {
    if (pref === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch { /* no storage: applies to this session only */ }
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = pref === 'light' ? COLORS.light : pref === 'dark' ? COLORS.dark : COLORS[scheme];
  }
}

// ---------- sound ----------

let audio = null;

// Call from a user gesture, so the timer can make a sound later on iOS.
export function primeAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { audio = null; }
}

export function chime() {
  if (!audio) return;
  try {
    const t = audio.currentTime;
    for (const [f, dt] of [[660, 0], [880, 0.18]]) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.5);
      o.connect(g).connect(audio.destination);
      o.start(t + dt);
      o.stop(t + dt + 0.55);
    }
  } catch { /* no sound */ }
}
