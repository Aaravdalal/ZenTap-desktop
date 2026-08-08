/**
 * IPC Channel Definitions
 * Centralized communication channels between Main and Renderer processes
 */

const IPC_CHANNELS = {
  // Proxy Blocker (Approach 1)
  PROXY: {
    START: 'proxy-blocker:start',
    STOP: 'proxy-blocker:stop',
    UPDATE_DOMAINS: 'proxy-blocker:update-domains',
    GET_STATUS: 'proxy-blocker:get-status',
    STATUS_CHANGED: 'proxy-blocker:status-changed',
    BLOCKED: 'proxy-blocker:blocked'
  },
  
  // ScreenZen Overlay (Approach 2)
  OVERLAY: {
    START: 'overlay:start',
    STOP: 'overlay:stop',
    UPDATE_KEYWORDS: 'overlay:update-keywords',
    GET_STATUS: 'overlay:get-status',
    STATUS_CHANGED: 'overlay:status-changed',
    BLOCKED_DETECTED: 'overlay:blocked-detected',
    ACCESS_GRANTED: 'overlay:access-granted'
  },
  
  // General Blocking Control
  BLOCKING: {
    START: 'blocking:start',
    STOP: 'blocking:stop',
    TOGGLE: 'blocking:toggle',
    GET_STATE: 'blocking:get-state'
  },
  
  // Configuration
  CONFIG: {
    LOAD: 'config:load',
    SAVE: 'config:save'
  }
};

/**
 * Create IPC handlers for Proxy Blocker
 */
function setupProxyBlockerIpc(ipcMain, blockerInstance) {
  const { PROXY } = IPC_CHANNELS;
  
  ipcMain.handle(PROXY.START, async (event, domains) => {
    const success = await blockerInstance.start(domains);
    event.sender.send(PROXY.STATUS_CHANGED, blockerInstance.getStatus());
    return { success, status: blockerInstance.getStatus() };
  });
  
  ipcMain.handle(PROXY.STOP, async (event) => {
    const success = await blockerInstance.stop();
    event.sender.send(PROXY.STATUS_CHANGED, blockerInstance.getStatus());
    return { success, status: blockerInstance.getStatus() };
  });
  
  ipcMain.handle(PROXY.UPDATE_DOMAINS, (event, domains) => {
    blockerInstance.updateBlockedDomains(domains);
    return { success: true, status: blockerInstance.getStatus() };
  });
  
  ipcMain.handle(PROXY.GET_STATUS, () => {
    return blockerInstance.getStatus();
  });
  
  // Forward blocked events to renderer
  blockerInstance.proxyServer.on('blocked', (info) => {
    // Send to all windows
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(PROXY.BLOCKED, info);
    });
  });
}

/**
 * Create IPC handlers for ScreenZen Overlay
 */
function setupOverlayIpc(ipcMain, overlayInstance) {
  const { OVERLAY } = IPC_CHANNELS;
  
  ipcMain.handle(OVERLAY.START, (event, keywords) => {
    overlayInstance.start(keywords);
    event.sender.send(OVERLAY.STATUS_CHANGED, overlayInstance.getStatus());
    return { success: true, status: overlayInstance.getStatus() };
  });
  
  ipcMain.handle(OVERLAY.STOP, (event) => {
    overlayInstance.stop();
    event.sender.send(OVERLAY.STATUS_CHANGED, overlayInstance.getStatus());
    return { success: true, status: overlayInstance.getStatus() };
  });
  
  ipcMain.handle(OVERLAY.UPDATE_KEYWORDS, (event, keywords) => {
    overlayInstance.updateBlockedKeywords(keywords);
    return { success: true, status: overlayInstance.getStatus() };
  });
  
  ipcMain.handle(OVERLAY.GET_STATUS, () => {
    return overlayInstance.getStatus();
  });
  
  // Forward overlay events
  overlayInstance.on('access-granted', (info) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(OVERLAY.ACCESS_GRANTED, info);
    });
  });
}

/**
 * Create unified blocking control IPC
 */
function setupBlockingControlIpc(ipcMain, blockerInstance, overlayInstance) {
  const { BLOCKING } = IPC_CHANNELS;
  
  ipcMain.handle(BLOCKING.START, async (event, { apps, websites, approach }) => {
    const results = { proxy: false, overlay: false };
    
    if (approach === 'proxy' || approach === 'both') {
      // Extract domains from websites
      const domains = websites.map(w => w.keyword || w).filter(Boolean);
      results.proxy = await blockerInstance.start(domains);
    }
    
    if (approach === 'overlay' || approach === 'both') {
      // Extract keywords from websites
      const keywords = websites.map(w => w.keyword || w).filter(Boolean);
      overlayInstance.start(keywords);
      results.overlay = true;
    }
    
    // Notify renderer
    event.sender.send(BLOCKING.GET_STATE, {
      proxy: blockerInstance.getStatus(),
      overlay: overlayInstance.getStatus()
    });
    
    return { success: true, results };
  });
  
  ipcMain.handle(BLOCKING.STOP, async (event) => {
    const results = { proxy: false, overlay: false };
    
    results.proxy = await blockerInstance.stop();
    overlayInstance.stop();
    results.overlay = true;
    
    event.sender.send(BLOCKING.GET_STATE, {
      proxy: blockerInstance.getStatus(),
      overlay: overlayInstance.getStatus()
    });
    
    return { success: true, results };
  });
  
  ipcMain.handle(BLOCKING.TOGGLE, async (event, { apps, websites, approach }) => {
    const proxyStatus = blockerInstance.getStatus();
    
    if (proxyStatus.isActive) {
      return ipcMain.handle(BLOCKING.STOP, event);
    } else {
      return ipcMain.handle(BLOCKING.START, event, { apps, websites, approach });
    }
  });
  
  ipcMain.handle(BLOCKING.GET_STATE, () => {
    return {
      proxy: blockerInstance.getStatus(),
      overlay: overlayInstance.getStatus()
    };
  });
}

/**
 * Setup all IPC handlers
 */
function setupAllIpc(ipcMain, blockerInstance, overlayInstance) {
  setupProxyBlockerIpc(ipcMain, blockerInstance);
  setupOverlayIpc(ipcMain, overlayInstance);
  setupBlockingControlIpc(ipcMain, blockerInstance, overlayInstance);
}

module.exports = {
  IPC_CHANNELS,
  setupProxyBlockerIpc,
  setupOverlayIpc,
  setupBlockingControlIpc,
  setupAllIpc
};