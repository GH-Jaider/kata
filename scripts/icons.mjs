// Renders the PNG icons from icons/icon.svg and icons/icon-maskable.svg with headless Chrome. No dependencies.
//   npm run icons

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const JOBS = [
  ['icon.svg', 512, 'icon-512.png'], ['icon.svg', 192, 'icon-192.png'], ['icon.svg', 180, 'apple-touch-icon.png'],
  ['icon-maskable.svg', 512, 'icon-maskable-512.png'],
];

const profile = mkdtempSync(join(tmpdir(), 'kata-icons-'));
const port = 9377;
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let targets;
for (let i = 0; i < 50 && !targets?.length; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {}
  await sleep(150);
}
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(resolve => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable');
for (const [src, size, out] of JOBS) {
  const svg = readFileSync(join(ROOT, 'icons', src), 'utf8');
  await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><body style="margin:0;background:transparent">${svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body>`) });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 }, omitBackground: true });
  writeFileSync(join(ROOT, 'icons', out), Buffer.from(r.result.data, 'base64'));
  console.log(`icons/${out}  ${size}x${size}`);
}
ws.close();
proc.kill();
await sleep(200);
rmSync(profile, { recursive: true, force: true });
