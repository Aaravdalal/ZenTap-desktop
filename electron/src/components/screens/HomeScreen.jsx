import { Trophy, Clock, Flame } from 'lucide-react';
import DesignStage, { DImg } from '../shared/DesignStage';
import DesignBlockDock from '../shared/DesignBlockDock';
import { APPS_DOCK, WEBSITES_DOCK } from '../shared/dockGeometry';
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
