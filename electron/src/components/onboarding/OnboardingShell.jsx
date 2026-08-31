import { DImg, DHit } from '../shared/DesignStage';
import { useStageScale } from '../shared/designArtboard';
import './OnboardingShell.css';

/*
 * Chrome shared by the onboarding steps, on the same 2135 x 1281 artboard as
 * the main screens. The bottom band carries a progress track instead of the
 * tab bar; measured from the *_Onboarding.png references.
 */
const TRACK = { x: 162, y: 1185, w: 1811, h: 35 };
const MARKER = { y: 1141, w: 64, h: 52 };

export default function OnboardingShell({ title, onBack, progress, hero = false, children }) {
  const scale = useStageScale();
  const markerX = TRACK.x + TRACK.w * (progress ?? 0) - MARKER.w / 2;

  return (
    <div className={`ob-root ${hero ? 'hero' : ''}`}>
      <div
        className="ds-stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        <DImg src="plate_white" x={4} y={0} w={2127} h={1281} />
        {/* The welcome step's hero ends higher, so the band starts under it. */}
        <DImg src="plate_gray" x={4} y={hero ? 845 : 1003} w={2127} h={hero ? 436 : 278} />
        {!hero && <DImg src="plate_white_bottom" x={0} y={908} w={2135} h={205} />}

        {onBack && (
          <>
            <DImg src="back_button" x={28} y={64} w={79} h={79} />
            <DHit className="ds-back-hit" x={28} y={64} w={79} h={79} onClick={onBack} aria-label="Back" />
          </>
        )}
        {title && <div className="ds-title" style={{ left: 124, top: 78 }}>{title}</div>}

        {children}

        {progress != null && (
          <>
            <div className="ob-track" style={{ left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h }}>
              <div className="ob-track-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <DImg src="nav_indicator" x={markerX} y={MARKER.y} w={MARKER.w} h={MARKER.h} />
          </>
        )}
      </div>
    </div>
  );
}
