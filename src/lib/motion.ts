import { useReducedMotion, type Transition } from 'motion/react';

/** Preset animasi (code.md §6). Satu tempat untuk mengatur rasa gerak seluruh chart. */
export const EASE_OUT: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export const preset = {
  grow: { duration: 1.1, ease: EASE_OUT },
  draw: { duration: 1.8, ease: 'easeOut' },
  fade: { duration: 0.6, ease: 'easeOut' },
  pop: { duration: 0.45, ease: EASE_OUT },
  count: { duration: 1.2, ease: EASE_OUT },
} satisfies Record<string, Transition>;

export const stagger = { bar: 0.06, progress: 0.15, cell: 0.02 } as const;

/**
 * Mengembalikan fungsi pembuat transition yang otomatis "mati" (durasi 0)
 * jika pengguna memilih prefers-reduced-motion.
 */
export function useMotionPreset() {
  const reduce = useReducedMotion() ?? false;
  return {
    reduce,
    t: (name: keyof typeof preset, delay = 0): Transition => (reduce ? { duration: 0 } : { ...preset[name], delay }),
  };
}
