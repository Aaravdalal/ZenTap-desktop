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

/*
 * The artboard art the main screens draw. Warmed while the welcome screen is
 * up so the first tab does not pop in piece by piece - it is ~600 KB of small
 * PNGs, and the browser caches them for the rest of the session.
 */
const PRELOAD = [
  'back_button',
  'card_free',
  'card_zen',
  'chip_plus',
  'desc_free',
  'desc_zen',
  'dock_apps',
  'dock_websites',
  'icon_lock',
  'icon_pad_free',
  'icon_pad_zen',
  'icon_timer',
  'label_free',
  'label_zen',
  'nav_disc_1',
  'nav_disc_2',
  'nav_disc_3',
  'nav_disc_4',
  'nav_disc_5',
  'nav_icon_home',
  'nav_icon_profile',
  'nav_icon_session',
  'nav_icon_settings',
  'nav_icon_statistics',
  'nav_indicator',
  'nav_label_home',
  'nav_label_profile',
  'nav_label_session',
  'nav_label_settings',
  'nav_label_statistics',
  'nav_pill_1',
  'nav_pill_2',
  'nav_pill_3',
  'nav_pill_4',
  'nav_pill_5',
  'refer_art',
  'signature',
  'slot_a01',
  'slot_a02',
  'slot_a03',
  'slot_a04',
  'slot_a05',
  'slot_a06',
  'slot_a07',
  'slot_a08',
  'slot_a09',
  'slot_a10',
  'slot_b01',
  'slot_b02',
  'slot_b03',
  'slot_b04',
  'slot_b05',
  'slot_b06',
  'slot_b07',
  'slot_b08',
  'slot_b09',
  'slot_b10',
  'socials',
  'title',
  'toggle_off',
  'toggle_on',
];

/** Other art the app reaches for, outside the artboard export. */
const PRELOAD_FILES = [
  'missing_icon.png',
  'usb_insert_graphic.png',
  'HowToUse_Image.png',
  'Focus_Image.png',
];

let warmed = false;

/** Fetch the artwork into the browser cache. Safe to call more than once. */
export function preloadArtwork() {
  if (warmed || typeof window === 'undefined') return;
  warmed = true;
  for (const src of [...PRELOAD.map(asset), ...PRELOAD_FILES]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
