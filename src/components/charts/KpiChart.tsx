import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { useMotionPreset } from '../../lib/motion';
import CountUp from './CountUp';
import { categories, fmt, valuesOf } from './util';

/** KPI: deretan stat tile, angka menghitung naik. Angka pertama = hero. */
export default function KpiChart({ chart, play }: { chart: Chart; play: boolean }) {
  const { t } = useMotionPreset();
  const labels = categories(chart);
  const vals = valuesOf(chart, 0);
  const points = chart.series[0]!.data;
  // Unit per tile: field `unit` di titik data, atau y.unit sebagai default.
  const unitOf = (i: number) => {
    const u = points[i]?.unit;
    return typeof u === 'string' ? u : chart.y?.unit;
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {labels.map((l, i) => (
        <m.div
          key={l + i}
          className="rounded-[14px] border border-line p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: play ? 1 : 0, y: play ? 0 : 12 }}
          transition={t('fade', i * 0.12)}
        >
          <div className="text-sm text-muted">{l}</div>
          <div
            className={
              i === 0 ? 'mt-2 text-4xl font-semibold leading-none' : 'mt-2 text-3xl font-semibold leading-none'
            }
          >
            <CountUp to={vals[i] ?? 0} play={play} format={(v) => fmt(v, unitOf(i) === '%' ? '%' : undefined)} />
            {unitOf(i) && unitOf(i) !== '%' && (
              <span className="mt-1.5 block text-sm font-medium text-muted">{unitOf(i)}</span>
            )}
          </div>
        </m.div>
      ))}
    </div>
  );
}
