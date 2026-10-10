import { scaleBand, scaleLinear } from 'd3-scale';
import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { stagger, useMotionPreset } from '../../lib/motion';
import type { TooltipState } from './ChartFrame';
import { SERIES_COLOR, categories, fmt, niceMax, valuesOf } from './util';

const W = 640;
const H = 280;
const M = { top: 12, right: 8, bottom: 28, left: 44 };

/** Bar & grouped-bar: tumbuh dari baseline, ujung data membulat 4px (dataviz spec). */
export default function BarChart({
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
  const series = chart.series.map((s, i) => ({ ...s, values: valuesOf(chart, i) }));
  const max = chart.y?.max ?? niceMax(Math.max(...series.flatMap((s) => s.values)));
  const unit = chart.y?.unit;

  const x0 = scaleBand<string>()
    .domain(cats)
    .range([M.left, W - M.right])
    .paddingInner(0.28)
    .paddingOuter(0.1);
  const x1 = scaleBand<number>()
    .domain(series.map((_, i) => i))
    .range([0, x0.bandwidth()])
    .paddingInner(0.08);
  const bw = Math.min(24, x1.bandwidth());
  const y = scaleLinear()
    .domain([0, max])
    .range([H - M.bottom, M.top]);
  const ticks = y.ticks(4);
  const labelEvery = Math.ceil(cats.length / 6);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`${chart.title}: bar chart, ${cats.length} categories`}
      className="block overflow-visible"
    >
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={M.left} x2={W - M.right} y1={y(tk)} y2={y(tk)} stroke="var(--grid)" strokeWidth={1} />
          <text
            x={M.left - 8}
            y={y(tk)}
            dy="0.32em"
            textAnchor="end"
            fontSize={12}
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
          >
            {fmt(tk)}
          </text>
        </g>
      ))}
      {cats.map((c, ci) => {
        const gx = x0(c)!;
        return (
          <g key={c + ci}>
            {series.map((s, si) => {
              const v = s.values[ci] ?? 0;
              const h = Math.max(0, y(0) - y(v));
              const bx = gx + x1(si)! + (x1.bandwidth() - bw) / 2;
              const r = Math.min(4, h / 2, bw / 2);
              const d = `M${bx},${y(0)} V${y(v) + r} Q${bx},${y(v)} ${bx + r},${y(v)} H${bx + bw - r} Q${bx + bw},${y(v)} ${bx + bw},${y(v) + r} V${y(0)} Z`;
              return (
                <m.path
                  key={s.name}
                  d={d}
                  fill={SERIES_COLOR[s.color]}
                  style={{ originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: play ? 1 : 0 }}
                  transition={t('grow', ci * stagger.bar)}
                />
              );
            })}
            {/* Hit target lebih besar dari bar (interaction spec) */}
            <rect
              x={gx}
              y={M.top}
              width={x0.bandwidth()}
              height={H - M.top - M.bottom}
              fill="transparent"
              tabIndex={0}
              aria-label={`${c}: ${series.map((s) => `${s.name} ${fmt(s.values[ci] ?? 0, unit)}`).join(', ')}`}
              onPointerEnter={() => show(ci)}
              onFocus={() => show(ci)}
              onBlur={() => setTip(null)}
              className="outline-none"
            />
            {ci % labelEvery === 0 && (
              <text
                x={gx + x0.bandwidth() / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={12}
                fill="var(--muted)"
                fontFamily="var(--font-mono)"
              >
                {c}
              </text>
            )}
          </g>
        );
      })}
      <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
    </svg>
  );

  function show(ci: number) {
    const top = Math.max(...series.map((s) => s.values[ci] ?? 0));
    setTip({
      x: `${((x0(cats[ci]!)! + x0.bandwidth() / 2) / W) * 100}%`,
      y: `${(y(top) / H) * 100}%`,
      title: cats[ci]!,
      rows: series.map((s) => ({ name: s.name, value: fmt(s.values[ci] ?? 0, unit), color: SERIES_COLOR[s.color] })),
    });
  }
}
