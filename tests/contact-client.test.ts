import { describe, expect, it } from 'vitest';
import { validateContact } from '../src/lib/contact-client';
import { contactSchema } from '../src/lib/schema';

const base = {
  name: 'Budi',
  email: 'budi@example.com',
  company: '',
  service: 'ETL / ELT pipeline',
  budget: 'Not sure yet',
  timeline: 'ASAP',
  message: 'We need a daily pipeline into BigQuery please.',
};

// Validasi browser harus sejalan dengan skema server.
const cases: Record<string, string>[] = [
  base,
  { ...base, name: 'B' },
  { ...base, name: 'x'.repeat(81) },
  { ...base, name: 'Budi\nX' },
  { ...base, email: 'nope' },
  { ...base, company: 'c'.repeat(101) },
  { ...base, service: 'hack' },
  { ...base, message: 'short' },
  { ...base, message: 'm'.repeat(3001) },
];

describe('validateContact (client) sejalan dengan contactSchema (server)', () => {
  it.each(cases.map((c, i) => [i, c] as const))('kasus %i', (_i, input) => {
    const client = Object.keys(validateContact(input)).sort();
    const r = contactSchema.safeParse(input);
    const server = r.success ? [] : [...new Set(r.error.issues.map((x) => String(x.path[0])))].sort();
    expect(client).toEqual(server);
  });
});
