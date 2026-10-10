import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { stagger, useMotionPreset } from '../../lib/motion';
import type { TooltipState } from './ChartFrame';
import { categories, fmt, valuesOf } from './util';

const STEPS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

/** Heatmap: baris = seri, kolom = kategori. Warna sekuensial satu hue (gelap → terang). */
export default function HeatmapChart({
  chart,
  play,
  setTip,
}: {
  chart: Chart;
  play: boolean;
  setTip: (t: TooltipState | null) => void;
}) {
  const { t } = useMotionPreset();
  const cats = categories(chart);
  const rows = chart.series.map((s, i) => ({ name: s.name, values: valuesOf(chart, i) }));
  const all = rows.flatMap((r) => r.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const unit = chart.y?.unit;
  const step = (v: number) => (max === min ? 2 : Math.min(4, Math.floor(((v - min) / (max - min)) * 4.999)));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `minmax(64px,auto) repeat(${cats.length}, minmax(14px,1fr))` }}
      >
        {rows.map((r, ri) => (
          <div key={r.name} className="contents">
            <div className="truncate pr-2 font-mono text-[11px] text-muted">{r.name}</div>
            {r.values.map((v, ci) => (
              <m.button
                type="button"
                key={ci}
                aria-label={`${r.name}, ${cats[ci]}: ${fmt(v, unit)}`}
                className="aspect-square rounded-[3px] border-0 p-0"
                style={{ background: STEPS[step(v)] }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: play ? 1 : 0, scale: play ? 1 : 0 }}
                transition={t('pop', (ri * cats.length + ci) * stagger.cell)}
                onPointerEnter={(e) => tip(e.currentTarget, r.name, ci, v)}
                onFocus={(e) => tip(e.currentTarget, r.name, ci, v)}
                onBlur={() => setTip(null)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  function tip(el: HTMLElement, name: string, ci: number, v: number) {
    const host = el.closest('.relative') as HTMLElement | null;
    if (!host) return;
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    setTip({
      x: `${a.left - b.left + a.width / 2}px`,
      y: `${a.top - b.top}px`,
      title: cats[ci]!,
      rows: [{ name, value: fmt(v, unit), color: STEPS[step(v)]! }],
    });
  }
}
