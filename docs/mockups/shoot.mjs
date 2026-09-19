// Screenshots every mockup at its widths.   node docs/mockups/shoot.mjs   (needs npm run dev)
import { launch } from '../../test/browser/cdp.mjs';
import { join } from 'node:path';
const OUT = process.env.OUT || join(process.env.TMPDIR || '/tmp', 'kata-mock-shots');
const BASE = process.env.KATA_URL || 'http://127.0.0.1:8080/docs/mockups/';
const JOBS = [
  ['today-plan-375', 'today.html?state=plan', 375, 812], ['today-plan-683', 'today.html?state=plan', 683, 900], ['today-plan-1280', 'today.html?state=plan', 1280, 820],
  ['today-fresh-375', 'today.html?state=fresh', 375, 812], ['today-done-375', 'today.html?state=done', 375, 812], ['today-done-light-375', 'today.html?state=done&theme=light', 375, 812],
  ['session-375', 'session.html', 375, 812], ['session-683', 'session.html', 683, 900], ['session-light-683', 'session.html?theme=light', 683, 900],
  ['summary-375', 'summary.html', 375, 812], ['summary-light-375', 'summary.html?theme=light', 375, 812],
  ['ficha-375', 'ficha.html', 375, 900], ['ficha-683', 'ficha.html', 683, 760], ['ficha-light-683', 'ficha.html?theme=light', 683, 760],
  ['path-375', 'path.html', 375, 1100], ['path-1280', 'path.html', 1280, 1000],
  ['journal-375', 'journal.html', 375, 1100], ['journal-683', 'journal.html', 683, 1000],
];
const b = await launch({ outDir: OUT, width: 375, height: 812, device: 'ipad', scale: 2, port: 9355 });
try {
  for (const [name, src, w, h] of JOBS) {
    await b.viewport(w, h, w >= 1000 ? 'mac' : 'ipad', 2);
    await b.goto(BASE + src);
    await new Promise(r => setTimeout(r, 500));
    await b.shot(name);
    console.log('shot', name);
  }
  const bad = b.logs.filter(l => l.startsWith('[exception]') || l.includes('error'));
  if (bad.length) console.log(bad.join('\n'));
} finally { await b.close(); }
console.log('done ->', OUT);
