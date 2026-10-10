/**
 * security.md §2 — gagal jika ada pola token di file yang dikirim ke browser.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('dist/client');
const PATTERNS: [string, RegExp][] = [
  ['GitHub classic token', /ghp_[A-Za-z0-9]{20,}/],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{20,}/],
  ['Resend key', /\bre_[A-Za-z0-9]{16,}/],
  ['Upstash token', /UPSTASH_REDIS_REST_TOKEN\s*[:=]\s*["'][^"']+/],
  ['Turnstile secret', /0x4AAAAAAA[A-Za-z0-9_-]{10,}(?=.*secret)/i],
];

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(js|mjs|html|css|json|txt|xml)$/.test(e.name)) yield p;
  }
}

let found = 0;
for await (const file of walk(ROOT)) {
  const text = await readFile(file, 'utf8');
  for (const [name, re] of PATTERNS) {
    if (re.test(text)) {
      console.error(`✖ ${name} ditemukan di ${path.relative(process.cwd(), file)}`);
      found++;
    }
  }
}
if (found) process.exit(1);
console.log('✓ Tidak ada rahasia di bundle client');
