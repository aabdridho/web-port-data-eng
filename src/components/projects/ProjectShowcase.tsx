import { useRef, useState } from 'react';
import { useInView } from 'motion/react';
import type { Project } from '../../lib/schema';
import Chart from '../charts/Chart';

/**
 * Island utama section Projects (Requirement F3.2, F3.6):
 * pilih project di kiri → panel kanan memutar animasi chart-nya.
 */
export default function ProjectShowcase({
  projects,
  allReposUrl,
  sample,
}: {
  projects: Project[];
  allReposUrl: string;
  sample: boolean;
}) {
  const [active, setActive] = useState(0);
  const [chartIdx, setChartIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(panelRef, { once: true, amount: 0.3 });

  if (projects.length === 0) {
    return (
      <div className="card p-8 text-fg-2">
        No projects published yet. Add the <code className="font-mono">portfolio</code> topic and a{' '}
        <code className="font-mono">portfolio/</code> folder to a repo.
      </div>
    );
  }

  const p = projects[Math.min(active, projects.length - 1)]!;
  const chart = p.charts[Math.min(chartIdx, p.charts.length - 1)]!;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-3" role="tablist" aria-label="Projects" aria-orientation="vertical">
        {projects.map((proj, i) => {
          const on = i === active;
          return (
            <button
              key={proj.slug}
              type="button"
              role="tab"
              id={`tab-${proj.slug}`}
              aria-selected={on}
              aria-controls="project-panel"
              onClick={() => {
                setActive(i);
                setChartIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + projects.length) % projects.length;
                  setActive(n);
                  setChartIdx(0);
                  document.getElementById(`tab-${projects[n]!.slug}`)?.focus();
                }
              }}
              tabIndex={on ? 0 : -1}
              className={`cursor-pointer rounded-2xl border px-5 py-[18px] text-left font-[inherit] text-fg transition-colors ${
                on ? 'border-accent bg-surface-2' : 'border-line bg-surface hover:border-line-strong'
              }`}
            >
              <div className="flex justify-between gap-3 font-mono text-xs text-muted">
                <span>{proj.kind}</span>
                <span>{proj.year}</span>
              </div>
              <div className="mt-2 text-[19px] font-semibold">{proj.name}</div>
              <div className="mt-1 text-sm text-fg-2">{proj.stack.join(' · ')}</div>
            </button>
          );
        })}
        <a href={allReposUrl} className="px-1 py-3.5 no-underline" rel="noopener noreferrer" target="_blank">
          View all repositories →
        </a>
      </div>

      <div
        ref={panelRef}
        id="project-panel"
        role="tabpanel"
        aria-labelledby={`tab-${p.slug}`}
        className="card flex min-h-[460px] flex-col gap-5 p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="m-0 max-w-[52ch] text-[15px] text-fg-2">{p.summary}</p>
          {sample && (
            <span className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[11px] text-muted">
              SAMPLE DATA
            </span>
          )}
        </div>

        {p.charts.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Charts in this project">
            {p.charts.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={i === chartIdx}
                onClick={() => setChartIdx(i)}
                className={`min-h-[36px] cursor-pointer rounded-full border px-3.5 text-[13px] font-[inherit] ${
                  i === chartIdx
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line-strong bg-transparent text-fg-2 hover:text-fg'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}

        {/* key memaksa remount → animasi diputar ulang setiap ganti project/chart */}
        <Chart key={`${p.slug}/${chart.id}`} chart={chart} repoUrl={p.repoUrl} play={inView} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="font-mono text-xs text-muted">{p.repo}</span>
          <a href={`/projects/${p.slug}`} className="text-sm no-underline">
            Read the case study →
          </a>
        </div>
      </div>
    </div>
  );
}
