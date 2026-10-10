import { useState, type ReactNode } from 'react';
import type { Chart } from '../../lib/schema';
import { SERIES_COLOR, categories, fmt, valuesOf } from './util';

export interface TooltipState {
  /** Posisi CSS relatif ke area plot, mis. "42%" — persentase agar tetap tepat saat SVG di-resize. */
  x: string;
  y: string;
  title: string;
  rows: { name: string; value: string; color: string }[];
}

interface Props {
  chart: Chart;
  repoUrl: string;
  children: (setTip: (t: TooltipState | null) => void) => ReactNode;
  showLegend?: boolean;
}

/**
 * Bungkus semua chart: judul, legenda (≥2 seri), sumber data, tooltip, dan
 * tabel data tersembunyi untuk screen reader (Requirement F3.4, NF3).
 */
export default function ChartFrame({ chart, repoUrl, children, showLegend = true }: Props) {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const multi = chart.series.length > 1;
  const src = chart.source.table ?? chart.source.path;

  return (
    <figure className="m-0 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <div className="text-[22px] font-semibold leading-tight">{chart.title}</div>
          {chart.subtitle && <div className="text-sm text-muted">{chart.subtitle}</div>}
        </figcaption>
        {showLegend && multi && (
          <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-[13px] text-fg-2" aria-label="Legend">
            {chart.series.map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: SERIES_COLOR[s.color] }}
                />
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative" onPointerLeave={() => setTip(null)}>
        {children(setTip)}
        {tip && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 min-w-[120px] rounded-xl border border-line-strong bg-bg/95 px-3 py-2 text-[13px] shadow-lg"
            style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 10px))' }}
          >
            <div className="font-mono text-[11px] text-muted">{tip.title}</div>
            {tip.rows.map((r) => (
              <div key={r.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-fg-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: r.color }}
                  />
                  {r.name}
                </span>
                <strong className="font-semibold text-fg">{r.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <DataTable chart={chart} />

      <div className="font-mono text-xs text-muted">
        Source: <span className="text-fg-2">{src}</span> ·{' '}
        <a href={repoUrl} className="no-underline" rel="noopener noreferrer" target="_blank">
          repo
        </a>
      </div>
    </figure>
  );
}

function DataTable({ chart }: { chart: Chart }) {
  const cats = categories(chart);
  const unit = chart.y?.unit;
  return (
    <table className="sr-only">
      <caption>{chart.title} — data table</caption>
      <thead>
        <tr>
          <th scope="col">{chart.x?.label ?? 'Category'}</th>
          {chart.series.map((s) => (
            <th key={s.name} scope="col">
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cats.map((c, i) => (
          <tr key={c + i}>
            <th scope="row">{c}</th>
            {chart.series.map((s, si) => (
              <td key={s.name}>{fmt(valuesOf(chart, si)[i] ?? 0, unit)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
