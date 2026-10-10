import { formOptions, limits } from '../data/form.config';

/**
 * Validasi ringan di browser (tanpa Zod, supaya bundle kecil). Hanya untuk UX —
 * sumber kebenaran tetap contactSchema di server. Batas diambil dari form.config.ts
 * yang sama, jadi aturannya tidak bisa berbeda.
 */
export function validateContact(v: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {};
  const name = (v.name ?? '').trim();
  const email = (v.email ?? '').trim();
  const company = (v.company ?? '').trim();
  const message = (v.message ?? '').trim();

  if (name.length < limits.name.min) e.name = 'Name is too short';
  else if (name.length > limits.name.max) e.name = 'Name is too long';
  else if (/[<>\r\n]/.test(name)) e.name = 'Name contains invalid characters';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > limits.email.max) e.email = 'Enter a valid email';

  if (company.length > limits.company.max) e.company = 'Company is too long';

  for (const k of ['service', 'budget', 'timeline'] as const) {
    if (!(formOptions[k] as readonly string[]).includes(v[k] ?? '')) e[k] = `Choose a ${k}`;
  }

  if (message.length < limits.message.min) e.message = `Tell me a bit more (min. ${limits.message.min} characters)`;
  else if (message.length > limits.message.max) e.message = 'Message is too long';

  return e;
}
