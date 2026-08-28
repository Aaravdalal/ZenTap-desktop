/**
 * User-Level Proxy Manager for HKCU Registry
 * Modifies HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings
 * No Administrator privileges required
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REGISTRY_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

// Bypass list so the proxy never intercepts loopback traffic (e.g. the app's
// own Vite dev server) in addition to whatever the user already had.
const LOCAL_BYPASS = '<local>;127.0.0.1;localhost;[::1]';

/**
 * Ask Windows (WinINet) to re-read the Internet Settings registry keys
 * immediately. Without this, changes made with `reg add` are only picked up
 * by *new* processes/connections - already-running browsers keep using
 * whatever proxy config they cached at startup, which makes the feature
 * look like it "doesn't work" until the browser is restarted.
 *
 * This uses a small inline C# snippet (via PowerShell Add-Type) to call
 * InternetSetOptionW, which is a per-user, non-privileged WinINet API - no
 * admin rights and no native Node module/compile step required.
 */
function notifySettingsChanged() {
  const script = `
    Add-Type -Namespace Zentap -Name WinInet -MemberDefinition '
      [DllImport("wininet.dll", SetLastError = true)]
      public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
    ';
    [void][Zentap.WinInet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0);
    [void][Zentap.WinInet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0);
  `;
  // Passed via stdin (not a -Command string) to avoid cmd.exe mangling the
  // double quotes the C# DllImport attribute needs.
  return new Promise((resolve) => {
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-']);
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code !== 0) console.error('[Proxy] Failed to notify system of settings change:', stderr);
      resolve();
    });
    child.on('error', (err) => {
      console.error('[Proxy] Failed to notify system of settings change:', err);
      resolve();
    });
    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Write the raw proxy registry values, then tell Windows to apply them live.
 */
async function writeProxySettings({ enabled, server, bypass }) {
  await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyEnable /t REG_DWORD /d ${enabled ? 1 : 0} /f`);
  await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyServer /t REG_SZ /d "${server || ''}" /f`);
  await execAsync(`reg add "${REGISTRY_PATH}" /v ProxyOverride /t REG_SZ /d "${bypass || ''}" /f`);
  await notifySettingsChanged();
}

/**
 * Enable system proxy pointing to localhost
 * @param {number} port - Proxy server port
 */
async function enableProxy(port) {
  try {
    await writeProxySettings({
      enabled: true,
      server: `127.0.0.1:${port}`,
      bypass: LOCAL_BYPASS
    });
    console.log(`[Proxy] Enabled system proxy: 127.0.0.1:${port}`);
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
    await writeProxySettings({ enabled: false, server: '', bypass: '' });
    console.log('[Proxy] Disabled system proxy');
    return true;
  } catch (error) {
    console.error('[Proxy] Failed to disable proxy:', error);
    return false;
  }
}

/**
 * Restore a previously captured proxy configuration exactly as it was
 * (server address, port, and bypass list) - not just "on/off". Using
 * enableProxy() here would clobber a user's real upstream proxy with
 * 127.0.0.1, so this restores the original server string verbatim.
 */
async function restoreProxySettings(settings) {
  if (!settings) return disableProxy();
  try {
    await writeProxySettings({
      enabled: !!settings.enabled,
      server: settings.server || '',
      bypass: settings.bypass || ''
    });
    console.log('[Proxy] Restored original proxy settings:', settings);
    return true;
  } catch (error) {
    console.error('[Proxy] Failed to restore proxy settings:', error);
    return false;
  }
}

/**
 * Get current proxy settings
 */
async function getProxySettings() {
  try {
    const { stdout: enableOut } = await execAsync(`reg query "${REGISTRY_PATH}" /v ProxyEnable`);
    const enabled = enableOut.includes('0x1');

    let server = '';
    try {
      const { stdout: serverOut } = await execAsync(`reg query "${REGISTRY_PATH}" /v ProxyServer`);
      const serverMatch = serverOut.match(/ProxyServer\s+REG_SZ\s+(.+)/);
      server = serverMatch ? serverMatch[1].trim() : '';
    } catch (e) {
      // Value not present - no proxy was ever configured
    }

    let bypass = '';
    try {
      const { stdout: bypassOut } = await execAsync(`reg query "${REGISTRY_PATH}" /v ProxyOverride`);
      const bypassMatch = bypassOut.match(/ProxyOverride\s+REG_SZ\s+(.+)/);
      bypass = bypassMatch ? bypassMatch[1].trim() : '';
    } catch (e) {
      // Value not present
    }

    return { enabled, server, bypass };
  } catch (error) {
    console.error('[Proxy] Failed to get settings:', error);
    return { enabled: false, server: '', bypass: '' };
  }
}

/**
 * Check if proxy is currently enabled
 */
async function isProxyEnabled() {
  const { enabled } = await getProxySettings();
  return enabled;
}

export {
  enableProxy,
  disableProxy,
  restoreProxySettings,
  getProxySettings,
  isProxyEnabled,
  REGISTRY_PATH
};
