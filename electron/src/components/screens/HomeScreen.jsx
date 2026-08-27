import { Trophy, Clock, Flame } from 'lucide-react';
import PageShell from '../shared/PageShell';
import BlockDock from '../shared/BlockDock';
import './HomeScreen.css';

function formatTime(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function HomeScreen({ selectedApps, selectedWebsites, onOpenDock, screenTime, isBlocking, onStartZen }) {
  return (
    <PageShell title="Home">
      <div className="home-screen">
        <div className="home-left">
          <div className="home-model-spacer" />
          <button className={`home-zen-btn ${isBlocking ? 'blocking' : ''}`} onClick={onStartZen}>
            {isBlocking ? 'Stop Session' : 'Zen Device'}
          </button>
        </div>

        <div className="home-stats">
          <div className="home-stat-card">
            <span className="home-stat-icon"><Trophy size={20} /></span>
            <div className="home-stat-info">
              <span className="home-stat-label">Sessions</span>
              <span className="home-stat-val">0</span>
            </div>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-icon"><Clock size={20} /></span>
            <div className="home-stat-info">
              <span className="home-stat-label">Time</span>
              <span className="home-stat-val">{formatTime(screenTime)}</span>
            </div>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-icon"><Flame size={20} /></span>
            <div className="home-stat-info">
              <span className="home-stat-label">Streak</span>
              <span className="home-stat-val">1</span>
            </div>
          </div>
        </div>

        <div className="home-docks">
          <BlockDock label="Apps to Block:" items={selectedApps} onOpen={onOpenDock} />
          <BlockDock label="Websites to Block:" items={selectedWebsites} onOpen={onOpenDock} />
        </div>
      </div>
    </PageShell>
  );
}
