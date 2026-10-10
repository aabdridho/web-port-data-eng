import { useRef } from 'react';
import { useInView } from 'motion/react';
import type { Chart as ChartData } from '../../lib/schema';
import Chart from '../charts/Chart';

/** Semua chart project di halaman case study; masing-masing beranimasi saat masuk viewport. */
export default function ProjectCharts({ charts, repoUrl }: { charts: ChartData[]; repoUrl: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {charts.map((c) => (
        <InViewChart key={c.id} chart={c} repoUrl={repoUrl} />
      ))}
    </div>
  );
}

function InViewChart({ chart, repoUrl }: { chart: ChartData; repoUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref} className="card p-6 sm:p-7">
      <Chart chart={chart} repoUrl={repoUrl} play={inView} />
    </div>
  );
}
