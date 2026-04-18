const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  startIconStream: () => ipcRenderer.send('start-icon-stream'),
  onAppIconReady: (callback) => {
    ipcRenderer.on('app-icon-ready', (event, data) => callback(data));
  },
  startBlocking: (payload) => ipcRenderer.send('start-blocking', payload),
  stopBlocking: () => ipcRenderer.send('stop-blocking'),
  toggleNotifications: (muted) => ipcRenderer.send('toggle-notifications', muted),
  onHudMessage: (callback) => {
    ipcRenderer.on('hud-message', (event, message) => callback(message));
  },
  showError: (title, body) => ipcRenderer.send('show-error', title, body),
  fetchFavicon: (domain) => ipcRenderer.invoke('fetch-favicon', domain),
  getScreenTime: () => ipcRenderer.invoke('get-screen-time'),
  onUsageUpdated: (callback) => {
    ipcRenderer.on('usage-updated', (event, minutes) => callback(minutes));
  },
  onAppBlocked: (callback) => {
    ipcRenderer.on('app-blocked', (event, appName) => callback(appName));
  },
  triggerFullscreenRipple: (coords) => ipcRenderer.send('trigger-fullscreen-ripple', coords)
});
