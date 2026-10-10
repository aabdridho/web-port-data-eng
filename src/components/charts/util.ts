import type { Chart, ColorToken } from '../../lib/schema';

/**
 * Warna data. Palet soft (pilihan desain) punya kontras antar-hue yang rendah,
 * jadi chart multi-seri SELALU memakai legenda + label langsung (bukan warna saja),
 * dan urutan default accent → neutral memberi beda terang yang jelas.
 */
export const SERIES_COLOR: Record<ColorToken, string> = {
  accent: 'var(--accent)',
  teal: 'var(--teal)',
  sage: 'var(--sage)',
  neutral: 'var(--chart-neutral)',
};

export const fmt = (v: number, unit?: string) => {
  const abs = Math.abs(v);
  const s =
    abs >= 1_000_000
      ? `${+(v / 1_000_000).toFixed(1)}M`
      : abs >= 10_000
        ? `${+(v / 1_000).toFixed(1)}K`
        : Number.isInteger(v)
          ? v.toLocaleString('en-US')
          : v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return unit ? (unit === '%' ? `${s}%` : `${s} ${unit}`) : s;
};

export const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

/** Kategori sumbu-x diambil dari seri pertama (urutan sesuai file). */
export function categories(chart: Chart): string[] {
  const xf = chart.x?.field;
  const first = chart.series[0]!.data;
  return first.map((d, i) => String(xf ? d[xf] : (d.label ?? i)));
}

export function valuesOf(chart: Chart, seriesIndex: number): number[] {
  const yf = chart.y?.field ?? 'value';
  return chart.series[seriesIndex]!.data.map((d) => num(d[yf]));
}

/** Nilai atas sumbu yang "bersih" (1, 2, 2.5, 5 × 10^n). */
export function niceMax(max: number) {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}
