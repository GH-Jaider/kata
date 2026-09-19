// Tiny Chrome DevTools Protocol client for driving Kata in headless Chrome. No dependencies.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const UA = {
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

export async function launch({ port = 9333, width = 390, height = 844, outDir, device = 'iphone', scale = 2 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'kata-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--lang=en-US', 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.length) break; } catch {}
    await sleep(150);
  }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let seq = 0;
  const pending = new Map();
  const waiters = [];
  const logs = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Runtime.consoleAPICalled') {
        logs.push(`[console.${msg.params.type}] ` + msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        logs.push(`[exception] ${d.exception?.description || d.text}`);
      } else if (msg.method === 'Log.entryAdded') {
        logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
      }
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].method === msg.method) { waiters[i].resolve(msg.params); waiters.splice(i, 1); }
      }
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = method => new Promise(resolve => waiters.push({ method, resolve }));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  if (outDir) mkdirSync(outDir, { recursive: true });

  const api = {
    logs, send,
    async viewport(w, h, dev = device, s = scale) {
      width = w; height = h;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile: dev !== 'mac' });
      await send('Emulation.setUserAgentOverride', { userAgent: UA[dev] || UA.mac, acceptLanguage: 'en-US,en' });
      await send('Emulation.setTouchEmulationEnabled', { enabled: dev !== 'mac', maxTouchPoints: 5 });
    },
    // Always loads from scratch, even when only the hash changes.
    async goto(url) {
      let loaded = once('Page.loadEventFired');
      const within = once('Page.navigatedWithinDocument');
      await send('Page.navigate', { url });
      const first = await Promise.race([loaded.then(() => 'load'), within.then(() => 'hash')]);
      if (first === 'hash') {
        loaded = once('Page.loadEventFired');
        await send('Page.reload', {});
        await loaded;
      }
      await sleep(350);
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(selector, timeout = 5000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        try { if (await api.eval(`!!document.querySelector(${JSON.stringify(selector)})`)) return true; } catch {}
        await sleep(80);
      }
      throw new Error(`Did not appear: ${selector}`);
    },
    async waitText(selector, text, timeout = 5000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        try { if (await api.eval(`(document.querySelector(${JSON.stringify(selector)})?.textContent || '').includes(${JSON.stringify(text)})`)) return true; } catch {}
        await sleep(80);
      }
      throw new Error(`No "${text}" in ${selector}`);
    },
    text: selector => api.eval(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`),
    texts: selector => api.eval(`[...document.querySelectorAll(${JSON.stringify(selector)})].map(e => e.textContent)`),
    async click(selector) {
      await api.waitFor(selector);
      await api.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await sleep(250);
    },
    async colorScheme(value) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
      await sleep(150);
    },
    async setFile(selector, path) {
      const { root } = await send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
      await send('DOM.setFileInputFiles', { nodeId, files: [path] });
      await sleep(600);
    },
    async shot(name, { full = false } = {}) {
      const params = { format: 'png' };
      if (full) {
        const h = await api.eval('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width, height: h, scale: 1 };
      }
      const r = await send('Page.captureScreenshot', params);
      const file = join(outDir, `${name}.png`);
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() {
      try { ws.close(); } catch {}
      proc.kill();
      await sleep(300);
      rmSync(profile, { recursive: true, force: true });
    },
  };
  await api.viewport(width, height);
  return api;
}
