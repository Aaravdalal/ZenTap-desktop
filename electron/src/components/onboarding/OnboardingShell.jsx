import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { DImg, DHit, CARD_BOTTOM, BAND_TOP, CARD_OVERHANG } from '../shared/DesignStage';
import { asset, useStageScale } from '../shared/designArtboard';
import WindowControls from '../shared/WindowControls';
import '../shared/DesignNav.css';
import './OnboardingShell.css';

/*
 * Chrome shared by the onboarding steps, on the same 2135 x 1281 artboard as
 * the main screens. The bottom band carries a progress track instead of the
 * tab bar; measured from the *_Onboarding.png references.
 */
const TRACK = { x: 162, y: 1185, w: 1811, h: 35 };
const MARKER = { y: 1141, w: 64, h: 52 };

/*
 * How far along the marker was left. Each step renders its own shell, so this
 * component is remounted on every step - without remembering the previous
 * position the marker would appear at its destination instead of travelling.
 */
let parkedProgress = null;

/*
 * Where the card's bottom edge and the band were left. The welcome step's
 * card stops much higher than the rest, so the next step starts its card
 * there and slides it down rather than snapping.
 */
const DEFAULT_HERO_BOTTOM = 845;
let parkedChrome = null;

export default function OnboardingShell({
  title,
  onBack,
  progress,
  hero = false,
  heroBottom = DEFAULT_HERO_BOTTOM,
  showClose = true,
  children,
}) {
  const scale = useStageScale();
  const markerFor = (p) => TRACK.x + TRACK.w * (p ?? 0) - MARKER.w / 2;

  // Start where the previous step left the marker, then move on the next frame
  // so there is something for the transition to animate from.
  const [shown, setShown] = useState(() => parkedProgress ?? progress ?? 0);
  const [moving, setMoving] = useState(false);

  const cardBottom = hero ? heroBottom : CARD_BOTTOM;
  const bandTop = hero ? heroBottom - 2 : BAND_TOP;
  const [drawnCard, setDrawnCard] = useState(() => parkedChrome?.card ?? cardBottom);
  const [drawnBand, setDrawnBand] = useState(() => parkedChrome?.band ?? bandTop);

  useEffect(() => {
    parkedChrome = { card: cardBottom, band: bandTop };
    if (drawnCard === cardBottom && drawnBand === bandTop) return undefined;
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setDrawnCard(cardBottom);
        setDrawnBand(bandTop);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [cardBottom, bandTop, drawnCard, drawnBand]);

  useEffect(() => {
    if (progress == null) return undefined;
    const arrived = parkedProgress === progress && shown === progress;
    parkedProgress = progress;
    if (arrived) return undefined;
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setShown(progress);
        setMoving(true);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [progress, shown]);

  return (
    <div
      className={`ob-root ${hero ? 'hero' : ''}`}
      style={{ '--ob-band-height': `${1281 - bandTop}px` }}
    >
      <div
        className="ds-stage"
        style={{ transform: `translate(-50%, 0) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {/* Both slide when the step changes, so the card's rounded bottom
            edge travels down out of the welcome screen. */}
        <div
          className="ds-band ob-sliding"
          style={{ top: BAND_TOP, transform: `translateY(${drawnBand - BAND_TOP}px)` }}
        />
        <div
          className="ds-card ob-sliding"
          style={{ height: CARD_BOTTOM + CARD_OVERHANG, transform: `translateY(${drawnCard - CARD_BOTTOM}px)` }}
        />

        {children}

        {/* Leaves onboarding entirely; the app closes to the tray. */}
        {showClose && (
        <button
          type="button"
          className="ob-close"
          style={{ left: 28, top: 64, width: 68, height: 68 }}
          onClick={() => window.electron?.closeApp?.()}
          aria-label="Close ZenTap"
        >
          <X size={38} strokeWidth={3} />
        </button>
        )}

        {onBack && (
          <>
            <DImg src="back_button" x={128} y={64} w={79} h={79} />
            <DHit className="ds-back-hit" x={128} y={64} w={79} h={79} onClick={onBack} aria-label="Back" />
          </>
        )}
        {title && <div className="ds-title" style={{ left: 228, top: 78 }}>{title}</div>}


        {progress != null && (
          <>
            <div className="ob-track" style={{ left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h }}>
              <div className="ob-track-fill" style={{ transform: `scaleX(${shown})` }} />
            </div>
            <div
              className="ds-nav-indicator"
              style={{
                left: markerFor(0),
                top: MARKER.y,
                width: MARKER.w,
                height: MARKER.h,
                transform: `translateX(${markerFor(shown) - markerFor(0)}px)`,
              }}
            >
              <img
                key={moving ? progress : 'parked'}
                className={moving ? 'settling' : ''}
                src={asset('nav_indicator')}
                alt=""
                draggable={false}
              />
            </div>
          </>
        )}
      </div>

      <WindowControls tone="light" />
    </div>
  );
}
