// Boot, routing and the app shell (sidebar on wide screens, tab bar on narrow ones).

import * as store from './store.js';
import { useDatabase } from './idb.js';
import { h, icon, applyTheme } from './ui.js';
import { renderToday, renderCurriculum, renderLog, renderProgress, renderSettings, renderSession } from './screens.js';
import { seedDemo } from './demo.js';

const ROUTES = { today: renderToday, curriculum: renderCurriculum, log: renderLog, progress: renderProgress, settings: renderSettings, session: renderSession };
const TABS = [
  ['today', 'Today', 'clock'],
  ['curriculum', 'Curriculum', 'book'],
  ['log', 'Log', 'image'],
  ['progress', 'Progress', 'bars'],
  ['settings', 'Settings', 'gear'],
];

const params = new URLSearchParams(location.search);
const demo = params.has('demo');
if (demo) useDatabase('kata-demo');

function route() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0] || 'today';
  return ROUTES[r] ? r : 'today';
}

export function navigate(r) {
  if (route() === r) render();
  else location.hash = '#' + r;
}

let cleanup = null;

function render() {
  cleanup?.();
  cleanup = null;
  const r = route();
  const app = document.getElementById('app');
  app.replaceChildren();
  const state = store.get();
  const ctx = { state, navigate, demo };
  const root = h('div', { class: 'screen', 'data-screen': r });

  if (r === 'session') {
    app.append(root);
    cleanup = renderSession(root, ctx) || null;
    return;
  }

  const side = h('nav', { class: 'side', 'aria-label': 'Sections' },
    h('div', { class: 'brand' }, h('img', { class: 'mark', src: 'icons/icon.svg', alt: '' }), 'Kata'),
    TABS.map(([id, label, ic]) => h('a', { class: 'nav-item' + (id === r ? ' on' : ''), href: '#' + id }, icon(ic), label)),
    h('div', { class: 'spacer' }),
    h('div', { class: 'foot' }, demo ? 'Demo data. Nothing here is real.' : 'Your data stays on this device.'),
  );
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Sections' },
    TABS.map(([id, label, ic]) => h('a', { class: 'tab' + (id === r ? ' on' : ''), href: '#' + id }, icon(ic), label)),
  );
  app.append(h('div', { class: 'shell' }, side, h('main', { class: 'main' }, root)), tabbar);
  cleanup = ROUTES[r](root, ctx) || null;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
store.subscribe(() => { if (route() !== 'session') render(); });

(async () => {
  try {
    await store.load('curricula/drawabox.json');
  } catch (e) {
    document.getElementById('app').replaceChildren(h('div', { class: 'screen' }, h('p', { class: 'empty' }, 'Could not load the curriculum: ' + e.message)));
    return;
  }
  applyTheme(store.get().settings.theme);
  if (demo && !store.get().sessions.length) await seedDemo(store);
  if ('serviceWorker' in navigator && !demo && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
