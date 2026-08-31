import { useEffect, useState } from 'react';

/*
 * The ZenTap screens are exported from Figma on a 2135 x 1281 artboard.
 * Elements are placed at their exact artboard coordinates and the whole stage
 * is scaled as one unit, so the running app matches the reference render
 * pixel-for-pixel at any window size.
 */
export const DESIGN_W = 2135;
export const DESIGN_H = 1281;

/*
 * Resolve a name from the Figma export shipped in public/ui. The path is
 * relative because a packaged build is served from file://, where a leading
 * slash points at the drive root and every image comes up broken.
 */
export const asset = (name) => `ui/${name}.png`;

/*
 * Every stage fills the window, so the scale can be derived from the window
 * itself rather than measured from the element. That matters: measuring meant
 * the first frame of every screen had no scale yet and was rendered hidden,
 * which showed up as a flicker on each tab change.
 */
function computeScale() {
  if (typeof window === 'undefined') return 0;
  const { innerWidth: w, innerHeight: h } = window;
  if (!w || !h) return 0;
  return Math.min(w / DESIGN_W, h / DESIGN_H);
}

function publishScale(scale) {
  // Lets CSS outside the stage (the grey bleed) line up with the artboard.
  document.documentElement.style.setProperty('--ds-scale', String(scale));
}

if (typeof document !== 'undefined') publishScale(computeScale());

/** Scale that fits the artboard inside the window, known on the first render. */
export function useStageScale() {
  const [scale, setScale] = useState(computeScale);

  useEffect(() => {
    const update = () => {
      const next = computeScale();
      if (!next) return;
      setScale(next);
      publishScale(next);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}
