import { useState, useEffect, useRef } from 'react';
import InteractiveCard from './InteractiveCard';
import SettingsMenu from './SettingsMenu';
import ManageAppsPopup from './ManageAppsPopup';
import BlockedNotification from './BlockedNotification';
import './Dashboard.css';

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedApps, setSelectedApps] = useState([]);
  const [selectedWebsites, setSelectedWebsites] = useState([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [screenTime, setScreenTime] = useState(0);
  const zenBtnRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    window.electron?.getScreenTime().then(setScreenTime);
    
    // Listen for heartbeat updates
    window.electron?.onUsageUpdated((minutes) => {
      setScreenTime(minutes);
    });
  }, []);

  const formatTime = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };
  const toggleZen = () => {
    console.log("Toggle Zen clicked, blocking state:", isBlocking);
    if (!isBlocking) {
      if (selectedApps.length === 0 && selectedWebsites.length === 0) {
        window.electron?.showError('ZenTap', 'Select apps or add website keywords first.');
        return;
      }
      
      // Trigger Fullscreen Ripple Overlay via Electron
      if (zenBtnRef.current && window.electron?.triggerFullscreenRipple) {
        const rect = zenBtnRef.current.getBoundingClientRect();
        // Convert client coords to absolute screen coords
        const screenX = window.screenX + rect.left + rect.width / 2;
        const screenY = window.screenY + rect.top + rect.height / 2;
        window.electron.triggerFullscreenRipple({ screenX, screenY });
      }

      window.electron?.startBlocking({ apps: selectedApps, web: selectedWebsites });
      setIsBlocking(true);
    } else {
      window.electron?.stopBlocking();
      setIsBlocking(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h2 className="title">ZenTap for Desktop</h2>
        <div className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <img src="/settings_square.png" className="settings-bg" alt="box" />
          <img src="/settings_gear.png" className="settings-gear" alt="gear" />
        </div>
        {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
      </div>

      <div className="card-section">
        <InteractiveCard />
      </div>

      <div className="zen-section">
        <button 
          ref={zenBtnRef}
          className={`zen-btn ${isBlocking ? 'blocking' : ''} ${(!selectedApps.length && !selectedWebsites.length) ? 'disabled' : ''}`} 
          onClick={toggleZen}
          disabled={!selectedApps.length && !selectedWebsites.length && !isBlocking}
        >
          <span className="zen-text">Zen Device</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="icon">🕒</span>
          <div className="stat-info">
            <span className="val">{formatTime(screenTime)}</span>
            <span className="label">Time</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon">🔥</span>
          <div className="stat-info">
            <span className="val">4</span>
            <span className="label">Streak</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon">🏆</span>
          <div className="stat-info">
            <span className="val">0</span>
            <span className="label">Sessions</span>
          </div>
        </div>
      </div>

      <div className="block-dock-section">
        <p className="dock-label">Ready To Block:</p>
        <div className="block-dock" onClick={() => setShowPopup(true)}>
          {[...Array(8)].map((_, i) => {
             // fill with apps, then webs, then empty
             let item = i < selectedApps.length ? selectedApps[i] 
                      : i < selectedApps.length + selectedWebsites.length ? selectedWebsites[i - selectedApps.length] 
                      : null;
                      
             return (
               <div key={i} className="dock-slot">
                 {item && item.icon ? (
                    <img src={item.icon} alt={item.name || item.keyword} />
                 ) : item ? (
                    <span className="fallback-text">
                       {(item.name || item.keyword || '?').charAt(0).toUpperCase()}
                    </span>
                 ) : null}
               </div>
             )
          })}
        </div>
      </div>

      {showPopup && (
        <ManageAppsPopup 
           onClose={() => setShowPopup(false)}
           selectedApps={selectedApps}
           setSelectedApps={setSelectedApps}
           selectedWebsites={selectedWebsites}
           setSelectedWebsites={setSelectedWebsites}
        />
      )}
      <BlockedNotification />
    </div>
  );
}
