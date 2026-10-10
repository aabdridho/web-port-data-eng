import type { APIRoute } from 'astro';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';
import { clientEmail, handleContact, ownerEmail, type ContactDeps } from '../../lib/contact';
import { site } from '../../data/site.config';

// Satu-satunya route yang berjalan di server (serverless function di Vercel).
export const prerender = false;

const env = import.meta.env;
const isProd = env.PROD;

/* ---- Rate limit: 5 req / 10 menit per IP + 50 email / hari (security.md §3) ---- */
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;
const perIp = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'contact:ip' })
  : null;
const perDay = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(50, '1 d'), prefix: 'contact:day' })
  : null;
const memory = new Map<string, number[]>(); // fallback dev saja

const rateLimit: ContactDeps['rateLimit'] = async (ip) => {
  if (perIp && perDay) {
    const [a, b] = await Promise.all([perIp.limit(ip), perDay.limit('global')]);
    return { ok: a.success && b.success };
  }
  if (isProd) throw new Error('Upstash belum dikonfigurasi');
  const now = Date.now();
  const hits = (memory.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  memory.set(ip, hits);
  return { ok: hits.length <= 5 };
};

const verifyTurnstile: ContactDeps['verifyTurnstile'] = async (token, ip) => {
  if (!env.TURNSTILE_SECRET_KEY) return !isProd; // dev tanpa Turnstile boleh lewat
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success: boolean; hostname?: string };
  const expected = env.SITE_URL ? new URL(env.SITE_URL).hostname : undefined;
  return data.success && (!expected || data.hostname === expected);
};

const send: ContactDeps['send'] = async (input) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    if (isProd) throw new Error('Resend belum dikonfigurasi');
    console.info('[contact] (dev) email tidak dikirim — env Resend kosong. Isi:', {
      ...input,
      turnstileToken: undefined,
    });
    return;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const from = `${site.fullName} <${env.CONTACT_FROM_EMAIL}>`;
  const o = ownerEmail(input);
  const c = clientEmail(input, site.fullName);
  const [r1, r2] = await Promise.all([
    resend.emails.send({
      from,
      to: env.CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject: o.subject,
      text: o.text,
      html: o.html,
    }),
    resend.emails.send({ from, to: input.email, replyTo: env.CONTACT_TO_EMAIL, subject: c.subject, text: c.text }),
  ]);
  if (r1.error) throw new Error(r1.error.message); // auto-reply gagal tidak menggagalkan request
  if (r2.error) console.warn('[contact] auto-reply gagal:', r2.error.name);
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json')) {
    return Response.json({ ok: false, message: 'Unsupported content type.' }, { status: 415 });
  }
  // Di Vercel, clientAddress berasal dari platform (tidak bisa dipalsukan lewat header klien).
  let ip = 'unknown';
  try {
    ip = clientAddress || ip;
  } catch {
    /* clientAddress tidak tersedia di beberapa runtime */
  }
  try {
    const { status, body } = await handleContact(await request.text(), ip, {
      rateLimit,
      verifyTurnstile,
      send,
      log: (m) => console.warn(`[contact] ${m}`),
    });
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[contact] error:', (e as Error).message);
    return Response.json(
      { ok: false, message: 'Could not send right now. Please email me directly.' },
      { status: 500 },
    );
  }
};
