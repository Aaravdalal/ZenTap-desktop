import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import RippleCanvas from './RippleCanvas';
import InteractiveCard from './InteractiveCard';
import { ArtboardLayer } from './shared/DesignStage';
import SafeBoundary from './shared/SafeBoundary';
import HomeScreen from './screens/HomeScreen';
import SessionScreen from './screens/SessionScreen';
import SessionStartScreen from './screens/SessionStartScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import DetailedStatisticsScreen from './screens/DetailedStatisticsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ManageAppsPopup from './ManageAppsPopup';
import InsertKeyPopup from './InsertKeyPopup';
import './MainApp.css';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [detailedStatsItem, setDetailedStatsItem] = useState(null);
  const [statsTab, setStatsTab] = useState('apps');

  const [showPopup, setShowPopup] = useState(false);
  const [popupTab, setPopupTab] = useState('apps');
  const [selectedApps, setSelectedApps] = useState([]);
  const [selectedWebsites, setSelectedWebsites] = useState([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [screenTime, setScreenTime] = useState(0);
  const [usage, setUsage] = useState(null);

  // Session flow: pick a mode on the Session tab, confirm it on the start
  // screen, and only then does anything get blocked.
  const [pendingMode, setPendingMode] = useState(null);
  const [zenMinutes, setZenMinutes] = useState(30);
  const [sessionEndsAt, setSessionEndsAt] = useState(null);

  const isInitialMount = useRef(true);

  // A session outlives this window: after a reload or restart the renderer has
  // to ask who is actually blocking, or it shows "Zen Device" with no way to
  // stop a session that is still running.
  useEffect(() => {
    window.electron?.getBlockingState?.().then((state) => {
      if (!state?.blocking) return;
      setIsBlocking(true);
      setSessionEndsAt(state.endsAt || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    window.electron?.loadConfig?.().then(config => {
      if (config.selectedApps) setSelectedApps(config.selectedApps);
      if (config.selectedWebsites) setSelectedWebsites(config.selectedWebsites);
    });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    window.electron?.saveConfig?.({ selectedApps, selectedWebsites });
  }, [selectedApps, selectedWebsites]);

  const [showInsertKey, setShowInsertKey] = useState(false);
  const [isUsbInserted, setIsUsbInserted] = useState(false);
  const showInsertKeyRef = useRef(showInsertKey);

  useEffect(() => {
    showInsertKeyRef.current = showInsertKey;
    if (showInsertKey) {
      window.electron?.checkUsbPresent?.().then(isPresent => {
        if (isPresent) setIsUsbInserted(true);
      });
      window.electron?.startUsbMonitoring?.();
    } else {
      window.electron?.stopUsbMonitoring?.();
    }
  }, [showInsertKey]);

  // Resolve app icons in the background at launch. They are cached in the main
  // process, so the app drawer opens with them already in place instead of
  // filling in over the next few seconds.
  useEffect(() => {
    window.electron?.startIconStream?.();
  }, []);

  useEffect(() => {
    window.electron?.getScreenTime().then(setScreenTime);
    window.electron?.onUsageUpdated((minutes) => setScreenTime(minutes));
    window.electron?.onUsbInserted?.(() => {
      if (showInsertKeyRef.current) setIsUsbInserted(true);
    });
  }, []);

  // Real per-app / per-site usage, refreshed while the statistics tab is open.
  const refreshUsage = useCallback(() => {
    window.electron?.getUsageStats?.().then(setUsage).catch(() => {});
  }, []);

  useEffect(() => {
    refreshUsage();
    if (activeTab !== 'statistics') return;
    const id = setInterval(refreshUsage, 15000);
    return () => clearInterval(id);
  }, [activeTab, refreshUsage, selectedApps, selectedWebsites]);

  const stopSession = useCallback(() => {
    window.electron?.stopBlocking();
    setIsBlocking(false);
    setSessionEndsAt(null);
  }, []);

  // A Zen Mode session runs to the end of its timer, then releases itself.
  useEffect(() => {
    if (!isBlocking || !sessionEndsAt) return;
    const id = setInterval(() => {
      if (Date.now() >= sessionEndsAt) stopSession();
    }, 1000);
    return () => clearInterval(id);
  }, [isBlocking, sessionEndsAt, stopSession]);

  const handleKeyVerified = () => {
    setShowInsertKey(false);
    window.dispatchEvent(new CustomEvent('ripple-trigger', { detail: { x: 0.5, y: 0.5 } }));
    // The key only unlocks the flow; the session itself is set up next.
    setPendingMode(null);
    setDetailedStatsItem(null);
    setActiveTab('session');
  };

  const startZenFlow = () => {
    if (!isBlocking) {
      setIsUsbInserted(false);
      setShowInsertKey(true);
      return;
    }
    if (sessionEndsAt && Date.now() < sessionEndsAt) {
      const left = Math.ceil((sessionEndsAt - Date.now()) / 60000);
      window.electron?.showError('Zen Mode', `This session is locked for another ${left} minute${left === 1 ? '' : 's'}.`);
      return;
    }
    stopSession();
  };

  const startSession = () => {
    if (selectedApps.length === 0 && selectedWebsites.length === 0) {
      window.electron?.showError('ZenTap', 'Select apps or add website keywords first.');
      return;
    }
    const endsAt = pendingMode === 'zen' ? Date.now() + zenMinutes * 60000 : null;
    window.electron?.startBlocking({ apps: selectedApps, web: selectedWebsites, endsAt });
    setIsBlocking(true);
    setSessionEndsAt(endsAt);
    setPendingMode(null);
    setActiveTab('home');
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setDetailedStatsItem(null);
  };

  const openDock = (tab = 'apps') => {
    setPopupTab(tab === 'websites' ? 'websites' : 'apps');
    setShowPopup(true);
  };

  const dockProps = { selectedApps, selectedWebsites, onOpenDock: openDock };
  const inSessionSetup = activeTab === 'session' && pendingMode;

  return (
    <>
      <RippleCanvas />
      {/* The device sits in the artboard slot where Homescreen.png shows it. */}
      <ArtboardLayer
        className={`global-model-container ${activeTab === 'home' ? 'visible' : 'hidden'}`}
        x={118} y={380} w={940} h={420}
      >
        <SafeBoundary label="Zen device model">
          <Suspense fallback={null}>
            <InteractiveCard scale={2.338} />
          </Suspense>
        </SafeBoundary>
      </ArtboardLayer>

      {/* Rebuilt 1:1 from the Figma export — these draw their own chrome and nav. */}
      {activeTab === 'home' && (
        <HomeScreen
          {...dockProps}
          screenTime={screenTime}
          isBlocking={isBlocking}
          onStartZen={startZenFlow}
          activeTab={activeTab}
          onChangeTab={changeTab}
        />
      )}
      {activeTab === 'session' && !pendingMode && (
        <SessionScreen
          {...dockProps}
          onSelectMode={setPendingMode}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}
      {inSessionSetup && (
        <SessionStartScreen
          {...dockProps}
          mode={pendingMode}
          minutes={zenMinutes}
          onChangeMinutes={setZenMinutes}
          onStart={startSession}
          onBack={() => setPendingMode(null)}
        />
      )}

      {activeTab === 'statistics' && (
        detailedStatsItem ? (
          <DetailedStatisticsScreen
            item={detailedStatsItem}
            activeTab={activeTab}
            onChangeTab={changeTab}
            onBack={() => setDetailedStatsItem(null)}
          />
        ) : (
          <StatisticsScreen
            usage={usage}
            tab={statsTab}
            onChangeListTab={setStatsTab}
            onSelectItem={setDetailedStatsItem}
            activeTab={activeTab}
            onChangeTab={changeTab}
            onBack={() => changeTab('home')}
          />
        )
      )}
      {activeTab === 'settings' && (
        <SettingsScreen
          isBlocking={isBlocking}
          onEmergencyUnblock={stopSession}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}
      {activeTab === 'profile' && (
        <ProfileScreen
          screenTime={screenTime}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}

      <div className="main-app-window-controls">
        <div className="win-btn minimize" onClick={() => window.electron?.minimizeApp?.()}>
          <svg viewBox="0 0 10 1" width="10" height="1"><path d="M0,0h10v1H0z" fill="currentColor" /></svg>
        </div>
        <div className="win-btn maximize" onClick={() => window.electron?.maximizeApp?.()}>
          <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0,0v10h10V0H0z M1,1h8v8H1V1z" fill="currentColor" /></svg>
        </div>
        <div className="win-btn close" onClick={() => window.electron?.closeApp?.()}>
          <svg viewBox="0 0 10 10" width="10" height="10"><path d="M10,1L9,0L5,4L1,0L0,1l4,4L0,9l1,1l4-4l4,4l1-1L6,5L10,1z" fill="currentColor" /></svg>
        </div>
      </div>

      {showPopup && (
        <ManageAppsPopup
          onClose={() => setShowPopup(false)}
          initialTab={popupTab}
          selectedApps={selectedApps}
          setSelectedApps={setSelectedApps}
          selectedWebsites={selectedWebsites}
          setSelectedWebsites={setSelectedWebsites}
        />
      )}
      {showInsertKey && (
        <InsertKeyPopup
          onClose={() => setShowInsertKey(false)}
          onInsert={handleKeyVerified}
          isSuccess={isUsbInserted}
        />
      )}
    </>
  );
}
