// Static dev server, no dependencies.   npm run dev  ->  http://localhost:8080

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://x').pathname;
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  if (clean.split(sep).some(p => p.startsWith('.')) || clean.startsWith('scripts') || clean.startsWith('test')) {
    res.writeHead(404); res.end('Not found'); return;
  }
  let file = join(ROOT, clean);
  if (!file.startsWith(ROOT)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(PORT, HOST, () => console.log(`Kata  http://${HOST}:${PORT}/   (demo data: /?demo)`));
