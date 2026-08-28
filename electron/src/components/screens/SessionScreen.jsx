import DesignStage, { DImg, DHit } from '../shared/DesignStage';
import { asset } from '../shared/designArtboard';
import DesignBlockDock from '../shared/DesignBlockDock';
import './SessionScreen.css';

/*
 * Zen Session screen — rebuilt 1:1 from the Figma export in
 * UI References/ZenTap DeskTop UI Shapes, laid out on the 2135 x 1281 artboard
 * measured from UI References/Session_Select.png.
 */
const MODES = [
  {
    id: 'free',
    card: { src: 'card_free', x: 135, y: 157, w: 967, h: 372 },
    pad: { src: 'icon_pad_free', x: 34, y: 31, w: 139, h: 132 },
    icon: { src: 'icon_lock', x: 46, y: 40, w: 114, h: 113 },
    label: { src: 'label_free', x: 213, y: 79, w: 253, h: 37 },
    desc: { src: 'desc_free', x: 49, y: 218, w: 807, h: 87 },
    name: 'Free Mode',
  },
  {
    id: 'zen',
    card: { src: 'card_zen', x: 135, y: 616, w: 967, h: 372 },
    pad: { src: 'icon_pad_zen', x: 34, y: 54, w: 139, h: 132 },
    icon: { src: 'icon_timer', x: 14, y: 30, w: 180, h: 180 },
    label: { src: 'label_zen', x: 209, y: 102, w: 240, h: 37 },
    desc: { src: 'desc_zen', x: 48, y: 229, w: 770, h: 87 },
    name: 'Zen Mode',
  },
];

const APPS_DOCK = {
  title: 'Apps to Block:',
  titlePos: { x: 1213, y: 178 },
  countBox: { x: 1790, y: 164, w: 72, h: 74 },
  countDy: 3,
  plusBox: { x: 1883, y: 157, w: 89, h: 89 },
  frame: { src: 'dock_apps', x: 1183, y: 283, w: 807, h: 246 },
  cols: [1253, 1399, 1545, 1691, 1837],
  rows: [311, 423],
  slots: ['slot_a01', 'slot_a02', 'slot_a03', 'slot_a04', 'slot_a05',
          'slot_a06', 'slot_a07', 'slot_a08', 'slot_a09', 'slot_a10'],
  label: 'Apps to Block',
};

const WEBSITES_DOCK = {
  title: 'Websites to Block:',
  titlePos: { x: 1225, y: 605 },
  countBox: { x: 1788, y: 589, w: 74, h: 76 },
  plusBox: { x: 1887, y: 586, w: 85, h: 82 },
  frame: { src: 'dock_websites', x: 1183, y: 736, w: 807, h: 246 },
  cols: [1253, 1399, 1545, 1691, 1837],
  rows: [761, 873],
  slots: ['slot_b01', 'slot_b02', 'slot_b03', 'slot_b04', 'slot_b05',
          'slot_b06', 'slot_b07', 'slot_b08', 'slot_b09', 'slot_b10'],
  label: 'Websites to Block',
};

export default function SessionScreen({
  selectedApps,
  selectedWebsites,
  onOpenDock,
  isBlocking,
  onStartZen,
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
        <button
          key={mode.id}
          type="button"
          className="ds-mode-card"
          style={{ left: mode.card.x, top: mode.card.y, width: mode.card.w, height: mode.card.h }}
          onClick={onStartZen}
          aria-label={isBlocking ? `Stop session (${mode.name})` : `Start ${mode.name}`}
        >
          <img className="ds-mode-bg" src={asset(mode.card.src)} alt="" draggable={false} />
          <img className="ds-mode-el" src={asset(mode.pad.src)} alt="" draggable={false}
               style={{ left: mode.pad.x, top: mode.pad.y, width: mode.pad.w, height: mode.pad.h }} />
          <img className="ds-mode-el" src={asset(mode.icon.src)} alt="" draggable={false}
               style={{ left: mode.icon.x, top: mode.icon.y, width: mode.icon.w, height: mode.icon.h }} />
          <img className="ds-mode-el" src={asset(mode.label.src)} alt="" draggable={false}
               style={{ left: mode.label.x, top: mode.label.y, width: mode.label.w, height: mode.label.h }} />
          <img className="ds-mode-el" src={asset(mode.desc.src)} alt="" draggable={false}
               style={{ left: mode.desc.x, top: mode.desc.y, width: mode.desc.w, height: mode.desc.h }} />
        </button>
      ))}

      <DesignBlockDock {...APPS_DOCK} items={selectedApps} count={selectedApps.length} onOpen={onOpenDock} />
      <DesignBlockDock {...WEBSITES_DOCK} items={selectedWebsites} count={selectedWebsites.length} onOpen={onOpenDock} />
    </DesignStage>
  );
}
