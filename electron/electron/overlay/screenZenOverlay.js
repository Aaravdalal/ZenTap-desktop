/**
 * ScreenZen Overlay - Approach 2: Active Window Detection & Overlay
 * Transparent, borderless, always-on-top Electron BrowserWindow
 * Shows 5-second delay page when blocked domain detected
 */

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { ActiveWindowMonitor } = require('./windowMonitor');

class ScreenZenOverlay {
  constructor(options = {}) {
    this.mainWindow = options.mainWindow || null;
    this.overlayWindow = null;
    this.monitor = new ActiveWindowMonitor({
      pollInterval: options.pollInterval || 500,
      blockedKeywords: options.blockedKeywords || []
    });
    this.isOverlayVisible = false;
    this.currentBlockedInfo = null;
    this.delaySeconds = options.delaySeconds || 5;
    this.allowAccessAfterDelay = options.allowAccessAfterDelay !== false;
    this.cooldownMs = options.cooldownMs || 30000; // 30 seconds before showing again
    this.lastShown = new Map(); // domain -> timestamp
    
    // Bind event handlers
    this.setupMonitorEvents();
    this.setupIpcHandlers();
  }

  /**
   * Setup window monitor event handlers
   */
  setupMonitorEvents() {
    this.monitor.on('blocked-detected', (match, windowInfo) => {
      this.handleBlockedDetected(match, windowInfo);
    });
    
    this.monitor.on('window-changed', (newWindow, oldWindow) => {
      // Optional: handle window focus changes
    });
  }

  /**
   * Setup IPC handlers for renderer communication
   */
  setupIpcHandlers() {
    // Handle overlay ready (delay page loaded)
    ipcMain.on('overlay-ready', (event) => {
      console.log('[Overlay] Delay page ready');
    });
    
    // Handle delay complete
    ipcMain.on('overlay-delay-complete', (event, { domain }) => {
      this.handleDelayComplete(domain);
    });
    
    // Handle user clicked "allow" (if we add that option)
    ipcMain.on('overlay-allow-access', (event, { domain }) => {
      this.allowAccess(domain);
    });
  }

  /**
   * Handle blocked domain detected
   */
  handleBlockedDetected(match, windowInfo) {
    const domain = this.extractDomain(match.title);
    const now = Date.now();
    const lastShown = this.lastShown.get(domain) || 0;
    
    // Check cooldown
    if (now - lastShown < this.cooldownMs) {
      console.log(`[Overlay] Cooldown active for ${domain}, skipping`);
      return;
    }
    
    // Don't show if already showing for this domain
    if (this.isOverlayVisible && this.currentBlockedInfo?.domain === domain) {
      return;
    }
    
    console.log(`[Overlay] Blocked domain detected: ${domain} in ${match.exeName}`);
    this.showOverlay(domain, match.title, windowInfo);
  }

  /**
   * Extract domain from window title
   */
  extractDomain(title) {
    // Try to extract domain from title (browser tabs usually have "Title - Domain")
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      const possibleDomain = parts[parts.length - 1].trim();
      if (possibleDomain.includes('.')) return possibleDomain;
    }
    
    // Fallback: look for URLs in title
    const urlMatch = title.match(/(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (urlMatch) return urlMatch[1];
    
    return 'blocked-site';
  }

  /**
   * Show the overlay window
   */
  showOverlay(domain, fullTitle, windowInfo) {
    if (this.overlayWindow) {
      this.hideOverlay();
    }
    
    // Get screen bounds for the display containing the browser window
    const displays = screen.getAllDisplays();
    let targetDisplay = screen.getPrimaryDisplay();
    
    // Try to find the display where the browser window is
    if (windowInfo && windowInfo.hwnd) {
      // For simplicity, use primary display
      // In production, you'd use GetWindowRect via koffi to find exact position
    }
    
    const { width, height } = targetDisplay.size;
    const { x, y } = targetDisplay.bounds;
    
    this.overlayWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      hasShadow: false,
      resizable: false,
      fullscreenable: false,
      movable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'overlayPreload.js')
      }
    });
    
    // Make window click-through initially (delay page will handle interaction)
    this.overlayWindow.setIgnoreMouseEvents(false);
    
    // Load delay page
    const delayPagePath = path.join(__dirname, 'delayPage.html');
    this.overlayWindow.loadFile(delayPagePath, {
      query: {
        domain,
        fullTitle: encodeURIComponent(fullTitle),
        delaySeconds: this.delaySeconds
      }
    });
    
    // Prevent closing via window controls
    this.overlayWindow.on('close', (e) => {
      if (!this.allowClose) {
        e.preventDefault();
      }
    });
    
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      this.isOverlayVisible = false;
    });
    
    this.isOverlayVisible = true;
    this.currentBlockedInfo = { domain, fullTitle, windowInfo, startTime: Date.now() };
    this.lastShown.set(domain, Date.now());
    
    console.log(`[Overlay] Showing delay page for ${domain} (${this.delaySeconds}s)`);
  }

  /**
   * Hide the overlay window
   */
  hideOverlay() {
    if (this.overlayWindow) {
      this.allowClose = true;
      this.overlayWindow.close();
      this.overlayWindow = null;
    }
    this.isOverlayVisible = false;
    this.currentBlockedInfo = null;
  }

  /**
   * Handle delay completion
   */
  handleDelayComplete(domain) {
    console.log(`[Overlay] Delay complete for ${domain}`);
    
    if (this.allowAccessAfterDelay) {
      this.allowAccess(domain);
    }
    
    this.hideOverlay();
  }

  /**
   * Allow access to domain (temporarily)
   */
  allowAccess(domain) {
    // Add to temporary allow list
    // In a full implementation, you'd communicate with the proxy to allow this domain
    console.log(`[Overlay] Temporary access granted for ${domain}`);
    
    // Could emit event for proxy to handle
    this.emit('access-granted', { domain, duration: this.cooldownMs });
  }

  /**
   * Start monitoring
   */
  start(blockedKeywords = []) {
    this.monitor.setBlockedKeywords(blockedKeywords);
    this.monitor.start();
    console.log('[Overlay] ScreenZen monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.monitor.stop();
    this.hideOverlay();
    console.log('[Overlay] ScreenZen monitoring stopped');
  }

  /**
   * Update blocked keywords
   */
  updateBlockedKeywords(keywords) {
    this.monitor.setBlockedKeywords(keywords);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isMonitoring: this.monitor.isRunning,
      isOverlayVisible: this.isOverlayVisible,
      currentDomain: this.currentBlockedInfo?.domain || null,
      blockedKeywords: Array.from(this.monitor.blockedKeywords)
    };
  }
}

// Make it an EventEmitter
const { EventEmitter } = require('events');
Object.setPrototypeOf(ScreenZenOverlay.prototype, EventEmitter.prototype);

module.exports = { ScreenZenOverlay };