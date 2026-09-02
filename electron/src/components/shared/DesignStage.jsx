import DesignNav from './DesignNav';
import { asset, useStageScale } from './designArtboard';
import './DesignStage.css';

/** An exported Figma element pinned to its artboard rect. */
export function DImg({ src, x, y, w, h, className = '', style }) {
  return (
    <img
      src={asset(src)}
      alt=""
      draggable={false}
      className={`ds-el ${className}`}
      style={{ left: x, top: y, width: w, height: h, ...style }}
    />
  );
}

/** A transparent click target pinned to an artboard rect. */
export function DHit({ x, y, w, h, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`ds-hit ${className}`}
      style={{ left: x, top: y, width: w, height: h }}
      {...rest}
    />
  );
}

/**
 * Full-window overlay that places `children` at one artboard rect, using the
 * same scaling as DesignStage. Used for live content (the 3D device) that has
 * to sit on the artboard but stay mounted while other screens are shown.
 */
export function ArtboardLayer({ x, y, w, h, className = '', style, children }) {
  const scale = useStageScale();

  /*
   * Positioned with calc() rather than by scaling a stage: a transformed
   * container reports its scaled size to react-three-fiber, which sized the
   * canvas from it and left the model too large after the window had been
   * maximised and restored. These are real pixels, so what it measures is what
   * is on screen.
   *
   * The stage is centred horizontally and pinned to the bottom of the window,
   * so 1067.5 (half the artboard) and 1281 (its height) do the conversion.
   */
  const px = (v) => `calc(${v}px * var(--ds-scale, 0.6))`;

  return (
    <div className={`ds-layer ${className}`} style={style}>
      <div
        className="ds-layer-slot"
        style={{
          left: `calc(50% + ${x - 1067.5}px * var(--ds-scale, 0.6))`,
          bottom: px(1281 - y - h),
          width: px(w),
          height: px(h),
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* Artboard geometry of the page chrome, measured from the reference renders. */
export const CARD_BOTTOM = 1105;
export const BAND_TOP = 1003;
/** How far the card starts above the artboard; see .ds-card in the stylesheet. */
export const CARD_OVERHANG = 600;

export default function DesignStage({ activeTab, onChangeTab, hideNav = false, children }) {
  const scale = useStageScale();

  return (
    <div className="ds-root">
      <div
        className="ds-stage"
        style={{ transform: `translate(-50%, 0) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {/*
          * The page chrome, drawn rather than exported: a grey band with the
          * white card over it. Measured from the references - the card's
          * bottom edge sits at 1105 with a 100-unit corner radius.
          */}
        <div className="ds-band" style={{ top: BAND_TOP }} />
        <div className="ds-card" style={{ height: CARD_BOTTOM + CARD_OVERHANG }} />
        {children}
        {!hideNav && <DesignNav activeTab={activeTab} onChange={onChangeTab} />}
      </div>
    </div>
  );
}
