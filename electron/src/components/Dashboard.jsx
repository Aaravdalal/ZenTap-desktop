import { useState, useEffect, useRef } from 'react';
import SettingsMenu from './SettingsMenu';
import ManageAppsPopup from './ManageAppsPopup';
import InsertKeyPopup from './InsertKeyPopup';
import BlockedNotification from './BlockedNotification';
import './Dashboard.css';

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedApps, setSelectedApps] = useState([]);
  const [selectedWebsites, setSelectedWebsites] = useState([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [screenTime, setScreenTime] = useState(0);

  const isInitialMount = useRef(true);

  // Load from IPC on mount
  useEffect(() => {
    window.electron?.loadConfig?.().then(config => {
      if (config.selectedApps) setSelectedApps(config.selectedApps);
      if (config.selectedWebsites) setSelectedWebsites(config.selectedWebsites);
    });
  }, []);

  // Save to IPC on change
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    window.electron?.saveConfig?.({ selectedApps, selectedWebsites });
  }, [selectedApps, selectedWebsites]);
  const [showInsertKey, setShowInsertKey] = useState(false);
  const zenBtnRef = useRef(null);
  
  const [isUsbInserted, setIsUsbInserted] = useState(false);
  const showInsertKeyRef = useRef(showInsertKey);
  
  useEffect(() => {
    showInsertKeyRef.current = showInsertKey;
    if (showInsertKey) {
        setIsUsbInserted(false);
        // Check if a removable USB flash drive is already plugged in
        window.electron?.checkUsbPresent?.().then(isPresent => {
            if (isPresent) {
                console.log("Zen key already present.");
                setIsUsbInserted(true);
            }
        });
        // Also listen for NEW insertions while popup is open
        window.electron?.startUsbMonitoring?.();
    } else {
        window.electron?.stopUsbMonitoring?.();
    }
  }, [showInsertKey]);

  useEffect(() => {
    // Initial fetch
    window.electron?.getScreenTime().then(setScreenTime);
    
    // Listen for heartbeat updates
    window.electron?.onUsageUpdated((minutes) => {
      setScreenTime(minutes);
    });

    // Listen for real physical USB insertions
    window.electron?.onUsbInserted?.(() => {
       console.log("USB insertion detected from backend!");
       if (showInsertKeyRef.current) {
           setIsUsbInserted(true);
       }
    });
  }, []);

  const formatTime = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };
  const handleKeyInserted = () => {
    setShowInsertKey(false);
    
    // Trigger ripple from center of screen since popup is centered
    window.dispatchEvent(new CustomEvent('ripple-trigger', { detail: { x: 0.5, y: 0.5 } }));
    
    // Fullscreen Ripple Overlay removed per user request

    window.electron?.startBlocking({ apps: selectedApps, web: selectedWebsites });
    setIsBlocking(true);
  };

  const toggleZen = () => {
    console.log("Toggle Zen clicked, blocking state:", isBlocking);

    if (!isBlocking) {
      if (selectedApps.length === 0 && selectedWebsites.length === 0) {
        window.electron?.showError('ZenTap', 'Select apps or add website keywords first.');
        return;
      }
      
      // Show the Insert Key popup
      setShowInsertKey(true);
    } else {
      window.electron?.stopBlocking();
      setIsBlocking(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h2 className="title">ZenTap for Desktop</h2>
        <div className="header-controls" style={{ display: 'flex', gap: '12px', WebkitAppRegion: 'no-drag', alignItems: 'center' }}>
          <div className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            <img src="/settings_square.png" className="settings-bg" alt="box" />
            <img src="/settings_gear.png" className="settings-gear" alt="gear" />
          </div>
          {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
          
          <div className="window-controls" style={{ display: 'flex', marginLeft: '10px', marginRight: '-20px' }}>
            <div className="win-btn minimize" onClick={() => window.electron?.minimizeApp?.()}>
              <svg viewBox="0 0 10 1" width="10" height="1"><path d="M0,0h10v1H0z" fill="currentColor"/></svg>
            </div>
            <div className="win-btn maximize" onClick={() => window.electron?.maximizeApp?.()}>
              <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0,0v10h10V0H0z M1,1h8v8H1V1z" fill="currentColor"/></svg>
            </div>
            <div className="win-btn close" onClick={() => window.electron?.closeApp?.()}>
              <svg viewBox="0 0 10 10" width="10" height="10"><path d="M10,1L9,0L5,4L1,0L0,1l4,4L0,9l1,1l4-4l4,4l1-1L6,5L10,1z" fill="currentColor"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="card-section">
        {/* Placeholder for global 3D model layer */}
        <div className="model-hole"></div>
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
        <div className="dock-container">
          <div className="dock-label-container" style={{display: 'flex', justifyContent: 'center', marginBottom: '10px'}}>
             <span style={{fontWeight: 'bold', fontSize: '14px', color: '#333'}}>Ready To Block:</span>
          </div>
          <div className="block-dock" onClick={() => setShowPopup(true)}>
          {[...Array(8)].map((_, i) => {
             // fill with apps, then webs, then empty
             let item = i < selectedApps.length ? selectedApps[i] 
                      : i < selectedApps.length + selectedWebsites.length ? selectedWebsites[i - selectedApps.length] 
                      : null;
                      
             return (
               <div key={i} className="dock-slot">
                 {item ? (
                    <img 
                      src={item.icon || "/missing_icon.png"} 
                      alt={item.name || item.keyword} 
                      onError={(e) => e.target.src = '/missing_icon.png'}
                    />
                 ) : null}
               </div>
             )
          })}
        </div>
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
      {showInsertKey && (
        <InsertKeyPopup 
          onClose={() => setShowInsertKey(false)} 
          onInsert={handleKeyInserted}
          isSuccess={isUsbInserted}
        />
      )}
      <BlockedNotification />
    </div>
  );
}
