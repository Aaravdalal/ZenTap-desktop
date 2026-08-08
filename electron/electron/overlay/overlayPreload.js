/**
 * Overlay Preload Script
 * Secure bridge between delay page and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  // Notify main process that delay page is loaded
  onReady: () => ipcRenderer.send('overlay-ready'),
  
  // Notify main process that delay countdown completed
  onDelayComplete: (domain) => ipcRenderer.send('overlay-delay-complete', { domain }),
  
  // Request temporary access
  requestAccess: (domain) => ipcRenderer.send('overlay-allow-access', { domain }),
  
  // Get initial data from URL params
  getInitialData: () => {
    const params = new URLSearchParams(window.location.search);
    return {
      domain: params.get('domain') || 'blocked-site',
      fullTitle: decodeURIComponent(params.get('fullTitle') || ''),
      delaySeconds: parseInt(params.get('delaySeconds')) || 5
    };
  }
});