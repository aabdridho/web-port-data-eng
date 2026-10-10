import { useEffect, useRef } from 'react';
import { useMotionPreset } from '../../lib/motion';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Angka yang menghitung naik. Menulis lewat textContent (bukan innerHTML).
 * Render awal = nilai akhir, jadi tanpa JS / reduced-motion angkanya tetap benar.
 */
export default function CountUp({
  to,
  play,
  format,
  svg = false,
  duration = 1200,
}: {
  to: number;
  play: boolean;
  format: (v: number) => string;
  svg?: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement & SVGTSpanElement>(null);
  const fmtRef = useRef(format);
  fmtRef.current = format;
  const { reduce } = useMotionPreset();

  // `format` sengaja tidak masuk deps: re-render (mis. tooltip) tidak boleh mengulang hitungan.
  useEffect(() => {
    const el = ref.current;
    if (!el || !play || reduce) return;
    const decimals = Number.isInteger(to) ? 0 : 1;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = fmtRef.current(Number((to * easeOut(p)).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, play, reduce, duration]);

  return svg ? <tspan ref={ref}>{format(to)}</tspan> : <span ref={ref}>{format(to)}</span>;
}
