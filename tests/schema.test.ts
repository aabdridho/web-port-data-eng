import { describe, expect, it } from 'vitest';
import { chartSchema, contactSchema, metaSchema } from '../src/lib/schema';

const meta = {
  slug: 'sales-etl',
  name: 'Sales ETL',
  kind: 'BATCH ETL',
  year: 2026,
  stack: ['Airflow'],
  summary: 'Problem to solution.',
};

const chart = {
  id: 'monthly',
  type: 'bar',
  title: 'Monthly',
  source: { table: 'marts.fct' },
  x: { field: 'm' },
  y: { field: 'v' },
  series: [{ name: 'A', color: 'accent', data: [{ m: 'Jan', v: 1 }] }],
};

describe('metaSchema', () => {
  it('menerima meta valid dan mengisi default', () => {
    const r = metaSchema.parse(meta);
    expect(r.order).toBe(100);
    expect(r.featured).toBe(true);
  });
  it('menolak field yang tidak dikenal (strict)', () => {
    expect(metaSchema.safeParse({ ...meta, evil: 1 }).success).toBe(false);
  });
  it('menolak slug bukan kebab-case', () => {
    expect(metaSchema.safeParse({ ...meta, slug: '../etc' }).success).toBe(false);
  });
  it('menolak HTML di teks', () => {
    expect(metaSchema.safeParse({ ...meta, name: '<script>x</script>' }).success).toBe(false);
  });
});

describe('chartSchema', () => {
  it('menerima chart valid', () => {
    expect(chartSchema.safeParse(chart).success).toBe(true);
  });
  it('menolak warna di luar token', () => {
    const bad = { ...chart, series: [{ ...chart.series[0], color: '#ff0000' }] };
    expect(chartSchema.safeParse(bad).success).toBe(false);
  });
  it('menolak tipe chart tidak dikenal', () => {
    expect(chartSchema.safeParse({ ...chart, type: 'pie3d' }).success).toBe(false);
  });
  it('wajib punya source.table atau source.path', () => {
    expect(chartSchema.safeParse({ ...chart, source: {} }).success).toBe(false);
  });
  it('menolak lebih dari 500 titik data', () => {
    const data = Array.from({ length: 501 }, (_, i) => ({ m: String(i), v: i }));
    expect(chartSchema.safeParse({ ...chart, series: [{ name: 'A', data }] }).success).toBe(false);
  });
});

describe('contactSchema', () => {
  const ok = {
    name: 'Budi',
    email: 'budi@example.com',
    service: 'ETL / ELT pipeline',
    budget: 'Not sure yet',
    timeline: 'ASAP',
    message: 'I need a pipeline from our POS system to BigQuery.',
  };
  it('menerima input valid', () => {
    expect(contactSchema.safeParse(ok).success).toBe(true);
  });
  it('menolak newline di nama (header injection)', () => {
    expect(contactSchema.safeParse({ ...ok, name: 'Budi\r\nBcc: x@y.z' }).success).toBe(false);
  });
  it('menolak email tidak valid', () => {
    expect(contactSchema.safeParse({ ...ok, email: 'nope' }).success).toBe(false);
  });
  it('menolak pilihan di luar enum', () => {
    expect(contactSchema.safeParse({ ...ok, budget: '1 juta' }).success).toBe(false);
  });
  it('menolak pesan terlalu pendek / panjang', () => {
    expect(contactSchema.safeParse({ ...ok, message: 'hi' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...ok, message: 'x'.repeat(3001) }).success).toBe(false);
  });
});
