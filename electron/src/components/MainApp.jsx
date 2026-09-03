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
import ConfirmDialog from './ConfirmDialog';
import WindowControls from './shared/WindowControls';
import BrowserPickerDialog from './BrowserPickerDialog';
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
  const [profileName, setProfileName] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openBlocked, setOpenBlocked] = useState(null);
  const [showBrowsers, setShowBrowsers] = useState(false);
  const askedForExtension = useRef(false);
  // Set while the extension prompt is standing in the way of a session start.
  const resumeStart = useRef(false);
  // Where the Start Session button was when it was pressed, so the wave can
  // leave from it even if a dialog interrupts on the way.
  const rippleOrigin = useRef(null);
  const [blockNotifications, setBlockNotifications] = useState(false);
  const [screenTime, setScreenTime] = useState(0);
  const [usage, setUsage] = useState(null);

  // Session flow: pick a mode on the Session tab, confirm it on the start
  // screen, and only then does anything get blocked.
  const [pendingMode, setPendingMode] = useState(null);
  const [zenSeconds, setZenSeconds] = useState(30 * 60);
  const [sessionEndsAt, setSessionEndsAt] = useState(null);
  const [sessionRemaining, setSessionRemaining] = useState(null);
  // A session can only be set up after the ZenKey has been checked from Home.
  const [keyVerified, setKeyVerified] = useState(false);

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
      if (config.profileName) setProfileName(config.profileName);
      if (config.memberSince) setMemberSince(config.memberSince);
      if (config.avatar) setAvatar(config.avatar);
      setBlockNotifications(!!config.blockNotifications);
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

    // The block list is saved with whatever icon existed when the app was
    // picked, which for some apps was nothing at all. Once the scan finishes,
    // take the icons it found.
    window.electron?.onAppIconsComplete?.(() => {
      window.electron?.getInstalledApps?.().then((installed) => {
        const byPath = new Map((installed || []).map((a) => [a.path, a.icon]));
        setSelectedApps((prev) => {
          const next = prev.map((a) => (byPath.get(a.path) ? { ...a, icon: byPath.get(a.path) } : a));
          const changed = next.some((a, i) => a.icon !== prev[i].icon);
          if (changed) window.electron?.saveConfig?.({ selectedApps: next });
          return changed ? next : prev;
        });
      }).catch(() => {});
    });
  }, []);

  // Favicons saved before the app started asking for 256px stay small forever
  // otherwise. Measure what is stored and re-fetch only what is undersized.
  useEffect(() => {
    if (!selectedWebsites.length || !window.electron?.fetchFavicon) return;
    let cancelled = false;

    const widthOf = (src) => new Promise((resolve) => {
      if (!src) return resolve(0);
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth);
      img.onerror = () => resolve(0);
      img.src = src;
      return undefined;
    });

    (async () => {
      const upgraded = await Promise.all(selectedWebsites.map(async (site) => {
        // Try once per site, ever: the favicon service returns whatever size it
        // has, which is often under 256, and retrying every launch is waste.
        if (site.iconHiRes || await widthOf(site.icon) >= 256) return site;
        const icon = await window.electron.fetchFavicon(site.keyword).catch(() => null);
        return { ...site, iconHiRes: true, ...(icon ? { icon } : {}) };
      }));
      if (cancelled) return;
      const changed = upgraded.some((site, i) => site !== selectedWebsites[i]);
      if (changed) setSelectedWebsites(upgraded);
    })();

    return () => { cancelled = true; };
    // Runs once per list change; the guard above stops it looping on itself.
  }, [selectedWebsites]);

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

  const saveProfileName = (value) => {
    setProfileName(value);
    window.electron?.saveConfig?.({ profileName: value });
  };

  /*
   * Website blocking only works through the extension, so the first time a site
   * is added without one connected, offer to install it. Once per run - it is a
   * prompt, not a nag.
   */
  const offerExtension = async () => {
    if (askedForExtension.current) return;
    const state = await window.electron?.getBlockingState?.().catch(() => null);
    if (state?.extension?.length) return;
    askedForExtension.current = true;
    setShowBrowsers(true);
  };

  const pickAvatar = async () => {
    const picked = await window.electron?.pickAvatar?.().catch(() => null);
    if (!picked) return;
    setAvatar(picked);
    window.electron?.saveConfig?.({ avatar: picked });
  };

  const deleteProfile = async () => {
    setConfirmDelete(false);
    await window.electron?.resetProfile?.().catch(() => {});
    // Everything the renderer holds came from the files that just went away.
    window.location.reload();
  };

  const toggleBlockNotifications = (value) => {
    setBlockNotifications(value);
    // Main reads this when a session starts, and puts Windows back afterwards.
    window.electron?.saveConfig?.({ blockNotifications: value });
  };

  const stopSession = useCallback(() => {
    window.electron?.stopBlocking();
    setIsBlocking(false);
    setSessionEndsAt(null);
    setKeyVerified(false);
  }, []);

  // A Zen Mode session runs to the end of its timer, then releases itself.
  // The same tick feeds the countdown on the Home screen.
  useEffect(() => {
    if (!isBlocking || !sessionEndsAt) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.round((sessionEndsAt - Date.now()) / 1000));
      if (left <= 0) {
        stopSession();
        return;
      }
      const hh = Math.floor(left / 3600);
      const mm = Math.floor((left % 3600) / 60);
      const ss = left % 60;
      setSessionRemaining(
        hh > 0
          ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
          : `${mm}:${String(ss).padStart(2, '0')}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isBlocking, sessionEndsAt, stopSession]);

  const handleKeyVerified = () => {
    setShowInsertKey(false);
    // The key only unlocks the flow; the session itself is set up next.
    setKeyVerified(true);
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
      const remaining = Math.ceil((sessionEndsAt - Date.now()) / 1000);
      const left = remaining >= 60
        ? `${Math.ceil(remaining / 60)} minute${Math.ceil(remaining / 60) === 1 ? '' : 's'}`
        : `${remaining} second${remaining === 1 ? '' : 's'}`;
      window.electron?.showError('Zen Mode', `This session is locked for another ${left}.`);
      return;
    }
    stopSession();
  };

  const beginBlocking = () => {
    window.dispatchEvent(new CustomEvent('ripple-trigger', { detail: rippleOrigin.current || {} }));
    const endsAt = pendingMode === 'zen' ? Date.now() + zenSeconds * 1000 : null;
    window.electron?.startBlocking({ apps: selectedApps, web: selectedWebsites, endsAt });
    setIsBlocking(true);
    setSessionEndsAt(endsAt);
    setPendingMode(null);
    setOpenBlocked(null);
    setKeyVerified(false);
    setActiveTab('home');
  };

  const startSession = async (origin) => {
    if (origin) rippleOrigin.current = origin;
    if (selectedApps.length === 0 && selectedWebsites.length === 0) {
      window.electron?.showError('ZenTap', 'Select apps or add website keywords first.');
      return;
    }
    // Say what is about to be closed before closing it.
    const open = await window.electron?.getOpenBlocked?.({ apps: selectedApps, web: selectedWebsites })
      .catch(() => null);

    if (selectedWebsites.length && open && !open.extension && !askedForExtension.current) {
      askedForExtension.current = true;
      resumeStart.current = true;
      setShowBrowsers(true);
      return;
    }

    if (open && (open.apps.length || open.browsers.length)) {
      setOpenBlocked(open);
      return;
    }
    beginBlocking();
  };

  const chooseMode = (mode) => {
    if (!keyVerified) {
      window.electron?.showError(
        'ZenTap',
        'Press Zen Device on the Home screen and insert your ZenKey to start a session.',
      );
      return;
    }
    setPendingMode(mode);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setDetailedStatsItem(null);
    // Never leave a half-chosen session behind: without this, coming back to
    // the Session tab later drops you on the setup screen, which hides the
    // tab bar and looks like being stuck.
    setPendingMode(null);
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
      {/* Rebuilt 1:1 from the Figma export — these draw their own chrome and nav. */}
      {activeTab === 'home' && (
        <HomeScreen
          {...dockProps}
          screenTime={screenTime}
          sessions={usage?.todaySessions ?? 0}
          streak={usage?.streak ?? 0}
          sessionRemaining={isBlocking && sessionEndsAt ? sessionRemaining : null}
          isBlocking={isBlocking}
          onStartZen={startZenFlow}
          activeTab={activeTab}
          onChangeTab={changeTab}
        />
      )}
      {activeTab === 'session' && !pendingMode && (
        <SessionScreen
          {...dockProps}
          onSelectMode={chooseMode}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}
      {inSessionSetup && (
        <SessionStartScreen
          {...dockProps}
          mode={pendingMode}
          onChangeMode={setPendingMode}
          seconds={zenSeconds}
          onChangeSeconds={setZenSeconds}
          onStart={startSession}
          onBack={() => setPendingMode(null)}
        />
      )}

      {activeTab === 'statistics' && (
        detailedStatsItem ? (
          <DetailedStatisticsScreen
            item={detailedStatsItem}
            days={usage?.days}
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
          blockNotifications={blockNotifications}
          onToggleNotifications={toggleBlockNotifications}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}
      {activeTab === 'profile' && (
        <ProfileScreen
          screenTime={screenTime}
          totalTime={usage ? Math.round(usage.totalSeconds / 60) : screenTime}
          name={profileName}
          onChangeName={saveProfileName}
          avatar={avatar}
          onPickAvatar={pickAvatar}
          onDeleteProfile={() => setConfirmDelete(true)}
          memberSince={memberSince ? new Date(memberSince).toLocaleDateString() : '—'}
          activeTab={activeTab}
          onChangeTab={changeTab}
          onBack={() => changeTab('home')}
        />
      )}

      {/* The device sits in the artboard slot where Homescreen.png shows it. */}
      <ArtboardLayer
        className={`global-model-container ${activeTab === 'home' ? 'visible' : 'hidden'}`}
        x={47} y={354} w={700} h={420}
      >
        <SafeBoundary label="Zen device model">
          <Suspense fallback={null}>
            <InteractiveCard scale={1.742} />
          </Suspense>
        </SafeBoundary>
      </ArtboardLayer>

      <WindowControls />

      {openBlocked && (
        <ConfirmDialog
          confirmLabel="Continue"
          cancelLabel="Cancel"
          onConfirm={beginBlocking}
          onCancel={() => setOpenBlocked(null)}
        >
          {openBlocked.apps.length > 0 && (
            <>
              Starting this session will close{' '}
              <strong>{openBlocked.apps.join(', ')}</strong>. Anything unsaved in
              {openBlocked.apps.length > 1 ? ' them' : ' it'} will be lost.
            </>
          )}
          {openBlocked.apps.length > 0 && openBlocked.browsers.length > 0 && <><br /><br /></>}
          {openBlocked.browsers.length > 0 && (
            <>
              Any tabs on your block list will be closed in{' '}
              <strong>{openBlocked.browsers.join(', ')}</strong>.
            </>
          )}
          <br />
          <br />
          Continue?
        </ConfirmDialog>
      )}

      {showBrowsers && (
        <BrowserPickerDialog
          onClose={() => {
            setShowBrowsers(false);
            // If this interrupted a session start, carry on with it.
            if (resumeStart.current) {
              resumeStart.current = false;
              startSession();
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          onConfirm={deleteProfile}
          onCancel={() => setConfirmDelete(false)}
        >
          This deletes <strong>all of your saved time</strong>, your profile picture, and
          every setting, and unpairs your ZenKey. ZenTap will start again from
          onboarding. This cannot be undone.
          <br />
          <br />
          Are you sure?
        </ConfirmDialog>
      )}

      {showPopup && (
        <ManageAppsPopup
          onClose={() => setShowPopup(false)}
          initialTab={popupTab}
          selectedApps={selectedApps}
          setSelectedApps={setSelectedApps}
          selectedWebsites={selectedWebsites}
          setSelectedWebsites={setSelectedWebsites}
          onWebsiteAdded={offerExtension}
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
