import { useState, useEffect, useRef, Suspense } from 'react';
import RippleCanvas from './RippleCanvas';
import InteractiveCard from './InteractiveCard';
import { ArtboardLayer } from './shared/DesignStage';
import HomeScreen from './screens/HomeScreen';
import SessionScreen from './screens/SessionScreen';
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
  const [selectedApps, setSelectedApps] = useState([]);
  const [selectedWebsites, setSelectedWebsites] = useState([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [screenTime, setScreenTime] = useState(0);

  const isInitialMount = useRef(true);

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

  useEffect(() => {
    window.electron?.getScreenTime().then(setScreenTime);
    window.electron?.onUsageUpdated((minutes) => setScreenTime(minutes));
    window.electron?.onUsbInserted?.(() => {
      if (showInsertKeyRef.current) setIsUsbInserted(true);
    });
  }, []);

  const handleKeyInserted = () => {
    setShowInsertKey(false);
    window.dispatchEvent(new CustomEvent('ripple-trigger', { detail: { x: 0.5, y: 0.5 } }));
    window.electron?.startBlocking({ apps: selectedApps, web: selectedWebsites });
    setIsBlocking(true);
  };

  const startZenFlow = () => {
    if (!isBlocking) {
      if (selectedApps.length === 0 && selectedWebsites.length === 0) {
        window.electron?.showError('ZenTap', 'Select apps or add website keywords first.');
        return;
      }
      setIsUsbInserted(false);
      setShowInsertKey(true);
    } else {
      window.electron?.stopBlocking();
      setIsBlocking(false);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setDetailedStatsItem(null);
  };

  const dockProps = { selectedApps, selectedWebsites, onOpenDock: () => setShowPopup(true) };

  return (
    <>
      <RippleCanvas />
      {/* The device sits in the artboard slot where Homescreen.png shows it. */}
      <ArtboardLayer
        className={`global-model-container ${activeTab === 'home' ? 'visible' : 'hidden'}`}
        x={118} y={380} w={940} h={420}
      >
        <Suspense fallback={null}>
          <InteractiveCard scale={2.338} />
        </Suspense>
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
      {activeTab === 'session' && (
        <SessionScreen
          {...dockProps}
          isBlocking={isBlocking}
          onStartZen={startZenFlow}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
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
            selectedApps={selectedApps}
            selectedWebsites={selectedWebsites}
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
          onEmergencyUnblock={() => { window.electron?.stopBlocking(); setIsBlocking(false); }}
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
    </>
  );
}
