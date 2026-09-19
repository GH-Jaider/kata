// End-to-end walk through Kata in headless Chrome on a fresh profile (so a fresh database). Needs `npm run dev`.
import { launch } from './cdp.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

setTimeout(() => { console.log('x timed out'); process.exit(2); }, 150_000).unref();
const BASE = process.env.KATA_URL || 'http://127.0.0.1:5173/';
const OUT = process.env.KATA_SHOTS || join(tmpdir(), 'kata-shots');
const photo = fileURLToPath(new URL('../../icons/icon-192.png', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = name => console.log('ok', name);
// Click through a driver.js tour, checking titles along the way; returns the titles seen.
async function runTour(expectFirst) {
  const titles = [];
  for (let i = 0; i < 20; i++) {
    const t0 = Date.now();
    while (Date.now() - t0 < 4000 && !(await b.eval(`!!document.querySelector('.driver-popover-title')`))) await sleep(80);
    const title = await b.eval(`document.querySelector('.driver-popover-title')?.textContent || ''`);
    if (!title) break;
    titles.push(title);
    if (i === 0 && expectFirst) assert.equal(title, expectFirst);
    const btn = await b.eval(`document.querySelector('.driver-popover-next-btn')?.textContent || ''`);
    await b.eval(`document.querySelector('.driver-popover-next-btn').click()`);
    await sleep(350);
    if (btn === 'Done') break;
  }
  return titles;
}

const b = await launch({ outDir: OUT, width: 375, height: 812, device: 'ipad', scale: 2, port: 9411 });
const body = async () => (await b.eval('document.body.innerText')).toLowerCase();
const clickText = async (text, sel = 'button, a') => {
  const ok = await b.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  assert.ok(ok, `no element with text "${text}"`);
  await sleep(300);
};
const waitText = async (text, timeout = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if ((await body()).includes(text.toLowerCase())) return; await sleep(100); } throw new Error(`No "${text}" on the page`); };

try {
  await b.colorScheme('light'); // headless Chrome defaults to dark; the app follows the system
  await b.goto(BASE);
  await waitText('First session');
  assert.match(await body(), /Read Lesson 0/i);
  await b.shot('01-today-fresh');
  step('fresh Today: first session is reading Lesson 0');

  // The tour starts by itself the first time and walks Today, Path and Journal, then comes back.
  await sleep(900);
  await b.shot('00-tour-step1');
  const titles = await runTour('Four places');
  assert.deepEqual(titles, ['Four places', 'A session is a few steps', 'The exercise you are on', 'Start runs the clock', 'Settings', 'The course', 'Where you are', 'Your days', 'Your pages', 'That is all']);
  assert.equal(await b.eval(`location.hash`), '#/today');
  assert.ok(!(await b.eval(`!!document.querySelector('.driver-popover')`)), 'tour closed');
  assert.equal(await b.eval(`localStorage.getItem('kata.tour')`), '1');
  step('first-run tour across Today, Path and Journal');

  await b.eval(`[...document.querySelectorAll('button')].find(e => e.textContent.trim().startsWith('Start')).click()`);
  await sleep(110);
  await b.shot('02a-start-morph');
  await waitText('Read Lesson 0');
  await sleep(1100);
  await b.shot('02b-session-tour');
  const stitles = await runTour('Where you are');
  assert.deepEqual(stitles, ['Where you are', 'What to do', 'The clock', 'Keep the page', 'Move on'], 'reading has no page counter');
  step('first-session tour');
  assert.match(await body(), /1 of 2/i);
  assert.match(await body(), /15:00|14:5\d/i);
  await b.shot('02-session-reading');
  assert.match(await body(), /open lesson 0 on drawabox\.com/i);
  await clickText('Done reading');
  await waitText('Whatever you like.');
  assert.match(await body(), /2 of 2/i);
  await b.setFile('input[type=file]', photo);
  await waitText('Photo saved');
  await b.shot('03-session-play');
  await clickText('Finish session');
  await waitText('Session done');
  assert.match(await body(), /next on the path: superimposed lines \(lesson 1 · exercise 1 of 10\)/i);
  await b.eval(`(() => { const i = document.querySelector('input'); i.value = 'Read it twice.'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await b.shot('04-done');
  await clickText('Done');
  await waitText('Today so far');
  assert.match(await body(), /continue/i);
  assert.match(await body(), /superimposed lines/i);
  assert.match(await body(), /no warm-up needed/i);
  await b.shot('05-today-after');
  step('first session: start, next, photo, finish, note, done');

  await b.goto(BASE);
  await waitText('Today so far');
  step('persists across reload');

  await b.viewport(2000, 1124, 'mac', 1);
  await b.colorScheme('dark');
  await b.goto(BASE);
  await waitText('Today so far');
  const [blocksH, blkH] = await b.eval(`[document.querySelector('.blocks').getBoundingClientRect().height, document.querySelector('.blocks .blk').getBoundingClientRect().height]`);
  assert.ok(Math.abs(blocksH - blkH) < 2, `no empty band under two blocks (blocks ${blocksH}, block ${blkH})`);
  await b.shot('05b-today-continue-wide-dark');
  await b.colorScheme('light');
  await b.viewport(375, 812, 'ipad', 2);
  step('continuation layout fills the row on a wide dark window');

  await b.goto(BASE + '#/path');
  await waitText('Path');
  assert.ok(await b.eval(`!!document.querySelector('.unit.complete')`), 'Lesson 0 complete');
  assert.ok(await b.eval(`!!document.querySelector('.unit.available')`), 'Lesson 1 available');
  await waitText('Superimposed Lines'); // the next unit opens by itself
  await b.eval(`(() => { const ex = [...document.querySelectorAll('.ex')].find(e => e.textContent.includes('Superimposed lines')); ex.querySelector('[aria-label="One more"]').click(); })()`);
  await waitText('1 / 2 pages');
  await b.shot('06-path', { full: true });
  step('path: unit states and +1 page');

  await b.goto(BASE + '#/card/l1-ghostedlines');
  await waitText('Ghosted lines');
  assert.equal(await b.eval(`document.querySelectorAll('.steps li').length`), 4);
  await clickText('Log a page');
  await waitText('+1 page');
  await b.shot('07-card', { full: true });
  step('card: steps and log a page');

  // The loop the owner hit: finish a session without counting pages. Kata asks, you answer, the path moves.
  await b.goto(BASE);
  await waitText('Today so far');
  await clickText('Continue');
  await waitText('Superimposed lines');
  assert.match(await body(), /page 2 of 2/i, 'the step is one page: the second of two');
  assert.match(await body(), /didn't finish this page/i);
  assert.ok(!(await body()).includes('read done'));
  await b.shot('05d-session-page-375');
  await b.viewport(1376, 1032, 'mac', 1);
  await sleep(300);
  await b.shot('05d-session-page-1376');
  await b.viewport(375, 812, 'ipad', 2);
  await sleep(300);
  await clickText('Page done');
  await sleep(450);
  await b.shot('05e-moment-indigo');
  await b.eval(`document.documentElement.style.setProperty('--c4', '#5E3A6B')`);
  await sleep(120);
  await b.shot('05e-moment-plum');
  await b.eval(`document.documentElement.style.removeProperty('--c4')`);
  await waitText('Session done');
  assert.match(await body(), /superimposed lines is complete/i);
  assert.match(await body(), /next on the path: ghosted planes/i);
  await b.shot('05c-done-counted');
  await b.eval(`document.querySelector('.did [aria-label="One less"]').click()`);
  await waitText('1 of 2 pages so far');
  await b.eval(`document.querySelector('.did [aria-label="One more"]').click()`);
  await waitText('superimposed lines is complete');
  await clickText('Done');
  await waitText('Ghosted planes');
  step('a step is one page: Page done counts it and the path moves; Done lets you fix the number');

  await b.goto(BASE + '#/journal');
  await waitText('Journal');
  assert.match(await body(), /Read it twice\./i);
  assert.ok(await b.eval(`!!document.querySelector('.tile img')`), 'the photo tile rendered');
  await b.shot('08-journal', { full: true });
  step('journal shows the session, its note and the photo');

  await b.goto(BASE + '#/howto');
  await waitText('Mac beside, iPad in front');
  assert.equal(await b.eval(`document.querySelectorAll('.panel .mock svg').length`), 4);
  assert.equal(await b.eval(`document.querySelectorAll('.panel').length`), 6);
  await b.shot('17-howto-375');
  await b.eval(`document.querySelectorAll('.panel')[4].scrollIntoView()`);
  await sleep(400);
  await b.shot('17-howto-375-session');
  await b.viewport(1376, 1032, 'mac', 1);
  await b.goto(BASE + '#/howto');
  await waitText('Mac beside, iPad in front');
  await b.shot('17-howto-1376');
  await b.eval(`document.querySelectorAll('.panel')[2].scrollIntoView()`);
  await sleep(400);
  await b.shot('17-howto-1376-paper');
  await b.viewport(375, 812, 'ipad', 2);
  step('how to: three setups drawn, the session strip');

  await b.goto(BASE + '#/settings');
  await waitText('Settings');
  await clickText('Dark');
  assert.equal(await b.eval(`document.documentElement.dataset.theme`), 'dark');
  await b.shot('09-settings-dark', { full: true });
  await b.goto(BASE); await waitText('Today so far'); await b.shot('09b-today-dark');
  await b.goto(BASE + '#/settings'); await waitText('Settings');
  await clickText('Light');
  step('settings: theme');

  // Delete today's timed session so Today shows a plan with warm-ups (two exercises have been started).
  await b.goto(BASE + '#/journal');
  await waitText('Journal');
  for (let k = 0; k < 2; k++) {
    await b.eval(`(() => { const li = [...document.querySelectorAll('.lines li')].find(l => l.textContent.includes('min')); li.querySelector('button').click(); })()`);
    await clickText('Delete for good');
    await waitText('Session deleted');
    await sleep(300);
  }
  await b.goto(BASE);
  await waitText('Warm-up');
  assert.match(await body(), /Superimposed Lines|Ghosted lines/i);
  await b.shot('10-today-plan');
  await b.viewport(683, 1024, 'ipad', 2);
  await b.goto(BASE); await waitText('Warm-up'); await b.shot('11-today-683');
  await b.goto(BASE + '#/path'); await waitText('Path'); await b.shot('12-path-683');
  await b.viewport(1376, 1032, 'mac', 1);
  await b.goto(BASE); await waitText('Warm-up'); await b.shot('13-today-1376');
  await clickText('Start');
  await waitText('Step 1 of 3');
  await b.shot('14-session-1376');
  await clickText('Finish early');
  await clickText('Discard everything');
  await waitText('Warm-up');
  await b.goto(BASE + '#/path'); await waitText('Path'); await b.shot('15-path-1376');
  await b.goto(BASE + '#/journal'); await waitText('Journal'); await b.shot('16-journal-1376');
  step('plan with warm-ups at 375, 683 and 1376; session started and discarded');

  const bad = b.logs.filter(l => l.startsWith('[exception]') || l.startsWith('[console.error]') || l.includes('[log.error]')).filter(l => !l.includes('favicon'));
  assert.deepEqual(bad, [], 'no errors in the console');
  step('no console errors');
  console.log(`\nall good. screenshots in ${OUT}`);
} catch (e) {
  console.log('x', e.message);
  console.log(b.logs.slice(-15).join('\n'));
  await b.shot('zz-failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await b.close();
}
