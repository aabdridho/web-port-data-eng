import { z } from 'zod';
import { formOptions, limits } from '../data/form.config';

/* ------------------------------------------------------------------ *
 * Kontrak data repo project (code.md §4). Semua .strict(): field asing
 * ditolak, karena isi repo diperlakukan sebagai data tidak tepercaya.
 * ------------------------------------------------------------------ */

export const COLOR_TOKENS = ['accent', 'teal', 'sage', 'neutral'] as const;
export const CHART_TYPES = ['bar', 'grouped-bar', 'line', 'area', 'ring', 'progress', 'heatmap', 'kpi'] as const;

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !/[<>]/.test(s), 'Tidak boleh mengandung < atau >');

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug harus kebab-case')
  .max(60);

export const metaSchema = z
  .object({
    slug: slugSchema,
    name: safeText(80),
    kind: safeText(24),
    year: z.number().int().min(2000).max(2100),
    stack: z.array(safeText(30)).min(1).max(8),
    summary: safeText(200),
    order: z.number().int().min(0).max(999).default(100),
    featured: z.boolean().default(true),
  })
  .strict();

const pointSchema = z.record(z.string().max(40), z.union([z.string().max(60), z.number()]));

export const seriesSchema = z
  .object({
    name: safeText(40),
    color: z.enum(COLOR_TOKENS).default('accent'),
    data: z.array(pointSchema).min(1).max(500),
  })
  .strict();

export const chartSchema = z
  .object({
    id: slugSchema,
    type: z.enum(CHART_TYPES),
    title: safeText(80),
    subtitle: safeText(140).optional(),
    source: z
      .object({ table: safeText(80).optional(), path: safeText(160).optional() })
      .strict()
      .refine((s) => s.table || s.path, 'source.table atau source.path wajib diisi'),
    x: z
      .object({ field: z.string().max(40), label: safeText(40).optional() })
      .strict()
      .optional(),
    y: z
      .object({
        field: z.string().max(40),
        label: safeText(40).optional(),
        unit: safeText(12).optional(),
        max: z.number().finite().optional(),
      })
      .strict()
      .optional(),
    series: z.array(seriesSchema).min(1).max(6),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict()
  .refine((c) => c.series.reduce((n, s) => n + s.data.length, 0) <= 500, 'Maksimal 500 titik data per chart');

export type ProjectMeta = z.infer<typeof metaSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export interface Project extends ProjectMeta {
  repo: string;
  repoUrl: string;
  charts: Chart[];
  readmeHtml: string;
  updatedAt: string;
}

export interface ContributionWeek {
  days: number[]; // level 0..4
}

export interface SiteData {
  lastSyncedAt: string;
  source: 'github' | 'cache' | 'sample';
  projects: Project[];
  contributions: ContributionWeek[];
}

/* ------------------------------------------------------------------ *
 * Form kontak (security.md §3). Dipakai client & server.
 * ------------------------------------------------------------------ */
const noNewline = (s: string) => !/[\r\n]/.test(s);

export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(limits.name.min, 'Name is too short')
      .max(limits.name.max, 'Name is too long')
      .refine((s) => noNewline(s) && !/[<>]/.test(s), 'Name contains invalid characters'),
    email: z.email('Enter a valid email').max(limits.email.max),
    company: z
      .string()
      .trim()
      .max(limits.company.max, 'Company is too long')
      .refine(noNewline, 'Company contains invalid characters')
      .optional()
      .default(''),
    service: z.enum(formOptions.service, 'Choose a service'),
    budget: z.enum(formOptions.budget, 'Choose a budget'),
    timeline: z.enum(formOptions.timeline, 'Choose a timeline'),
    message: z
      .string()
      .trim()
      .min(limits.message.min, `Tell me a bit more (min. ${limits.message.min} characters)`)
      .max(limits.message.max, 'Message is too long'),
    website: z.string().max(0).optional().default(''), // honeypot
    turnstileToken: z.string().max(4096).optional().default(''),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
