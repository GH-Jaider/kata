// End-to-end walk through Kata in headless Chrome (fresh profile, so a fresh database). Needs `npm run dev`.
import { launch } from './cdp.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

setTimeout(() => { console.log('x timed out'); process.exit(2); }, 120_000).unref();
const BASE = process.env.KATA_URL || 'http://127.0.0.1:8080/';
const OUT = process.env.KATA_SHOTS || join(tmpdir(), 'kata-shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The app icon doubles as a test photo, so the photo path gets exercised without extra files.
const photo = fileURLToPath(new URL('../../icons/icon-192.png', import.meta.url));

const b = await launch({ outDir: OUT, width: 390, height: 844, device: 'iphone' });
const step = (name, ok = true) => console.log(`${ok ? 'ok' : 'x '} ${name}`);
try {
  // 1. Fresh start: Today shows Lesson 0 as homework and explains why there are no warm-ups.
  await b.goto(BASE);
  await b.waitFor('[data-screen="today"]');
  assert.equal(await b.text('.title'), 'Today');
  assert.deepEqual(await b.texts('.plan .row .label'), ['Read Lesson 0', 'Free drawing']);
  assert.match(await b.text('.callout'), /No warm-ups yet/);
  assert.equal(await b.text('.stats .stat .v'), '0');
  await b.shot('01-today-fresh');
  step('fresh Today');

  // 2. Curriculum: tick Lesson 0 as read; it becomes complete and Lesson 1 opens up.
  await b.goto(BASE + '#curriculum');
  await b.waitFor('[data-unit="l0"].open');
  await b.click('[data-exercise="l0-read"] [data-action="inc"]');
  await b.waitText('[data-exercise="l0-read"] .n', '1 / 1 read');
  assert.equal(await b.text('[data-unit="l0"] .badge'), 'Complete');
  assert.equal(await b.text('[data-unit="l1"] .badge'), 'Up next');
  assert.equal(await b.text('[data-unit="l2"] .badge'), 'Later');
  await b.shot('02-curriculum', { full: true });
  await b.goto(BASE + '#today');
  await b.waitText('[data-screen="today"]', 'Done today');
  assert.equal(await b.text('.stats .stat .v'), '1', 'a curriculum tick counts for the streak');
  step('curriculum +1');

  // 3. Today now plans Superimposed Lines. Start a session on paper, count two pages, finish.
  await b.goto(BASE + '#today');
  await b.waitText('.plan .row .label', 'Superimposed Lines');
  await b.click('[data-action="start"]');
  await b.waitFor('[data-medium="paper"]');
  await b.click('[data-medium="paper"]');
  await b.waitFor('[data-screen="session"] .runner');
  assert.equal(await b.text('.runner .kind'), 'Homework');
  assert.equal(await b.text('.runner .name'), 'Superimposed Lines');
  assert.equal(await b.text('.runner .clock'), '30:00');
  await b.click('[data-action="more"]');
  await b.click('[data-action="more"]');
  assert.equal(await b.text('.runner .count-box .n'), '2');
  await b.setFile('.runner input[type=file]', photo);
  await b.waitFor('.runner .thumbs img');
  await b.shot('03-session');
  await b.click('[data-action="pause"]');
  assert.match(await b.text('[data-action="pause"]'), /Resume/);
  await b.click('[data-action="pause"]');
  await b.click('[data-action="next"]');
  await b.waitText('.runner .kind', 'Free drawing');
  await b.click('[data-action="finish"]');
  await b.waitFor('[data-screen="today"]');
  await b.waitText('[data-screen="today"]', 'Done today');
  assert.match(await b.eval(`document.body.textContent`), /Superimposed Lines/);
  assert.equal(await b.text('.stats .stat .v'), '1', 'streak is one');
  await b.shot('04-today-after');
  step('session start, count, photo, pause, finish');

  // 4. Persistence: reload and check the count survived, then the Log shows the session with its photo.
  await b.goto(BASE + '#curriculum');
  await b.waitText('[data-exercise="l1-superimposed"] .n', '2 / 2 pages');
  assert.ok(await b.eval(`document.querySelector('[data-exercise="l1-superimposed"]').classList.contains('done')`));
  await b.goto(BASE + '#log');
  await b.waitFor('[data-session]');
  assert.equal(await b.eval(`document.querySelectorAll('[data-session]').length`), 2, 'the tick and the timed session');
  await b.waitFor('.photo-grid img');
  const timed = await b.eval(`document.querySelector('.photo-grid').closest('[data-session]').textContent`);
  assert.match(timed, /Superimposed Lines/);
  assert.match(timed, /2 pages · Paper/);
  await b.shot('05-log', { full: true });
  step('persisted, log shows the session and photo');

  // 5. Quick log without a timer: default is the next exercise (Ghosted Lines), one page, fifteen minutes.
  await b.goto(BASE + '#today');
  await b.click('[data-action="log"]');
  await b.waitFor('.sheet select');
  assert.equal(await b.eval(`document.querySelector('.sheet select').value`), 'l1-ghostedlines');
  await b.shot('06-log-sheet');
  await b.click('[data-action="save-log"]');
  await b.waitFor('.toast');
  await b.goto(BASE + '#curriculum');
  await b.waitText('[data-exercise="l1-ghostedlines"] .n', '1 / 1 page');
  step('quick log');

  // 6. Two exercises started means warm-ups are unlocked and today's plan opens with them.
  await b.goto(BASE + '#today');
  await b.waitFor('.plan');
  const labels = await b.texts('.plan .row .sub');
  assert.ok(labels.filter(t => t.startsWith('Warm-up')).length === 2, `two warm-ups, got ${JSON.stringify(labels)}`);
  assert.ok(await b.eval(`!document.body.textContent.includes('No warm-ups yet')`));
  await b.shot('07-today-warmups');
  step('warm-ups unlocked');

  // 7. Progress and settings render; no exceptions anywhere.
  await b.goto(BASE + '#progress');
  await b.waitFor('.heat');
  assert.equal(await b.eval(`document.querySelectorAll('.heat i').length`), 84);
  await b.shot('08-progress', { full: true });
  await b.goto(BASE + '#settings');
  await b.waitFor('[data-screen="settings"] select');
  await b.shot('09-settings', { full: true });

  // 8. Looks: dark mode on the phone, iPad split view width, and the Mac sidebar layout with demo data.
  await b.colorScheme('dark');
  await b.goto(BASE + '#today');
  await b.waitFor('.plan');
  await b.shot('10-today-dark');
  await b.colorScheme('light');
  await b.viewport(507, 1080, 'ipad', 2);
  await b.goto(BASE + '#today');
  await b.waitFor('.plan');
  await b.shot('11-ipad-splitview');
  await b.viewport(1280, 860, 'mac', 1);
  await b.goto(BASE + '?demo#today');
  await b.waitFor('.plan', 15000);
  await sleep(400);
  await b.shot('12-mac-demo-today');
  await b.goto(BASE + '?demo#progress');
  await b.waitFor('.heat', 15000);
  await b.shot('13-mac-demo-progress', { full: true });
  await b.goto(BASE + '?demo#log');
  await b.waitFor('[data-session]', 15000);
  await b.shot('14-mac-demo-log');
  await b.goto(BASE + '?demo#curriculum');
  await b.waitFor('.unit', 15000);
  await b.shot('15-mac-demo-curriculum', { full: true });
  step('screenshots');

  const bad = b.logs.filter(l => l.startsWith('[exception]') || l.startsWith('[console.error]') || l.includes('[log.error]'));
  assert.deepEqual(bad, [], 'no errors in the console');
  step('no console errors');
  console.log(`\nall good. screenshots in ${OUT}`);
} catch (e) {
  console.log('x', e.message);
  console.log(b.logs.slice(-20).join('\n'));
  await b.shot('zz-failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await b.close();
}
