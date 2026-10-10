import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { useMotionPreset } from '../../lib/motion';
import CountUp from './CountUp';
import { SERIES_COLOR, fmt, valuesOf } from './util';

/** Ring: busur terisi dari 0 ke nilai, angka di tengah menghitung naik. */
export default function RingChart({ chart, play }: { chart: Chart; play: boolean }) {
  const { t } = useMotionPreset();
  const value = valuesOf(chart, 0)[0] ?? 0;
  const max = chart.y?.max ?? 100;
  const unit = chart.y?.unit;
  const frac = Math.max(0, Math.min(1, value / max));
  const s = chart.series[0]!;
  const label = String(s.data[0]?.label ?? s.name);

  return (
    <div className="flex flex-wrap items-center gap-8">
      <svg
        viewBox="0 0 120 120"
        width={190}
        height={190}
        role="img"
        aria-label={`${chart.title}: ${fmt(value, unit)} of ${fmt(max, unit)}`}
      >
        <circle cx={60} cy={60} r={48} fill="none" stroke="var(--grid)" strokeWidth={12} />
        <m.circle
          cx={60}
          cy={60}
          r={48}
          fill="none"
          stroke={SERIES_COLOR[s.color]}
          strokeWidth={12}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: play ? frac : 0 }}
          transition={t('draw')}
        />
        <text x={60} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--fg)">
          <CountUp to={value} play={play} format={(v) => fmt(v, unit)} svg />
        </text>
        <text
          x={60}
          y={77}
          textAnchor="middle"
          fontSize={8.5}
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
          letterSpacing="0.06em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
