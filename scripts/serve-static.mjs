// Server statis kecil untuk E2E (adapter Vercel tidak mendukung `astro preview`).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/client');
const port = Number(process.argv[2] ?? 4322);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  let p = path.join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  if (!p.startsWith(root)) return res.writeHead(403).end();
  try {
    if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`serving dist/client on :${port}`));
