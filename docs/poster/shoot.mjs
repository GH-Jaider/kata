import { launch } from '../../test/browser/cdp.mjs';
import { join } from 'node:path';
const OUT = process.env.OUT || join(process.env.TMPDIR || '/tmp', 'kata-poster-shots');
const BASE = 'http://127.0.0.1:8080/docs/poster/';
const JOBS = [
  ['today-375', 'today.html', 375, 812], ['today-683', 'today.html', 683, 1024], ['today-1376', 'today.html', 1376, 1032], ['today-1280', 'today.html', 1280, 820],
  ['today-fresh-375', 'today.html?state=fresh', 375, 812], ['today-done-375', 'today.html?state=done', 375, 812], ['today-done-1376', 'today.html?state=done', 1376, 1032],
  ['session-375', 'session.html', 375, 812], ['session-683', 'session.html', 683, 1024], ['session-warmup-683', 'session.html?b=warmup', 683, 1024], ['session-play-683', 'session.html?b=play', 683, 1024], ['session-1376', 'session.html', 1376, 1032], ['session-portrait', 'session.html', 1032, 1376],
  ['summary-375', 'summary.html', 375, 812], ['summary-683', 'summary.html', 683, 1024], ['summary-1376', 'summary.html', 1376, 1032], ['summary-dark-375', 'summary.html?theme=dark', 375, 812],
  ['path-375', 'path.html', 375, 1100], ['path-683', 'path.html', 683, 1024], ['path-1376', 'path.html', 1376, 1032], ['path-dark-1376', 'path.html?theme=dark', 1376, 1032],
  ['journal-375', 'journal.html', 375, 1100], ['journal-683', 'journal.html', 683, 1024], ['journal-1376', 'journal.html', 1376, 1032],
  ['ficha-375', 'ficha.html', 375, 1100], ['ficha-683', 'ficha.html', 683, 1024], ['ficha-1280', 'ficha.html', 1280, 900],
];
const b = await launch({ outDir: OUT, width: 375, height: 812, device: 'ipad', scale: 1, port: 9391 });
try {
  for (const [name, src, w, h] of JOBS) { await b.viewport(w, h, 'mac', 1); await b.goto(BASE + src); await new Promise(r => setTimeout(r, 500)); await b.shot(name); }
  const bad = b.logs.filter(l => l.startsWith('[exception]'));
  console.log(bad.length ? bad.join('\n') : 'no exceptions', '->', OUT);
} finally { await b.close(); }
