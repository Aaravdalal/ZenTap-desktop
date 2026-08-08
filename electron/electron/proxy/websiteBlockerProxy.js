/**
 * Website Blocker - Approach 1: User-Level Proxy (HKCU)
 * Complete implementation with registry management, proxy server, and cleanup handlers
 */

const { ProxyServer } = require('./proxyServer');
const { enableProxy, disableProxy, isProxyEnabled, getProxySettings } = require('./registryProxy');

class WebsiteBlockerProxy {
  constructor(options = {}) {
    this.proxyPort = options.port || 8080;
    this.proxyServer = new ProxyServer({
      port: this.proxyPort,
      delaySeconds: options.delaySeconds || 5
    });
    this.isActive = false;
    this.originalProxySettings = null;
    
    // Setup event handlers
    this.proxyServer.on('blocked', (info) => {
      console.log(`[Blocker] Blocked ${info.type}: ${info.hostname}`);
    });
    
    this.proxyServer.on('error', (err) => {
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
    
    // Stop proxy server
    await this.proxyServer.stop();
    
    // Restore original proxy settings
    if (this.originalProxySettings && this.originalProxySettings.enabled) {
      // Re-enable original proxy
      await enableProxy(this.originalProxySettings.server.split(':')[1] || 8080);
    } else {
      // Disable proxy completely
      await disableProxy();
    }
    
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
   * Force cleanup - for emergency exits
   */
  async forceCleanup() {
    console.log('[Blocker] Force cleanup triggered');
    try {
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

module.exports = {
  WebsiteBlockerProxy,
  getBlockerInstance,
  resetBlockerInstance
};