/**
 * Preload API for Blocking Features
 * Exposes blocking functionality to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('./blockingIpc');

// Proxy Blocker API
const proxyBlockerAPI = {
  start: (domains) => ipcRenderer.invoke(IPC_CHANNELS.PROXY.START, domains),
  stop: () => ipcRenderer.invoke(IPC_CHANNELS.PROXY.STOP),
  updateDomains: (domains) => ipcRenderer.invoke(IPC_CHANNELS.PROXY.UPDATE_DOMAINS, domains),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.PROXY.GET_STATUS),
  onStatusChanged: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.PROXY.STATUS_CHANGED, (event, status) => callback(status));
  },
  onBlocked: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.PROXY.BLOCKED, (event, info) => callback(info));
  }
};

// ScreenZen Overlay API
const overlayAPI = {
  start: (keywords) => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY.START, keywords),
  stop: () => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY.STOP),
  updateKeywords: (keywords) => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY.UPDATE_KEYWORDS, keywords),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY.GET_STATUS),
  onStatusChanged: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.OVERLAY.STATUS_CHANGED, (event, status) => callback(status));
  },
  onBlockedDetected: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.OVERLAY.BLOCKED_DETECTED, (event, info) => callback(info));
  },
  onAccessGranted: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.OVERLAY.ACCESS_GRANTED, (event, info) => callback(info));
  }
};

// Unified Blocking Control API
const blockingAPI = {
  start: (config) => ipcRenderer.invoke(IPC_CHANNELS.BLOCKING.START, config),
  stop: () => ipcRenderer.invoke(IPC_CHANNELS.BLOCKING.STOP),
  toggle: (config) => ipcRenderer.invoke(IPC_CHANNELS.BLOCKING.TOGGLE, config),
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.BLOCKING.GET_STATE)
};

// Expose to renderer
contextBridge.exposeInMainWorld('blocking', {
  proxy: proxyBlockerAPI,
  overlay: overlayAPI,
  control: blockingAPI
});

module.exports = { proxyBlockerAPI, overlayAPI, blockingAPI };