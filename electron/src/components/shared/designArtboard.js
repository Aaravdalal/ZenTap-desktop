import { useEffect, useState } from 'react';

/*
 * The ZenTap screens are exported from Figma on a 2135 x 1281 artboard.
 * Elements are placed at their exact artboard coordinates and the whole stage
 * is scaled as one unit, so the running app matches the reference render
 * pixel-for-pixel at any window size.
 */
export const DESIGN_W = 2135;
export const DESIGN_H = 1281;

/** Resolve a name from the Figma export shipped in public/ui. */
export const asset = (name) => `/ui/${name}.png`;

/** Scale that fits the artboard inside the element `ref` points at. */
export function useStageScale(ref) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const next = Math.min(width / DESIGN_W, height / DESIGN_H);
      setScale(next);
      // Lets the window frame round itself to the same radius as the design.
      document.documentElement.style.setProperty('--ds-scale', String(next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return scale;
}
