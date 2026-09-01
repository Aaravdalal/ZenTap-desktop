const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  startIconStream: () => ipcRenderer.send('start-icon-stream'),
  onAppIconReady: (callback) => {
    ipcRenderer.removeAllListeners('app-icon-ready'); // Prevent duplicate listeners
    ipcRenderer.on('app-icon-ready', (event, data) => callback(data));
  },
  startBlocking: (payload) => ipcRenderer.send('start-blocking', payload),
  stopBlocking: () => ipcRenderer.send('stop-blocking'),
  toggleNotifications: (muted) => ipcRenderer.send('toggle-notifications', muted),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  maximizeApp: () => ipcRenderer.send('maximize-app'),
  closeApp: () => ipcRenderer.send('close-app'),
  onHudMessage: (callback) => {
    ipcRenderer.on('hud-message', (event, message) => callback(message));
  },
  showError: (title, body) => ipcRenderer.send('show-error', title, body),
  fetchFavicon: (domain) => ipcRenderer.invoke('fetch-favicon', domain),
  getScreenTime: () => ipcRenderer.invoke('get-screen-time'),
  getTotalScreenTime: () => ipcRenderer.invoke('get-total-screen-time'),
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
  getBlockingState: () => ipcRenderer.invoke('get-blocking-state'),
  getLinks: () => ipcRenderer.invoke('get-links'),
  pickAvatar: () => ipcRenderer.invoke('pick-avatar'),
  resetProfile: () => ipcRenderer.invoke('reset-profile'),
  getOpenBlocked: (payload) => ipcRenderer.invoke('get-open-blocked', payload),
  getBrowsers: () => ipcRenderer.invoke('get-browsers'),
  openExtensionPage: (browserId) => ipcRenderer.invoke('open-extension-page', browserId),
  onAppIconsComplete: (callback) => {
    ipcRenderer.removeAllListeners('app-icons-complete');
    ipcRenderer.on('app-icons-complete', () => callback());
  },
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onWindowMaximizeChange: (callback) => {
    ipcRenderer.removeAllListeners('window-maximize-changed');
    ipcRenderer.on('window-maximize-changed', (event, isMaximized) => callback(isMaximized));
  },
  onUsageUpdated: (callback) => {
    ipcRenderer.on('usage-updated', (event, minutes) => callback(minutes));
  },
  triggerFullscreenRipple: (coords) => ipcRenderer.send('trigger-fullscreen-ripple', coords),
  startUsbMonitoring: () => ipcRenderer.send('start-usb-monitoring'),
  stopUsbMonitoring: () => ipcRenderer.send('stop-usb-monitoring'),
  onUsbInserted: (callback) => {
    ipcRenderer.removeAllListeners('usb-inserted'); // Prevent duplicate listeners
    ipcRenderer.on('usb-inserted', () => callback());
  },
  checkUsbPresent: () => ipcRenderer.invoke('check-usb-present'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (data) => ipcRenderer.send('save-config', data)
});
