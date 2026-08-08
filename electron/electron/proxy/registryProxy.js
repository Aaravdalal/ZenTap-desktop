/**
 * User-Level Proxy Manager for HKCU Registry
 * Modifies HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings
 * No Administrator privileges required
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const REGISTRY_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

/**
 * Enable system proxy pointing to localhost
 * @param {number} port - Proxy server port
 */
async function enableProxy(port) {
  try {
    // Enable proxy
    await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyEnable /t REG_DWORD /d 1 /f`);
    
    // Set proxy server
    const proxyServer = `127.0.0.1:${port}`;
    await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`);
    
    // Optional: Bypass local addresses
    await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyOverride /t REG_SZ /d "<local>" /f`);
    
    console.log(`[Proxy] Enabled system proxy: ${proxyServer}`);
    return true;
  } catch (error) {
    console.error('[Proxy] Failed to enable proxy:', error);
    return false;
  }
}

/**
 * Disable system proxy (restore default)
 */
async function disableProxy() {
  try {
    // Disable proxy
    await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyEnable /t REG_DWORD /d 0 /f`);
    
    // Clear proxy server
    await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyServer /t REG_SZ /d "" /f`);
    
    console.log('[Proxy] Disabled system proxy');
    return true;
  } catch (error) {
    console.error('[Proxy] Failed to disable proxy:', error);
    return false;
  }
}

/**
 * Get current proxy settings
 */
async function getProxySettings() {
  try {
    const { stdout: enableOut } = await execAsync(`reg query "${REGISTRY_PATH}" /v ProxyEnable`);
    const { stdout: serverOut } = await execAsync(`reg query "${REGISTRY_PATH}" /v ProxyServer`);
    
    const enabled = enableOut.includes('0x1');
    const serverMatch = serverOut.match(/ProxyServer\s+REG_SZ\s+(.+)/);
    const server = serverMatch ? serverMatch[1].trim() : '';
    
    return { enabled, server };
  } catch (error) {
    console.error('[Proxy] Failed to get settings:', error);
    return { enabled: false, server: '' };
  }
}

/**
 * Check if proxy is currently enabled
 */
async function isProxyEnabled() {
  const { enabled } = await getProxySettings();
  return enabled;
}

module.exports = {
  enableProxy,
  disableProxy,
  getProxySettings,
  isProxyEnabled,
  REGISTRY_PATH
};