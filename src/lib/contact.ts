import { contactSchema, type ContactInput } from './schema';

/**
 * Logika endpoint /api/contact (code.md §7, security.md §3), dipisah dari
 * route agar mudah dites: semua efek samping masuk lewat `deps`.
 */
export interface ContactDeps {
  rateLimit: (key: string) => Promise<{ ok: boolean }>;
  verifyTurnstile: (token: string, ip: string) => Promise<boolean>;
  send: (input: ContactInput) => Promise<void>;
  log?: (msg: string) => void;
}

export interface ContactResult {
  status: number;
  body: { ok: boolean; message?: string; errors?: Record<string, string> };
}

export const MAX_BODY_BYTES = 10 * 1024;

export async function handleContact(rawBody: string, ip: string, deps: ContactDeps): Promise<ContactResult> {
  const log = deps.log ?? (() => {});

  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return { status: 413, body: { ok: false, message: 'Request too large.' } };
  }

  const limit = await deps.rateLimit(ip);
  if (!limit.ok) {
    return { status: 429, body: { ok: false, message: 'Too many requests. Please try again in a few minutes.' } };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false, message: 'Invalid request.' } };
  }

  // Honeypot terisi → pura-pura sukses, tidak kirim apa pun.
  if (
    json &&
    typeof json === 'object' &&
    typeof (json as { website?: unknown }).website === 'string' &&
    (json as { website: string }).website.length > 0
  ) {
    log('honeypot triggered');
    return { status: 200, body: { ok: true } };
  }

  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      errors[key] ??= issue.message;
    }
    return { status: 400, body: { ok: false, message: 'Please check the highlighted fields.', errors } };
  }

  const human = await deps.verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!human) {
    return { status: 400, body: { ok: false, message: 'Verification failed. Please refresh and try again.' } };
  }

  try {
    await deps.send(parsed.data);
  } catch (e) {
    log(`send failed: ${(e as Error).message}`); // detail hanya di log server
    return { status: 500, body: { ok: false, message: 'Could not send right now. Please email me directly.' } };
  }

  return { status: 200, body: { ok: true } };
}

/* ---------------------------- Template email ---------------------------- */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function ownerEmail(i: ContactInput) {
  const rows: [string, string][] = [
    ['Name', i.name],
    ['Email', i.email],
    ['Company', i.company || '—'],
    ['Service', i.service],
    ['Budget', i.budget],
    ['Timeline', i.timeline],
  ];
  return {
    // Subjek dari template tetap; input user tidak pernah membentuk header.
    subject: 'New project inquiry from portfolio site',
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${i.message}`,
    html: `<table>${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><p style="white-space:pre-wrap">${esc(i.message)}</p>`,
  };
}

export function clientEmail(i: ContactInput, ownerName: string) {
  return {
    subject: 'Thanks for reaching out',
    text: `Hi ${i.name},\n\nThanks for your message about "${i.service}". I'll get back to you within 1–2 business days.\n\n— ${ownerName}`,
  };
}
