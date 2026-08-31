/**
 * Watchdog for the system proxy.
 *
 * Enabling the system proxy points every browser on the machine at a server
 * that only exists while ZenTap does. If ZenTap is killed rather than closed -
 * Task Manager, a crash, `taskkill /F` - Windows keeps the setting and nothing
 * loads in any browser until someone clears it by hand.
 *
 * So for as long as the proxy is on, a detached PowerShell process sits and
 * waits for ZenTap's process to disappear, and turns the proxy off if it does.
 * It exits on its own when told to stop, and cannot outlive the thing it
 * watches by more than one poll.
 */
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

let guardian = null;

const SCRIPT = `
param([int]$WatchPid)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -Namespace Zentap -Name WinInet -MemberDefinition '
  [DllImport("wininet.dll", SetLastError = true)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
'
while ($true) {
  Start-Sleep -Seconds 2
  if (-not (Get-Process -Id $WatchPid -ErrorAction SilentlyContinue)) {
    Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0 -Type DWord
    [void][Zentap.WinInet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)
    [void][Zentap.WinInet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)
    break
  }
}
`;

/** Start watching. Safe to call when one is already running. */
export function startProxyGuardian() {
  if (guardian) return;
  try {
    const scriptPath = path.join(app.getPath('userData'), 'zentap_proxy_guardian.ps1');
    fs.writeFileSync(scriptPath, SCRIPT, 'utf8');
    guardian = spawn('powershell', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, String(process.pid),
    ], { windowsHide: true, detached: true, stdio: 'ignore' });
    // Detached so a hard kill of ZenTap's tree still leaves it alive long
    // enough to put the proxy setting back.
    guardian.unref();
    guardian.on('exit', () => { guardian = null; });
    console.log('[Proxy] Guardian watching pid', process.pid);
  } catch (err) {
    console.error('[Proxy] Could not start the guardian:', err);
    guardian = null;
  }
}

/** The proxy is off again, so nothing needs watching. */
export function stopProxyGuardian() {
  if (!guardian) return;
  try { guardian.kill(); } catch (err) { /* already gone */ }
  guardian = null;
}
