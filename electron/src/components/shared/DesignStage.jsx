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

  return (
    <div className={`ds-layer ${className}`} style={style}>
      <div
        className="ds-stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        <div className="ds-layer-slot" style={{ left: x, top: y, width: w, height: h }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DesignStage({ activeTab, onChangeTab, hideNav = false, children }) {
  const scale = useStageScale();

  return (
    <div className="ds-root">
      <div
        className="ds-stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        <DImg src="plate_white" x={4} y={0} w={2127} h={1281} />
        <DImg src="plate_gray" x={4} y={1003} w={2127} h={278} />
        <DImg src="plate_white_bottom" x={0} y={908} w={2135} h={205} />
        {children}
        {!hideNav && <DesignNav activeTab={activeTab} onChange={onChangeTab} />}
      </div>
    </div>
  );
}
