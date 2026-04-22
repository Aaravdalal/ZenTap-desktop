import { app, BrowserWindow, ipcMain, nativeImage, shell, powerMonitor, screen } from 'electron';

// Global error handling to catch silent crashes ("Exit 0" or unhandled rejections)
process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let isDev = process.env.NODE_ENV === 'development';

// Screen Time State
let dailyUsageMinutes = 0;
const USAGE_FILE = path.join(app.getPath('userData'), 'daily_usage.json');

// Cache for instant loading
let cachedAppList = [];
let pkgMapCache = {};
let missingIconBase64 = "";
let discoveryPromise = null;

const APP_MAP = {
  "Microsoft Edge": "msedge.exe",
  "Visual Studio Code": "code.exe",
  "Apple Music": "AppleMusic.exe",
  "Chrome": "chrome.exe",
  "Spotify": "Spotify.exe",
  "Firefox": "firefox.exe",
  "Discord": "discord.exe",
  "Steam": "steam.exe"
};

const GUID_MAP = {
  "{6D809377-6AF0-444B-8957-A3773F02200E}": process.env["ProgramFiles"],
  "{7C5A2C59-7079-4093-BFDD-7CF61F747BB0}": process.env["ProgramFiles(x86)"],
  "{F38BF404-1D43-42F2-9305-67DE0B28FC23}": process.env["SystemRoot"],
  "{DFDF010D-CB21-4d22-A35A-9377A9C3FD2F}": process.env["USERPROFILE"] + "\\AppData\\Local",
  "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}": process.env["SystemRoot"] + "\\System32",
  "{A52B0784-D967-482E-A4A9-311D880624EE}": process.env["USERPROFILE"] + "\\AppData\\Roaming"
};

async function getRecursiveShortcuts(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of list) {
            const res = path.resolve(dir, file.name);
            if (file.isDirectory()) {
                results = results.concat(await getRecursiveShortcuts(res));
            } else if (file.name.toLowerCase().endsWith('.lnk') && !file.name.toLowerCase().includes('uninstall')) {
                results.push({ name: file.name.replace(/\.lnk$/i, ''), path: res });
            }
        }
    } catch (e) {}
    return results;
}

async function discoverApps() {
    console.log("Starting ultra-fast background app discovery...");
    
    // 1. Load Fallback Icon Cache (Fastest)
    try {
        const pathsToTry = [
            path.join(__dirname, '../../assets/missing_icon.png'),
            path.join(__dirname, '../../../assets/missing_icon.png'),
            path.join(app.getAppPath(), 'assets/missing_icon.png')
        ];
        for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
                missingIconBase64 = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
                break;
            }
        }
    } catch (e) {}

    // 2. Parallel Scans: Node.js FS (Fast) vs PowerShell (UWP)
    const fsScanPromise = (async () => {
        const folders = [
            path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs'),
            path.join(process.env.AppData || '', 'Microsoft/Windows/Start Menu/Programs'),
            path.join(process.env.AppData || '', 'Microsoft/Windows/Start Menu/Programs/Startup'),
            path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs/Startup')
        ];
        const all = await Promise.all(folders.map(f => getRecursiveShortcuts(f)));
        return all.flat();
    })();

    const uwpScanPromise = new Promise((res) => {
        // Combined UWP names and package info in one call
        const script = `
            $pkgs = Get-AppxPackage | Select-Object Name, PackageFamilyName, InstallLocation;
            $apps = Get-StartApps | Where-Object { $_.AppID -match "!" -or $_.AppID -notmatch "\\\\" };
            $out = @();
            foreach ($a in $apps) {
                $family = $a.AppID.Split("!")[0];
                $p = $pkgs | Where-Object { $_.PackageFamilyName -eq $family -or $_.Name -eq $family };
                if ($p) {
                    $out += [PSCustomObject]@{ Name = $a.Name; AppID = $a.AppID; InstallLocation = $p.InstallLocation }
                } else {
                    $out += [PSCustomObject]@{ Name = $a.Name; AppID = $a.AppID; InstallLocation = $null }
                }
            };
            $out | ConvertTo-Json -Compress
        `;
        exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
            try { 
                const parsed = JSON.parse(stdout);
                res(Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []));
            } catch { res([]); }
        });
    });

    const [fsApps, uwpApps] = await Promise.all([fsScanPromise, uwpScanPromise]);
    
    const seen = new Set();
    cachedAppList = [];
    pkgMapCache = {};

    // Process FS Apps
    for (const app of fsApps) {
        if (seen.has(app.path)) continue;
        seen.add(app.path);
        
        // Resolve EXE name for blocking
        let exeName = null;
        try {
            const shortcut = shell.readShortcutLink(app.path);
            if (shortcut.target) {
                exeName = path.basename(shortcut.target);
            }
        } catch (e) {}
        
        cachedAppList.push({ 
            name: app.name, 
            path: app.path, 
            exeName: exeName,
            icon: missingIconBase64 
        });
    }

    // Process UWP Apps & Update Cache for icon extraction
    for (const app of uwpApps) {
        if (seen.has(app.AppID)) continue;
        seen.add(app.AppID);
        cachedAppList.push({ 
            name: app.Name, 
            path: app.AppID, 
            exeName: app.Name + ".exe", // UWP typically doesn't use simple taskkill, but we'll try Name
            icon: missingIconBase64 
        });
        if (app.InstallLocation) {
            pkgMapCache[app.AppID.split('!')[0]] = app.InstallLocation;
        }
    }

    cachedAppList.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Discovery complete. Populated ${cachedAppList.length} apps instantly.`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false 
    },
    title: "ZenTap For Windows",
    icon: path.join(__dirname, '../public/z_icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error(`Main window failed to load: ${code} - ${desc}`);
  });

  // Forward renderer console logs to the terminal for easier debugging.
  // Supports both older (positional) and newer (object) Electron API signatures.
  mainWindow.webContents.on('console-message', (event, ...args) => {
    let level, message, line, sourceId;
    if (typeof args[0] === 'object' && args[0] !== null) {
      ({ level, message, line, sourceId } = args[0]);
    } else {
      [level, message, line, sourceId] = args;
    }
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[RENDERER-${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on('render-process-gone', (e, details) => {
    console.error(`CRITICAL: Renderer process gone! Reason: ${details.reason}, ExitCode: ${details.exitCode}`);
  });

  mainWindow.on('close', () => {
    console.log("Main window is closing...");
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log("Main window closed.");
  });

  mainWindow.setMenu(null);
}

async function loadUsage() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = JSON.parse(await readFile(USAGE_FILE, 'utf8'));
            const today = new Date().toDateString();
            if (data.date === today) {
                dailyUsageMinutes = data.minutes || 0;
            } else {
                dailyUsageMinutes = 0;
            }
        }
    } catch (e) { console.error("Load usage failed:", e); }
}

async function saveUsage() {
    try {
        const data = { date: new Date().toDateString(), minutes: dailyUsageMinutes };
        await writeFile(USAGE_FILE, JSON.stringify(data));
    } catch (e) { console.error("Save usage failed:", e); }
}

function startUsageTracking() {
    // Every 60 seconds, check if system is active
    setInterval(() => {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < 60) {
            dailyUsageMinutes += 1;
            saveUsage();
            if (mainWindow) {
                 mainWindow.webContents.send('usage-updated', dailyUsageMinutes);
            }
        }
    }, 60000);
}

app.whenReady().then(async () => {
  console.log("App ready. Starting initialization...");
  try {
    await loadUsage();
    startUsageTracking();
    discoveryPromise = discoverApps();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error("Initialization error:", err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Calls for blocking
let isBlocking = false;
let blockLists = { apps: [], web: [] };
let blockInterval;
let blockingProcess;
let webBlockingProcess;
const recentlyBlocked = new Set();

ipcMain.handle('get-screen-time', async () => {
    return dailyUsageMinutes;
});

ipcMain.handle('get-installed-apps', async () => {
  if (discoveryPromise) await discoveryPromise;
  return cachedAppList.filter(a => a.name && !a.name.toLowerCase().includes("uninstall"));
});

ipcMain.on('start-icon-stream', async (event) => {
    if (discoveryPromise) await discoveryPromise;
    console.log(`Streaming ${cachedAppList.length} icons...`);
    
    // Process icons in background and push to UI
    for (const appItem of cachedAppList) {
        if (!mainWindow) break;
        
        // Skip if already loaded in this session
        if (appItem.icon && appItem.icon !== missingIconBase64) {
             mainWindow.webContents.send('app-icon-ready', { path: appItem.path, icon: appItem.icon });
             continue;
        }

        let icon = null;
        let iconPath = appItem.path;

        try {
            // GUID Map Resolution
            if (iconPath.includes('}\\')) {
                const parts = iconPath.split('}\\');
                const guid = parts[0] + '}';
                const relativePath = parts[1];
                if (GUID_MAP[guid.toUpperCase()]) {
                    iconPath = path.join(GUID_MAP[guid.toUpperCase()], relativePath);
                } else {
                    iconPath = relativePath; // Fallback to relative if GUID is unknown
                }
            }

            // Shortcut Target Resolution
            if (iconPath && iconPath.toLowerCase().endsWith('.lnk')) {
                try {
                    const shortcut = shell.readShortcutLink(iconPath);
                    if (shortcut.target) iconPath = shortcut.target;
                } catch (e) {}
            }

            // Extract Icon
            if (iconPath && (iconPath.includes('\\') || iconPath.endsWith('.exe'))) {
                const iconImg = await app.getFileIcon(iconPath, { size: 'normal' }).catch(() => null);
                if (iconImg && !iconImg.isEmpty()) icon = iconImg.toDataURL();
            }

            // UWP Manifest Extraction (Python Style)
            if (!icon) {
                const familyName = appItem.path.split('!')[0];
                const installLoc = pkgMapCache[familyName];
                if (installLoc) {
                    const manifestPath = path.join(installLoc, 'AppxManifest.xml');
                    if (fs.existsSync(manifestPath)) {
                        const manifest = await readFile(manifestPath, 'utf8');
                        // More robust regex for manifest logos
                        const matches = [...manifest.matchAll(/Logo="([^"]+)"/g)];
                        for (const match of matches) {
                            let logoRel = match[1];
                            let logoPaths = [
                                path.join(installLoc, logoRel),
                                path.join(installLoc, logoRel.replace(/\.png$/, '.scale-100.png')),
                                path.join(installLoc, logoRel.replace(/\.png$/, '.scale-125.png')),
                                path.join(installLoc, logoRel.replace(/\.png$/, '.scale-150.png')),
                                path.join(installLoc, logoRel.replace(/\.png$/, '.scale-200.png'))
                            ];
                            
                            for (const lp of logoPaths) {
                                if (fs.existsSync(lp)) {
                                    const buffer = await readFile(lp);
                                    icon = `data:image/png;base64,${buffer.toString('base64')}`;
                                    break;
                                }
                            }
                            if (icon) break;
                        }
                    }
                }
            }
        } catch (e) {}

        if (icon) {
            appItem.icon = icon;
            mainWindow.webContents.send('app-icon-ready', { path: appItem.path, icon });
        }
        
        // Extremely small delay to keep throughput high but UI responsive
        await new Promise(r => setTimeout(r, 2));
    }
});

ipcMain.handle('fetch-favicon', async (event, domain) => {
    try {
        const response = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
        const buffer = await response.arrayBuffer();
        return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
    } catch (e) {
        console.error("Favicon fetch failed:", e);
        return null;
    }
});

ipcMain.on('start-blocking', (e, { apps, web }) => {
  isBlocking = true;
  blockLists = { apps, web };
  recentlyBlocked.clear();
  
  if (blockingProcess) { try { blockingProcess.kill(); } catch(e){} }
  if (webBlockingProcess) { try { webBlockingProcess.kill(); } catch(e){} }
  if (blockInterval) { clearInterval(blockInterval); blockInterval = null; }
  
  // --- APP BLOCKING ---
  const appNames = apps
    .map(a => {
      let target = a.exeName ? a.exeName : (APP_MAP[a.name] || a.name.toLowerCase().replace(/ /g, '') + '.exe');
      return target.replace('.exe', '').replace(/'/g, "''");
    })
    .filter(name => name.length > 0);

  if (appNames.length > 0) {
    const psScript = `$names = @('${appNames.join("','")}'); while($true) { $killed = Get-Process | Where-Object { $_.ProcessName -in $names }; if ($killed) { $killed | ForEach-Object { Write-Output $_.ProcessName }; $killed | Stop-Process -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 150 }`;
    try {
        blockingProcess = spawn('powershell', ['-Command', psScript]);
        blockingProcess.on('error', (err) => console.error('App block error:', err));
        blockingProcess.stdout.on('data', (data) => {
            const names = data.toString().trim().split(/\r?\n/).filter(Boolean);
            for (const name of names) {
                const trimmed = name.trim();
                if (!recentlyBlocked.has(trimmed) && mainWindow) {
                    recentlyBlocked.add(trimmed);
                    mainWindow.webContents.send('app-blocked', trimmed);
                    setTimeout(() => recentlyBlocked.delete(trimmed), 5000);
                }
            }
        });
    } catch (err) { console.error('App spawn error:', err); }
  }

  // --- WEB BLOCKING ---
  if (web && web.length > 0) {
    const keywords = web.map(w => (w.keyword || w).replace(/'/g, "''")).filter(k => k.length > 0);
    if (keywords.length > 0) {
      const pattern = keywords.join('|');
      // Refactored to avoid here-strings which break when line-joined
      const webScript = "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; " +
        "Add-Type @' " +
        "using System; " +
        "using System.Runtime.InteropServices; " +
        "public class WinApi { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); } " +
        "'@; " +
        "while($true) { " +
        "$targets = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match '" + pattern + "' }; " +
        "foreach ($t in $targets) { " +
        "$name = $t.ProcessName; " +
        "[WinApi]::SetForegroundWindow($t.MainWindowHandle); " +
        "Start-Sleep -Milliseconds 50; " +
        "[System.Windows.Forms.SendKeys]::SendWait('^W'); " +
        "Write-Output $name; " +
        "} " +
        "Start-Sleep -Milliseconds 600 " +
        "}";

      try {
          webBlockingProcess = spawn('powershell', ['-Command', webScript]);
          webBlockingProcess.on('error', (err) => console.error('Web block error:', err));
          webBlockingProcess.stdout.on('data', (data) => {
              const names = data.toString().trim().split(/\r?\n/).filter(Boolean);
              for (const name of names) {
                  const trimmed = name.trim();
                  // Use same key as app blocking for absolute deduplication
                  if (!recentlyBlocked.has(trimmed) && mainWindow) {
                      recentlyBlocked.add(trimmed);
                      mainWindow.webContents.send('app-blocked', trimmed + ' (restricted site)');
                      setTimeout(() => recentlyBlocked.delete(trimmed), 5000);
                  }
              }
          });
      } catch (err) { console.error('Web spawn error:', err); }
    }
  }
});

ipcMain.on('stop-blocking', () => {
  isBlocking = false;
  recentlyBlocked.clear();
  if (blockInterval) { clearInterval(blockInterval); blockInterval = null; }
  if (blockingProcess) { try { blockingProcess.kill(); } catch(e){} blockingProcess = null; }
  if (webBlockingProcess) { try { webBlockingProcess.kill(); } catch(e){} webBlockingProcess = null; }
});

// --- FULLSCREEN RIPPLE OVERLAY ---
let rippleOverlayWindow = null;

ipcMain.on('trigger-fullscreen-ripple', (e, { screenX, screenY }) => {
  if (rippleOverlayWindow) {
    try { rippleOverlayWindow.close(); } catch(e) {}
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const overlayPath = path.join(__dirname, 'ripple_overlay.html');
  if (!fs.existsSync(overlayPath)) {
    console.error(`ERROR: Ripple overlay file missing at: ${overlayPath}`);
    return;
  }

  rippleOverlayWindow = new BrowserWindow({
    x: 0, y: 0, width, height,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, hasShadow: false, resizable: false,
    webPreferences: { 
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  rippleOverlayWindow.setIgnoreMouseEvents(true);
  
  rippleOverlayWindow.loadFile(overlayPath, { query: { x: screenX, y: screenY } });

  setTimeout(() => { 
    if (rippleOverlayWindow) {
      try { rippleOverlayWindow.close(); } catch(e) {}
      rippleOverlayWindow = null;
    }
  }, 2000);
});

ipcMain.on('toggle-notifications', (e, muted) => {
   const val = muted ? 0 : 1;
   // More robust silencing for Windows 10/11
   const ps = `
      $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings"
      if (-not (Test-Path $path)) { New-Item $path -Force }
      Set-ItemProperty -Path $path -Name "NOC_GLOBAL_SETTING_TOASTS_ENABLED" -Value ${val}
      
      # For some Windows 11 builds
      $p2 = "HKCU:\\Software\\Microsoft\\Windows\\Shell\\Notifications\\AppSettings\\Microsoft.Explorer.Notification"
      if (Test-Path $p2) { Set-ItemProperty -Path $p2 -Name "Enabled" -Value ${val} }
   `;
   exec(`powershell -Command "${ps.replace(/\n/g, ' ')}"`);
});

ipcMain.on('show-error', (e, title, body) => {
   // dialog
});
