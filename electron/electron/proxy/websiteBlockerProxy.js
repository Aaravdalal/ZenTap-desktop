/**
 * Website Blocker - Approach 1: User-Level Proxy (HKCU)
 * Complete implementation with registry management, proxy server, and cleanup handlers
 */

import { EventEmitter } from 'events';
import { ProxyServer } from './proxyServer.js';
import { enableProxy, disableProxy, restoreProxySettings, getProxySettings } from './registryProxy.js';
import { startProxyGuardian, stopProxyGuardian } from './proxyGuardian.js';

class WebsiteBlockerProxy extends EventEmitter {
  constructor(options = {}) {
    super();
    this.proxyPort = options.port || 8080;
    this.proxyServer = new ProxyServer({
      port: this.proxyPort
    });
    this.isActive = false;
    this.originalProxySettings = null;

    // Setup event handlers - re-emit on `this` so callers (main.js) can listen
    // on the blocker instance directly instead of reaching into proxyServer.
    this.proxyServer.on('blocked', (info) => {
      console.log(`[Blocker] Blocked ${info.type}: ${info.hostname}`);
      this.emit('blocked', info);
    });

    this.proxyServer.on('error', (err) => {
      // Not re-emitted on `this` - Node's EventEmitter throws when an 'error'
      // event has no listener, and nothing here currently listens for one.
      console.error('[Blocker] Proxy error:', err);
    });
  }

  /**
   * Initialize and start website blocking
   */
  async start(blockedDomains = []) {
    if (this.isActive) {
      console.log('[Blocker] Already active, updating domains...');
      this.proxyServer.setBlockedDomains(blockedDomains);
      return true;
    }

    try {
      // Save original proxy settings for restoration
      this.originalProxySettings = await getProxySettings();
      console.log('[Blocker] Original proxy settings:', this.originalProxySettings);

      // Start proxy server
      await this.proxyServer.start();
      
      // Set blocked domains
      this.proxyServer.setBlockedDomains(blockedDomains);
      
      // Enable system proxy
      const success = await enableProxy(this.proxyPort);
      if (!success) {
        await this.proxyServer.stop();
        throw new Error('Failed to enable system proxy');
      }

      this.isActive = true;
      // From here until cleanup, a crash would strand every browser on this
      // machine, so leave something behind that can undo it.
      startProxyGuardian();
      console.log('[Blocker] Website blocking started successfully');
      return true;
    } catch (error) {
      console.error('[Blocker] Failed to start:', error);
      await this.cleanup();
      return false;
    }
  }

  /**
   * Stop website blocking and restore original settings
   */
  async stop() {
    if (!this.isActive) {
      console.log('[Blocker] Not active');
      return true;
    }

    try {
      await this.cleanup();
      console.log('[Blocker] Website blocking stopped');
      return true;
    } catch (error) {
      console.error('[Blocker] Error stopping:', error);
      return false;
    }
  }

  /**
   * Cleanup proxy and restore registry
   */
  async cleanup() {
    this.isActive = false;
    stopProxyGuardian();
    
    // Stop proxy server
    await this.proxyServer.stop();

    // Restore the user's original proxy settings exactly (server, port and
    // bypass list) instead of re-enabling a proxy on 127.0.0.1 - that would
    // silently replace a real upstream proxy the user had configured.
    await restoreProxySettings(this.originalProxySettings);

    this.originalProxySettings = null;
  }

  /**
   * Update blocked domains dynamically
   */
  updateBlockedDomains(domains) {
    this.proxyServer.setBlockedDomains(domains);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      port: this.proxyPort,
      blockedDomains: Array.from(this.proxyServer.blockedDomains),
      originalSettings: this.originalProxySettings
    };
  }

  /**
   * Clear a dangling system proxy left behind by a previous run of this app
   * that didn't exit cleanly (crash, force-kill, Task Manager) - before-quit
   * can't run in that case, so the registry is left pointing at 127.0.0.1:port
   * with nothing listening there, breaking ALL internet access system-wide.
   * Call this once at app startup, before any real blocking session begins.
   */
  async healDanglingProxy() {
    const current = await getProxySettings();
    if (current.enabled && current.server === `127.0.0.1:${this.proxyPort}`) {
      console.warn('[Blocker] Found a dangling proxy from a previous session - disabling it.');
      await disableProxy();
    }
  }

  /**
   * Force cleanup - for emergency exits
   */
  async forceCleanup() {
    console.log('[Blocker] Force cleanup triggered');
    try {
      stopProxyGuardian();
      await this.proxyServer.stop();
      await disableProxy();
    } catch (error) {
      console.error('[Blocker] Force cleanup error:', error);
    }
    this.isActive = false;
  }
}

// Singleton instance for global access
let blockerInstance = null;

/**
 * Get or create the global blocker instance
 */
function getBlockerInstance(options) {
  if (!blockerInstance) {
    blockerInstance = new WebsiteBlockerProxy(options);
  }
  return blockerInstance;
}

/**
 * Reset the global instance
 */
function resetBlockerInstance() {
  blockerInstance = null;
}

export {
  WebsiteBlockerProxy,
  getBlockerInstance,
  resetBlockerInstance
};