import { LazyMotion, domAnimation } from 'motion/react';
import type { Chart as ChartData } from '../../lib/schema';
import BarChart from './BarChart';
import ChartFrame from './ChartFrame';
import HeatmapChart from './HeatmapChart';
import KpiChart from './KpiChart';
import LineChart from './LineChart';
import ProgressChart from './ProgressChart';
import RingChart from './RingChart';

/** Memilih komponen berdasarkan `type` di charts/*.json. */
export default function Chart({ chart, repoUrl, play }: { chart: ChartData; repoUrl: string; play: boolean }) {
  const showLegend = chart.type !== 'heatmap';
  // LazyMotion + komponen `m` = hanya fitur animasi yang dipakai yang ikut ke bundle (NF2).
  return (
    <LazyMotion features={domAnimation} strict>
      <ChartFrame chart={chart} repoUrl={repoUrl} showLegend={showLegend}>
        {(setTip) => {
          switch (chart.type) {
            case 'bar':
            case 'grouped-bar':
              return <BarChart chart={chart} play={play} setTip={setTip} />;
            case 'line':
              return <LineChart chart={chart} play={play} filled={false} setTip={setTip} />;
            case 'area':
              return <LineChart chart={chart} play={play} filled setTip={setTip} />;
            case 'ring':
              return <RingChart chart={chart} play={play} />;
            case 'progress':
              return <ProgressChart chart={chart} play={play} />;
            case 'kpi':
              return <KpiChart chart={chart} play={play} />;
            case 'heatmap':
              return <HeatmapChart chart={chart} play={play} setTip={setTip} />;
          }
        }}
      </ChartFrame>
    </LazyMotion>
  );
}
