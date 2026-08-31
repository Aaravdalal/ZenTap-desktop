import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import DesignBlockDock from '../shared/DesignBlockDock';
import { APPS_DOCK, WEBSITES_DOCK } from '../shared/dockGeometry';
import ModeCard from './ModeCard';
import { MODES } from './sessionModes';
import './SessionScreen.css';

/*
 * Zen Session screen — rebuilt 1:1 from the Figma export in
 * UI References/ZenTap DeskTop UI Shapes, laid out on the 2135 x 1281 artboard
 * measured from UI References/Session_Select.png.
 *
 * Picking a mode hands off to the session start screen; nothing is blocked yet.
 */
export default function SessionScreen({
  selectedApps,
  selectedWebsites,
  onOpenDock,
  onSelectMode,
  activeTab,
  onChangeTab,
  onBack,
}) {
  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <DHit className="ds-back-hit" x={55} y={49} w={79} h={79} onClick={onBack} aria-label="Back" />

      <DImg src="title" x={176} y={71} w={295} h={39} />

      {MODES.map((mode) => (
        <ModeCard
          key={mode.id}
          mode={mode}
          onClick={() => onSelectMode?.(mode.id)}
          ariaLabel={`Choose ${mode.name}`}
        />
      ))}

      <DesignBlockDock {...APPS_DOCK} items={selectedApps} count={selectedApps.length} onOpen={onOpenDock} />
      <DesignBlockDock {...WEBSITES_DOCK} items={selectedWebsites} count={selectedWebsites.length} onOpen={onOpenDock} />
    </DesignStage>
  );
}
