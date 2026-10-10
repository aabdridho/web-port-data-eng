import { useState } from 'react';
import { scaleLinear, scalePoint } from 'd3-scale';
import { area as d3area, curveMonotoneX, line as d3line } from 'd3-shape';
import * as m from 'motion/react-m';
import type { Chart } from '../../lib/schema';
import { useMotionPreset } from '../../lib/motion';
import type { TooltipState } from './ChartFrame';
import { SERIES_COLOR, categories, fmt, niceMax, valuesOf } from './util';

const W = 640;
const H = 280;
const M = { top: 16, right: 56, bottom: 28, left: 44 };

/** Line & area: garis "tergambar" (pathLength 0→1), area menyusul, titik akhir pop. */
export default function LineChart({
  chart,
  play,
  filled,
  setTip,
}: {
  chart: Chart;
  play: boolean;
  filled: boolean;
  setTip: (t: TooltipState | null) => void;
}) {
  const { t } = useMotionPreset();
  const [hover, setHover] = useState<number | null>(null);
  const cats = categories(chart);
  const series = chart.series.map((s, i) => ({ ...s, values: valuesOf(chart, i) }));
  const max = chart.y?.max ?? niceMax(Math.max(...series.flatMap((s) => s.values)));
  const unit = chart.y?.unit;

  const x = scalePoint<number>()
    .domain(cats.map((_, i) => i))
    .range([M.left, W - M.right]);
  const y = scaleLinear()
    .domain([0, max])
    .range([H - M.bottom, M.top]);
  const ticks = y.ticks(4);
  const labelEvery = Math.ceil(cats.length / 6);

  const lineGen = d3line<number>()
    .x((_, i) => x(i)!)
    .y((v) => y(v))
    .curve(curveMonotoneX);
  const areaGen = d3area<number>()
    .x((_, i) => x(i)!)
    .y0(y(0))
    .y1((v) => y(v))
    .curve(curveMonotoneX);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const step = (W - M.left - M.right) / Math.max(1, cats.length - 1);
    const i = Math.min(cats.length - 1, Math.max(0, Math.round((px - M.left) / step)));
    point(i);
  }
  function point(i: number) {
    setHover(i);
    const top = Math.max(...series.map((s) => s.values[i] ?? 0));
    setTip({
      x: `${(x(i)! / W) * 100}%`,
      y: `${(y(top) / H) * 100}%`,
      title: cats[i]!,
      rows: series.map((s) => ({ name: s.name, value: fmt(s.values[i] ?? 0, unit), color: SERIES_COLOR[s.color] })),
    });
  }

  const last = cats.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`${chart.title}: line chart over ${cats.length} points`}
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
      {cats.map((c, i) =>
        i % labelEvery === 0 || i === last ? (
          <text
            key={c + i}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={12}
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
          >
            {c}
          </text>
        ) : null,
      )}

      {series.map((s, si) => (
        <g key={s.name}>
          {filled && (
            <m.path
              d={areaGen(s.values) ?? ''}
              fill={SERIES_COLOR[s.color]}
              initial={{ opacity: 0 }}
              animate={{ opacity: play ? 0.1 : 0 }}
              transition={t('fade', 1.2)}
            />
          )}
          <m.path
            d={lineGen(s.values) ?? ''}
            fill="none"
            stroke={SERIES_COLOR[s.color]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: play ? 1 : 0 }}
            transition={t('draw', si * 0.2)}
          />
          {/* Titik akhir + label langsung (identitas tidak bergantung warna saja) */}
          <m.circle
            cx={x(last)}
            cy={y(s.values[last] ?? 0)}
            r={4.5}
            fill={SERIES_COLOR[s.color]}
            stroke="var(--surface)"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: play ? 1 : 0 }}
            transition={t('pop', 1.8 + si * 0.2)}
          />
          <m.text
            x={x(last)! + 10}
            y={y(s.values[last] ?? 0)}
            dy="0.32em"
            fontSize={12}
            fill="var(--fg-2)"
            initial={{ opacity: 0 }}
            animate={{ opacity: play ? 1 : 0 }}
            transition={t('fade', 1.9 + si * 0.2)}
          >
            {series.length > 1 ? s.name : fmt(s.values[last] ?? 0, unit)}
          </m.text>
        </g>
      ))}

      {hover !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={H - M.bottom} stroke="var(--line-strong)" />
          {series.map((s) => (
            <circle
              key={s.name}
              cx={x(hover)}
              cy={y(s.values[hover] ?? 0)}
              r={4}
              fill={SERIES_COLOR[s.color]}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          ))}
        </g>
      )}

      <rect
        x={M.left}
        y={M.top}
        width={W - M.left - M.right}
        height={H - M.top - M.bottom}
        fill="transparent"
        tabIndex={0}
        aria-label="Chart area. Use left and right arrow keys to read values."
        className="outline-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onFocus={() => point(hover ?? last)}
        onBlur={() => {
          setHover(null);
          setTip(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const cur = hover ?? last;
            point(Math.min(last, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1))));
          }
        }}
      />
    </svg>
  );
}
