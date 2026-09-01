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
  sessions = 0,
  streak = 0,
  sessionRemaining = null,
  isBlocking,
  onStartZen,
  activeTab,
  onChangeTab,
}) {
  // `screenTime` is time at the computer, from the foreground probe - not time
  // spent in ZenTap itself.
  const values = {
    sessions: String(sessions),
    time: formatTime(screenTime),
    streak: String(streak),
  };

  return (
    <DesignStage activeTab={activeTab} onChangeTab={onChangeTab}>
      <DImg src="back_button" x={55} y={49} w={79} h={79} />
      <div className="hs-title">Home</div>

      {STATS.map(({ id, y, label, icon }) => (
        <div key={id} className="hs-stat" style={{ top: y }}>
          <span className="hs-stat-pad">{icon}</span>
          <span className="hs-stat-text">
            <span className="hs-stat-label">{label}</span>
            <span className={`hs-stat-value ${values[id].length > 6 ? 'xlong' : values[id].length > 4 ? 'long' : ''}`}>
              {values[id]}
            </span>
          </span>
        </div>
      ))}

      {sessionRemaining != null && (
        /* Sits above the device, where the Home screen is otherwise empty. */
        <div className="hs-countdown" style={{ left: 47, top: 286, width: 700 }}>
          <span className="hs-countdown-label">Zen session ends in</span>
          <span className="hs-countdown-value">{sessionRemaining}</span>
        </div>
      )}

      <button type="button" className="hs-device-btn" onClick={onStartZen}>
        {isBlocking ? 'Stop Session' : 'Zen Device'}
      </button>

      <DesignBlockDock {...APPS_DOCK} items={selectedApps} count={selectedApps.length} onOpen={onOpenDock} />
      <DesignBlockDock {...WEBSITES_DOCK} items={selectedWebsites} count={selectedWebsites.length} onOpen={onOpenDock} />
    </DesignStage>
  );
}
