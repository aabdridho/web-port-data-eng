import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { stagger, useMotionPreset } from '../../lib/motion';
import { SERIES_COLOR, categories, fmt, valuesOf } from './util';

/** Progress: bar horizontal tumbuh dari kiri, berurutan. Nilai tertulis di tiap baris. */
export default function ProgressChart({ chart, play }: { chart: Chart; play: boolean }) {
  const { t } = useMotionPreset();
  const cats = categories(chart);
  const vals = valuesOf(chart, 0);
  const max = chart.y?.max ?? Math.max(...vals);
  const unit = chart.y?.unit;
  const color = SERIES_COLOR[chart.series[0]!.color];

  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label={chart.title}>
      {cats.map((c, i) => {
        const v = vals[i] ?? 0;
        return (
          <li key={c + i}>
            <div className="flex justify-between text-sm">
              <span className="font-mono text-fg-2">{c}</span>
              <span className="font-semibold">{fmt(v, unit)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--grid)]" aria-hidden="true">
              <m.div
                className="h-full rounded-full"
                style={{ width: `${(v / max) * 100}%`, background: color, originX: 0 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: play ? 1 : 0 }}
                transition={t('grow', 0.2 + i * stagger.progress)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
