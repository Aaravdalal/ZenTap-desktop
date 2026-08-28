import { Trophy, Clock, Flame } from 'lucide-react';
import DesignStage, { DImg } from '../shared/DesignStage';
import DesignBlockDock from '../shared/DesignBlockDock';
import './HomeScreen.css';

/*
 * Home screen — laid out on the 2135 x 1281 artboard measured from
 * UI References/Homescreen.png. Shared chrome (page plates, bottom nav) and the
 * dock artwork come from the Figma export in public/ui.
 */
const ICON = { size: 42, strokeWidth: 1.8, color: '#000000' };

const STATS = [
  { id: 'sessions', y: 167, label: 'Sessions', icon: <Trophy {...ICON} /> },
  { id: 'time', y: 449, label: 'Time', icon: <Clock {...ICON} /> },
  { id: 'streak', y: 731, label: 'Streak', icon: <Flame {...ICON} /> },
];

const APPS_DOCK = {
  title: 'Apps to Block:',
  titlePos: { x: 1213, y: 161 },
  countBox: { x: 1759, y: 144, w: 72, h: 74 },
  plusBox: { x: 1852, y: 137, w: 88, h: 88 },
  frame: { src: 'dock_apps', x: 1193, y: 254, w: 766, h: 246 },
  cols: [1242, 1388, 1534, 1680, 1826],
  rows: [280, 392],
  slots: ['slot_a01', 'slot_a02', 'slot_a03', 'slot_a04', 'slot_a05',
          'slot_a06', 'slot_a07', 'slot_a08', 'slot_a09', 'slot_a10'],
  label: 'Apps to Block',
};

const WEBSITES_DOCK = {
  title: 'Websites to Block:',
  titlePos: { x: 1213, y: 574 },
  countBox: { x: 1762, y: 558, w: 72, h: 74 },
  plusBox: { x: 1858, y: 555, w: 84, h: 80 },
  frame: { src: 'dock_websites', x: 1193, y: 692, w: 766, h: 246 },
  cols: [1242, 1388, 1534, 1680, 1826],
  rows: [717, 829],
  slots: ['slot_b01', 'slot_b02', 'slot_b03', 'slot_b04', 'slot_b05',
          'slot_b06', 'slot_b07', 'slot_b08', 'slot_b09', 'slot_b10'],
  label: 'Websites to Block',
};

function formatTime(mins) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function HomeScreen({
  selectedApps,
  selectedWebsites,
  onOpenDock,
  screenTime,
  isBlocking,
  onStartZen,
  activeTab,
  onChangeTab,
}) {
  const values = { sessions: '0', time: formatTime(screenTime), streak: '1' };

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={28} y={64} w={79} h={79} />
      <div className="hs-title">Home</div>

      {STATS.map(({ id, y, label, icon }) => (
        <div key={id} className="hs-stat" style={{ top: y }}>
          <span className="hs-stat-pad">{icon}</span>
          <span className="hs-stat-text">
            <span className="hs-stat-label">{label}</span>
            <span className="hs-stat-value">{values[id]}</span>
          </span>
        </div>
      ))}

      <button type="button" className="hs-device-btn" onClick={onStartZen}>
        {isBlocking ? 'Stop Session' : 'Zen Device'}
      </button>

      <DesignBlockDock {...APPS_DOCK} items={selectedApps} count={selectedApps.length} onOpen={onOpenDock} />
      <DesignBlockDock {...WEBSITES_DOCK} items={selectedWebsites} count={selectedWebsites.length} onOpen={onOpenDock} />
    </DesignStage>
  );
}
