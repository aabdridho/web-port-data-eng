/**
 * Pilihan dropdown form kontak — juga dipakai validasi server (enum).
 * File ini ikut ke bundle browser, jadi jangan taruh rahasia di sini.
 */
export const formOptions = {
  service: [
    'ETL / ELT pipeline',
    'Data warehouse setup',
    'Dashboard & reporting',
    'Real-time streaming',
    'Something else',
  ],
  budget: ['[Range 1]', '[Range 2]', '[Range 3]', 'Not sure yet'],
  timeline: ['ASAP', 'Within 1 month', '1–3 months', 'Flexible'],
} as const;

/** Batas panjang field — dipakai skema server (Zod) dan validasi ringan di browser. */
export const limits = {
  name: { min: 2, max: 80 },
  email: { max: 254 },
  company: { max: 100 },
  message: { min: 20, max: 3000 },
} as const;
