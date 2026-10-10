import { describe, expect, it, vi } from 'vitest';
import { clientEmail, handleContact, ownerEmail, type ContactDeps } from '../src/lib/contact';
import type { ContactInput } from '../src/lib/schema';

const valid: ContactInput = {
  name: 'Budi',
  email: 'budi@example.com',
  company: 'Toko Budi',
  service: 'ETL / ELT pipeline',
  budget: 'Not sure yet',
  timeline: 'ASAP',
  message: 'We need daily sales data from our POS in BigQuery.',
  website: '',
  turnstileToken: 'tok',
};

function deps(over: Partial<ContactDeps> = {}): ContactDeps {
  return {
    rateLimit: vi.fn(async () => ({ ok: true })),
    verifyTurnstile: vi.fn(async () => true),
    send: vi.fn(async () => {}),
    ...over,
  };
}

describe('handleContact', () => {
  it('mengirim email untuk input valid', async () => {
    const d = deps();
    const r = await handleContact(JSON.stringify(valid), '1.1.1.1', d);
    expect(r.status).toBe(200);
    expect(d.send).toHaveBeenCalledOnce();
  });

  it('honeypot terisi → sukses palsu, tidak mengirim', async () => {
    const d = deps();
    const r = await handleContact(JSON.stringify({ ...valid, website: 'spam.com' }), 'ip', d);
    expect(r.status).toBe(200);
    expect(d.send).not.toHaveBeenCalled();
  });

  it('rate limit → 429 sebelum parsing', async () => {
    const d = deps({ rateLimit: async () => ({ ok: false }) });
    const r = await handleContact(JSON.stringify(valid), 'ip', d);
    expect(r.status).toBe(429);
    expect(d.send).not.toHaveBeenCalled();
  });

  it('body > 10 KB → 413', async () => {
    const r = await handleContact('x'.repeat(11 * 1024), 'ip', deps());
    expect(r.status).toBe(413);
  });

  it('JSON rusak → 400', async () => {
    expect((await handleContact('{not json', 'ip', deps())).status).toBe(400);
  });

  it('validasi gagal → 400 dengan error per field', async () => {
    const r = await handleContact(JSON.stringify({ ...valid, email: 'x', message: 'hi' }), 'ip', deps());
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.errors ?? {})).toEqual(expect.arrayContaining(['email', 'message']));
  });

  it('Turnstile gagal → 400, tidak mengirim', async () => {
    const d = deps({ verifyTurnstile: async () => false });
    const r = await handleContact(JSON.stringify(valid), 'ip', d);
    expect(r.status).toBe(400);
    expect(d.send).not.toHaveBeenCalled();
  });

  it('pengiriman gagal → 500 dengan pesan umum (tanpa detail)', async () => {
    const d = deps({ send: async () => Promise.reject(new Error('RESEND_API_KEY invalid re_123')) });
    const r = await handleContact(JSON.stringify(valid), 'ip', d);
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('re_123');
  });
});

describe('template email', () => {
  it('meng-escape HTML dari input', () => {
    const e = ownerEmail({ ...valid, company: '<b>x</b>', message: '<script>alert(1)</script> and more text' });
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
  });
  it('subjek tidak memuat input pengguna', () => {
    expect(ownerEmail(valid).subject).not.toContain(valid.name);
    expect(clientEmail(valid, 'Rasyid').subject).not.toContain(valid.name);
  });
});
