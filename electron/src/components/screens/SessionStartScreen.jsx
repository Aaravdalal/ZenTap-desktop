import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import DesignBlockDock from '../shared/DesignBlockDock';
import { APPS_DOCK, WEBSITES_DOCK } from '../shared/dockGeometry';
import ModeCard from './ModeCard';
import DurationPicker from './DurationPicker';
import { MODES } from './sessionModes';
import './SessionStartScreen.css';

/*
 * The last step before a session runs — laid out on the 2135 x 1281 artboard
 * measured from UI References/Session_Start.png. Same frame as the Zen Session
 * screen with the tab bar replaced by "Start Session", so there is no way out
 * of the flow except back or start.
 */
const START = { x: 326, y: 1142, w: 1483, h: 111 };

export default function SessionStartScreen({
  mode,
  selectedApps,
  selectedWebsites,
  onOpenDock,
  seconds,
  onChangeSeconds,
  onStart,
  onBack,
}) {
  return (
    <DesignStage hideNav>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />

      <DImg src="title" x={176} y={71} w={295} h={39} />

      {MODES.map((m) => (
        <ModeCard key={m.id} mode={m} state={m.id === mode ? 'selected' : 'muted'}>
          {m.id === 'zen' && m.id === mode && (
            /* Zen Mode locks the machine until the timer runs out, so the
               length has to be chosen before the session starts. */
            <DurationPicker seconds={seconds} onChange={onChangeSeconds} />
          )}
        </ModeCard>
      ))}

      <DesignBlockDock {...APPS_DOCK} items={selectedApps} count={selectedApps.length} onOpen={onOpenDock} />
      <DesignBlockDock {...WEBSITES_DOCK} items={selectedWebsites} count={selectedWebsites.length} onOpen={onOpenDock} />

      <button
        type="button"
        className="ss-start"
        style={{ left: START.x, top: START.y, width: START.w, height: START.h }}
        onClick={onStart}
      >
        Start Session
      </button>
    </DesignStage>
  );
}
