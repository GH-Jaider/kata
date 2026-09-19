// The masthead menu must not move between screens. Measures every nav link on every route, at three widths.
// Usage: node test/browser/mast.mjs [baseUrl] [route,route,...]
import { launch } from './cdp.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:5173/';
const ROUTES = (process.argv[3] || 'today,path,journal,howto,settings').split(',');
const b = await launch({ width: 1280, height: 800, device: 'mac', scale: 1 });
let bad = 0;
for (const [w, h, dev] of [[1280, 800, 'mac'], [900, 800, 'mac'], [390, 844, 'iphone']]) {
  await b.viewport(w, h, dev, 1);
  const seen = {};
  for (const r of ROUTES) {
    await b.goto(BASE + '#/' + r);
    await b.eval('document.fonts.ready.then(() => new Promise(res => setTimeout(res, 150)))');
    const pos = await b.eval(`[...document.querySelectorAll('.mast nav a')].map(a => { const x = a.getBoundingClientRect(); return [a.textContent.trim(), Math.round(x.left * 10) / 10, Math.round(x.width * 10) / 10]; })`);
    for (const [label, left, width] of pos) {
      const key = label;
      if (!seen[key]) { seen[key] = { left, width, route: r }; continue; }
      if (Math.abs(seen[key].left - left) > 0.5 || Math.abs(seen[key].width - width) > 0.5) { bad++; console.log(`MOVED at ${w}px: "${label}" ${seen[key].route}: left ${seen[key].left} w ${seen[key].width} → ${r}: left ${left} w ${width}`); }
    }
  }
  console.log(`${w}px: ${Object.keys(seen).length} links checked across ${ROUTES.length} routes`);
}
await b.close();
console.log(bad ? `FAILED: ${bad} shifts` : 'menu stays put.');
process.exitCode = bad ? 1 : 0;
