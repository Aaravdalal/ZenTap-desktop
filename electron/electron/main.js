import { app, BrowserWindow, ipcMain, nativeImage, shell, powerMonitor, screen, Tray, Menu } from 'electron';

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
import { getBlockerInstance } from './proxy/websiteBlockerProxy.js';
import { usageTracker, processKey } from './usage/usageTracker.js';
import { extensionBridge } from './extension/bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let isQuitting = false;
let isDev = process.env.NODE_ENV === 'development';

// Screen Time State
let dailyUsageMinutes = 0;
let totalUsageMinutes = 0;
const USAGE_FILE = path.join(app.getPath('userData'), 'daily_usage.json');

// Cache for instant loading
let cachedAppList = [];
let pkgMapCache = {};
// exe name (lowercase) -> full path, from the registry's App Paths key. This is
// how Windows itself finds Edge, Chrome, Firefox and friends, and it is the
// fallback for Start-menu entries whose own path yields no icon.
let appPathsCache = {};
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

    // Written line by line so the registry path's backslashes stay literal, and
    // fed over stdin so cmd.exe never sees the quotes.
    const appPathsPromise = new Promise((res) => {
        // One line: PowerShell reading `-Command -` from stdin executes a
        // multi-line block a line at a time and silently produces nothing.
        const key = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths';
        const script = `$ErrorActionPreference='SilentlyContinue'; $out=@{}; Get-ChildItem '${key}' | ForEach-Object { $t=(Get-ItemProperty $_.PSPath).'(default)'; if ($t) { $out[$_.PSChildName]=$t.Trim([char]34) } }; $out | ConvertTo-Json -Compress\n`;
        const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-'], { windowsHide: true });
        let out = '';
        child.stdout.on('data', d => { out += d; });
        child.on('close', () => {
            try { res(JSON.parse(out.trim() || '{}') || {}); } catch { res({}); }
        });
        child.on('error', () => res({}));
        child.stdin.write(script);
        child.stdin.end();
    });

    const [fsApps, uwpApps, appPaths] = await Promise.all([fsScanPromise, uwpScanPromise, appPathsPromise]);

    appPathsCache = {};
    for (const key in appPaths) {
        appPathsCache[key.toLowerCase().replace(/\.exe$/, '')] = appPaths[key];
    }
    
    const seen = new Set();
    const seenNames = new Set();
    cachedAppList = [];
    pkgMapCache = {};

    // Patterns to filter out non-app entries (system tools, helpers, docs, etc.)
    const JUNK_PATTERNS = [
        /uninstall/i, /readme/i, /release notes/i, /license/i, /changelog/i,
        /documentation/i, /user guide/i, /help$/i, /getting started/i,
        /^about /i, /setup$/i, /^install /i, /^repair /i, /^remove /i,
        /command prompt/i, /^cmd$/i, /powershell/i, /^run /i,
        /administrative tools/i, /control panel/i, /task manager/i,
        /device manager/i, /disk cleanup/i, /defragment/i, /system info/i,
        /event viewer/i, /resource monitor/i, /performance monitor/i,
        /component services/i, /computer management/i, /services$/i,
        /windows fax/i, /windows memory/i, /odbc data/i, /iscsicpl/i,
        /print management/i, /recovery drive/i, /system configuration/i,
        /windows defender/i, /character map/i, /magnify/i, /narrator/i,
        /on-screen keyboard/i, /accessibility/i, /ease of access/i,
        /welcome to/i, /what's new/i, /^tips$/i
    ];

    const isJunk = (name) => JUNK_PATTERNS.some(p => p.test(name));

    // Process FS Apps
    for (const a of fsApps) {
        const nameLower = a.name.toLowerCase().trim();
        if (seen.has(a.path) || seenNames.has(nameLower)) continue;
        if (isJunk(a.name)) continue;
        seen.add(a.path);
        seenNames.add(nameLower);
        
        let exeName = null;
        
        cachedAppList.push({ 
            name: a.name, 
            path: a.path, 
            exeName: exeName,
            icon: missingIconBase64 
        });
    }

    // Process UWP Apps & Update Cache for icon extraction
    for (const a of uwpApps) {
        const nameLower = a.Name.toLowerCase().trim();
        if (seen.has(a.AppID) || seenNames.has(nameLower)) continue;
        if (isJunk(a.Name)) continue;
        seen.add(a.AppID);
        seenNames.add(nameLower);
        cachedAppList.push({ 
            name: a.Name, 
            path: a.AppID, 
            exeName: a.Name + ".exe",
            icon: missingIconBase64 
        });
        if (a.InstallLocation) {
            pkgMapCache[a.AppID.split('!')[0]] = a.InstallLocation;
        }
    }

    cachedAppList.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Discovery complete. Populated ${cachedAppList.length} apps instantly.`);
}

function createWindow() {
  console.log("createWindow: Creating BrowserWindow instance...");
    if (mainWindow) return;
    mainWindow = new BrowserWindow({
      // Matches the 2135 x 1281 Figma artboard aspect so the design fills the frame.
      width: 1280,
      height: 768,
      frame: false,
    // Ordinary opaque window: Windows draws its own (small) corner rounding and
    // shadow, so the UI inside no longer has to fake the window shape.
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true 
    },
    title: "ZenTap For Windows",
    icon: path.join(__dirname, '../public/app_icon.png')
  });
  console.log("createWindow: BrowserWindow instance created.");

  mainWindow.webContents.on('did-start-loading', () => {
    console.log("webContents: did-start-loading");
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log("webContents: did-finish-load");
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log("webContents: dom-ready");
  });

  if (isDev) {
    console.log("createWindow: Loading URL http://127.0.0.1:5173 ...");
    mainWindow.loadURL('http://127.0.0.1:5173').then(() => {
        console.log("createWindow: loadURL resolved successfully");
    }).catch((err) => {
        console.error("createWindow: loadURL failed:", err);
        // Retry if Vite isn't quite ready
        setTimeout(() => {
            console.log("createWindow: Retrying loadURL...");
            mainWindow?.loadURL('http://127.0.0.1:5173');
        }, 2000);
    });
  } else {
    console.log("createWindow: Loading file...");
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.log(`webContents: did-fail-load: ${code} - ${desc}`);
    // Only report real errors in production
    if (!isDev || code !== -102) {
      console.error(`Main window failed to load: ${code} - ${desc}`);
    }
  });

  mainWindow.on('render-process-gone', (e, details) => {
    console.error(`CRITICAL: Renderer process gone! Reason: ${details.reason}, ExitCode: ${details.exitCode}`);
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      return false;
    }
    console.log('Main window is closing...');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('Main window fully closed.');
  });

  // A maximized window must not be draggable, so the renderer needs to know.
  const sendMaximizeState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximize-changed', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', sendMaximizeState);
  mainWindow.on('unmaximize', sendMaximizeState);
  mainWindow.webContents.on('did-finish-load', sendMaximizeState);

  mainWindow.setMenu(null);
}

ipcMain.on('minimize-app', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize-app', () => { 
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('close-app', () => { if (mainWindow) mainWindow.close(); });

let quitCleanupDone = false;
app.on('before-quit', (e) => {
    console.log("Cleaning up child processes before quit...");
    if (blockingProcess) { try { blockingProcess.kill(); } catch (e) {} }
    if (webBlockingProcess) { try { webBlockingProcess.kill(); } catch (e) {} }
    if (usbMonitorProcess) { try { usbMonitorProcess.kill(); } catch (e) {} }
    usageTracker.stop();
    extensionBridge.stop();

    // Make sure the system proxy is never left pointing at a proxy server
    // that's about to disappear - otherwise the user loses all internet
    // access (in every browser) until they manually clear it. Delay the
    // actual quit until this async cleanup has finished.
    if (!quitCleanupDone) {
        e.preventDefault();
        websiteBlocker.stop()
            .catch(err => console.error('[WebBlock] Error stopping proxy on quit:', err))
            .finally(() => {
                quitCleanupDone = true;
                app.quit();
            });
    }
});

const CONFIG_FILE = path.join(app.getPath('userData'), 'zentap_config.json');

/** The saved config, read synchronously; {} when there isn't one yet. */
function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (err) {
        console.error('Read config failed:', err);
    }
    return {};
}

/** The block-list keyword a blocked hostname belongs to, e.g. m.youtube.com -> youtube.com */
function matchWatchedSite(hostname) {
    const host = String(hostname || '').toLowerCase();
    const sites = (readConfig().selectedWebsites || []).map(w => w.keyword || w);
    return sites.find(k => host.includes(String(k).toLowerCase().split('.')[0])) || host;
}

ipcMain.handle('load-config', async () => {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = await readFile(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Load config failed:", e);
    }
    return {};
});

ipcMain.on('save-config', (e, configData) => {
    if (configData.selectedWebsites) usageTracker.setWatchedSites(configData.selectedWebsites);
    try {
        let existing = {};
        if (fs.existsSync(CONFIG_FILE)) {
            try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) {}
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...configData }));
    } catch (err) {
        console.error("Save config failed:", err);
    }
});

async function loadUsage() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = JSON.parse(await readFile(USAGE_FILE, 'utf8'));
            totalUsageMinutes = data.totalMinutes || 0;
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
        const data = { date: new Date().toDateString(), minutes: dailyUsageMinutes, totalMinutes: totalUsageMinutes };
        await writeFile(USAGE_FILE, JSON.stringify(data));
    } catch (e) { console.error("Save usage failed:", e); }
}

function startUsageTracking() {
    // Every 60 seconds, check if system is active
    setInterval(() => {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < 60) {
            dailyUsageMinutes += 1;
            totalUsageMinutes += 1;
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
    await websiteBlocker.healDanglingProxy();
    console.log("Calling loadUsage()...");
    await loadUsage();
    usageTracker.load();
    usageTracker.setWatchedSites(readConfig().selectedWebsites || []);
    let lastReportedMinutes = -1;
    usageTracker.onChange = () => {
        const minutes = usageTracker.todayMinutes();
        if (minutes === lastReportedMinutes) return;
        lastReportedMinutes = minutes;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('usage-updated', minutes);
        }
    };
    usageTracker.start();

    extensionBridge.start({
        getState: () => ({
            blocking: isBlocking,
            sites: (blockLists.web || []).map(w => (w.keyword || w).toString()),
        }),
        onUsage: (host, seconds) => usageTracker.recordSiteSeconds(host, seconds),
        onBlocked: (host) => {
            usageTracker.recordBlockEvent(matchWatchedSite(host));
            if (!recentlyBlockedWeb.has(host)) {
                recentlyBlockedWeb.add(host);
                showNotificationOverlay(host);
                setTimeout(() => recentlyBlockedWeb.delete(host), 4000);
            }
        },
    });
    console.log("loadUsage() completed. Calling startUsageTracking() [skipped]...");
    // startUsageTracking();
    console.log("startUsageTracking() completed. Calling discoverApps()...");
    discoveryPromise = discoverApps();
    console.log("discoverApps() returned. Calling createWindow()...");
    createWindow();
    console.log("createWindow() completed successfully.");

    // Add Tray Icon
    tray = new Tray(path.join(__dirname, '../public/app_icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show ZenTap', click: () => mainWindow && mainWindow.show() },
      { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('ZenTap');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow && mainWindow.show());

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
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
let sessionEndsAt = null;
let blockLists = { apps: [], web: [] };
let blockInterval = null;
let blockingProcess = null;
let usbMonitorProcess = null;
let webBlockingProcess = null;
const recentlyBlocked = new Set();
const recentlyBlockedWeb = new Set();

// Website blocker (user-level proxy, no admin/extension required) - kept at
// module scope so it can be stopped both from the renderer and on app quit.
const websiteBlocker = getBlockerInstance({ port: 8080 });
websiteBlocker.on('blocked', (info) => {
  console.log('[WebBlock] blocked event received:', info);
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('website-blocked', info);
    }
  } catch (err) {
    console.error('[WebBlock] Error notifying renderer of block:', err);
  }
  // A single page load fires many 'blocked' events in quick succession (the
  // main request plus every blocked subresource/retry) - without this the
  // notification overlay window gets torn down and recreated dozens of times
  // a second, which is what looked like flickering.
  try {
    if (!recentlyBlockedWeb.has(info.hostname)) {
      recentlyBlockedWeb.add(info.hostname);
      usageTracker.recordBlockEvent(matchWatchedSite(info.hostname));
      showNotificationOverlay(info.hostname);
      setTimeout(() => recentlyBlockedWeb.delete(info.hostname), 4000);
    }
  } catch (err) {
    console.error('[WebBlock] Error showing block overlay:', err);
  }
});

ipcMain.handle('get-screen-time', async () => {
    // The foreground probe is the finer-grained of the two counters.
    return Math.max(dailyUsageMinutes, usageTracker.todayMinutes());
});

ipcMain.handle('get-total-screen-time', async () => {
    return totalUsageMinutes;
});

// Real per-app / per-site usage for the statistics screens. Keys are resolved
// here because only the main process knows how an app maps to a process name.
// The renderer's copy of "is a session running" is lost on reload/restart;
// without this it can show "Zen Device" while a session is still blocking and
// leave no way to stop it.
ipcMain.handle('get-blocking-state', async () => ({
    blocking: isBlocking,
    endsAt: sessionEndsAt,
    apps: blockLists.apps || [],
    web: blockLists.web || [],
    extension: extensionBridge.connectedBrowsers(),
}));

ipcMain.handle('get-usage-stats', async () => {
    const config = readConfig();
    const apps = (config.selectedApps || []).map(a => ({
        key: resolveExeName(a),
        name: a.name,
        icon: a.icon || null,
    }));
    const sites = (config.selectedWebsites || []).map(w => ({
        key: w.keyword || w,
        name: w.keyword || w,
        icon: w.icon || null,
    }));
    return usageTracker.summary({ apps, sites });
});

ipcMain.handle('get-installed-apps', async () => {
  if (discoveryPromise) await discoveryPromise;
  return cachedAppList.filter(a => a.name && !a.name.toLowerCase().includes("uninstall"));
});

ipcMain.on('start-icon-stream', async (event) => {
    if (discoveryPromise) await discoveryPromise;
    console.log(`Streaming ${cachedAppList.length} icons...`);
    
    // Batch resolve all .lnk files using PowerShell to avoid Chromium shell.readShortcutLink crash
    const lnkPaths = cachedAppList.map(a => a.path).filter(p => p.toLowerCase().endsWith('.lnk'));
    const resolvedTargets = {};
    if (lnkPaths.length > 0) {
        const psScript = `
            $ErrorActionPreference = 'SilentlyContinue';
            $sh = New-Object -ComObject WScript.Shell;
            $lnks = @(${lnkPaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',')});
            $out = @{};
            foreach ($lnk in $lnks) {
                try {
                    $target = $sh.CreateShortcut($lnk).TargetPath;
                    if ($target) { $out[$lnk] = $target; }
                } catch {}
            }
            $out | ConvertTo-Json -Compress;
        `;
        try {
            const stdout = await new Promise((resolve) => {
                const child = spawn('powershell', ['-NoProfile', '-Command', '-']);
                let outData = '';
                child.stdout.on('data', d => outData += d);
                child.on('close', () => resolve(outData));
                child.on('error', () => resolve(''));
                child.stdin.write(psScript);
                child.stdin.end();
            });
            
            if (stdout) {
                const rawTargets = JSON.parse(stdout.trim() || '{}');
                for (const k in rawTargets) {
                    resolvedTargets[k.toLowerCase()] = rawTargets[k];
                }
                console.log(`Resolved ${Object.keys(resolvedTargets).length} LNK targets.`);
            }
        } catch (e) { console.error('LNK resolve error', e); }
    }

    // Process icons in background and push to UI
    const iconless = [];
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
                const lowerLnk = iconPath.toLowerCase();
                if (resolvedTargets[lowerLnk]) {
                    iconPath = resolvedTargets[lowerLnk];
                    // Save the resolved exe name back to the app item for blocking
                    if (iconPath.toLowerCase().endsWith('.exe')) {
                        appItem.exeName = path.basename(iconPath);
                    }
                }
            }

            // Extract Icon
            if (iconPath && (iconPath.includes('\\') || iconPath.endsWith('.exe'))) {
                const iconImg = await app.getFileIcon(iconPath, { size: 'normal' }).catch(() => null);
                if (iconImg && !iconImg.isEmpty()) icon = iconImg.toDataURL();
            }

            // The shortcut itself carries the app's icon, and it still works
            // when the target is missing (store stubs, MSI advertised links).
            if (!icon && appItem.path.toLowerCase().endsWith('.lnk') && iconPath !== appItem.path) {
                const lnkImg = await app.getFileIcon(appItem.path, { size: 'normal' }).catch(() => null);
                if (lnkImg && !lnkImg.isEmpty()) icon = lnkImg.toDataURL();
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

                            // Packages are free to ship only oddly-suffixed
                            // variants (targetsize-24_altform-unplated and
                            // friends), which is why Copilot and Quick Share
                            // came up blank. Take whatever is actually there.
                            try {
                                const logoDir = path.join(installLoc, path.dirname(logoRel));
                                const stem = path.basename(logoRel, '.png').toLowerCase();
                                const siblings = fs.readdirSync(logoDir)
                                    .filter(f => f.toLowerCase().startsWith(stem) && f.toLowerCase().endsWith('.png'))
                                    // Biggest scale first, so the drawer gets a sharp icon.
                                    .sort((a, b) => b.length - a.length);
                                logoPaths.push(...siblings.map(f => path.join(logoDir, f)));
                            } catch (e) { /* no such folder */ }

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
            // Last resort: ask the registry where Windows thinks this app
            // lives. This is what rescues entries like Microsoft Edge, whose
            // Start-menu link points at a launcher with no icon of its own.
            if (!icon) {
                const candidates = [
                    appItem.exeName,
                    APP_MAP[appItem.name],   // "Microsoft Edge" -> msedge.exe
                    appItem.name,
                    appItem.name.replace(/\s+/g, ''),
                ].filter(Boolean).map(n => n.toLowerCase().replace(/\.exe$/, ''));

                for (const candidate of candidates) {
                    const exePath = appPathsCache[candidate];
                    if (!exePath || !fs.existsSync(exePath)) continue;
                    const regImg = await app.getFileIcon(exePath, { size: 'normal' }).catch(() => null);
                    if (regImg && !regImg.isEmpty()) {
                        icon = regImg.toDataURL();
                        if (!appItem.exeName) appItem.exeName = path.basename(exePath);
                        break;
                    }
                }
            }
        } catch (e) {}

        if (icon) {
            appItem.icon = icon;
            mainWindow.webContents.send('app-icon-ready', {
                path: appItem.path,
                icon,
                exeName: appItem.exeName || null
            });
        } else {
            iconless.push(appItem.name);
        }
        
        // Extremely small delay to keep throughput high but UI responsive
        await new Promise(r => setTimeout(r, 2));
    }

    if (iconless.length) {
        console.log(`[Icons] ${iconless.length} of ${cachedAppList.length} without an icon: ${iconless.join(', ')}`);
    } else {
        console.log(`[Icons] All ${cachedAppList.length} apps have an icon.`);
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

/** The process name a selected app maps to, e.g. { name: 'Spotify' } -> 'spotify'. */
function resolveExeName(a) {
  let target = a.exeName;
  if (!target) {
    const cached = cachedAppList.find(c => c.name === a.name || c.path === a.path);
    if (cached && cached.exeName) target = cached.exeName;
  }
  if (!target) target = APP_MAP[a.name] || (a.name || '').toLowerCase().replace(/ /g, '') + '.exe';
  return processKey(target);
}

ipcMain.on('start-blocking', (e, { apps, web, endsAt }) => {
  console.log('[Blocking] START received. Apps:', apps.map(a => a.name), 'Web:', web.map(w => w.keyword || w));
  isBlocking = true;
  sessionEndsAt = endsAt || null;
  blockLists = { apps, web };
  recentlyBlocked.clear();
  
  if (blockingProcess) { try { blockingProcess.kill(); } catch(e){} }
  if (webBlockingProcess) { try { webBlockingProcess.kill(); } catch(e){} }
  if (blockInterval) { clearInterval(blockInterval); blockInterval = null; }
  
  // --- APP BLOCKING ---
  // Look up the resolved exeName from cachedAppList if not already on the app object
  const appNames = apps
    .map(a => resolveExeName(a).replace(/'/g, "''"))
    .filter(name => name.length > 0);
  console.log('[Blocking] Resolved app process names:', appNames);

  // Everything on the list is unreachable for as long as the session runs.
  usageTracker.setWatchedSites(web);
  usageTracker.setBlocking(true, [
    ...appNames,
    ...(web || []).map(w => (w.keyword || w).toString()),
  ]);

  if (appNames.length > 0) {
    const psScript = `$names = @('${appNames.join("','")}'); while($true) { $killed = Get-Process | Where-Object { $_.ProcessName -in $names }; if ($killed) { $killed | ForEach-Object { Write-Output $_.ProcessName }; $killed | Stop-Process -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 150 }`;
    try {
        blockingProcess = spawn('powershell', ['-Command', psScript]);
        blockingProcess.on('error', (err) => console.error('App block error:', err));
        blockingProcess.stdout.on('data', (data) => {
            const names = data.toString().trim().split(/\r?\n/).filter(Boolean);
            for (const name of names) {
                const trimmed = name.trim();
                if (trimmed.startsWith('DEBUG:')) continue;
                if (!recentlyBlocked.has(trimmed)) {
                    recentlyBlocked.add(trimmed);
                    usageTracker.recordBlockEvent(processKey(trimmed));
                    showNotificationOverlay(trimmed);
                    setTimeout(() => recentlyBlocked.delete(trimmed), 5000);
                }
            }
        });
    } catch (err) { console.error('App spawn error:', err); }
  }

// --- WEB BLOCKING ---
  // The extension blocks in the browser, per navigation. It is both smoother
  // and safer than the system proxy, which strands every browser on this
  // machine if ZenTap dies without cleaning up - so when an extension has
  // checked in recently, the proxy is left alone entirely.
  if (web && web.length > 0 && extensionBridge.isConnected()) {
    console.log('[WebBlock] Extension connected (' + extensionBridge.connectedBrowsers().join(', ') + ') - blocking in the browser, system proxy not touched.');
    websiteBlocker.stop().catch(err => console.error('[WebBlock] Error stopping proxy:', err));
  } else if (web && web.length > 0) {
    const domains = web.map(w => (w.keyword || w).toString().replace(/'/g, "''")).filter(k => k.length > 0);

    websiteBlocker.start(domains).then(success => {
      if (success) {
        console.log('[WebBlock] Proxy-based website blocking started successfully');
      } else {
        console.error('[WebBlock] Failed to start proxy-based blocking');
      }
    }).catch(err => {
      console.error('[WebBlock] Error starting proxy:', err);
    });
  } else {
    // No sites to block this session - make sure a stale proxy isn't left active.
    websiteBlocker.stop().catch(err => console.error('[WebBlock] Error stopping proxy:', err));
  }
});

ipcMain.on('stop-blocking', () => {
  isBlocking = false;
  sessionEndsAt = null;
  usageTracker.setBlocking(false);
  recentlyBlocked.clear();
  if (blockInterval) { clearInterval(blockInterval); blockInterval = null; }
  if (blockingProcess) { try { blockingProcess.kill(); } catch(e){} blockingProcess = null; }
  if (webBlockingProcess) { try { webBlockingProcess.kill(); } catch(e){} webBlockingProcess = null; }
  websiteBlocker.stop().catch(err => console.error('[WebBlock] Error stopping proxy:', err));
});

// --- NOTIFICATION OVERLAY ---
let notificationWindow = null;

function showNotificationOverlay(appName) {
  // Clean up the app name (remove debug prefixes, .exe, etc.)
  let cleanName = appName
      .replace(/^Blocked:\s*/i, '')
      .replace(/\s*\(restricted site\)\s*$/i, '')
      .replace(/\.exe$/i, '')
      .trim();
  
  // Capitalize first letter
  if (cleanName.length > 0) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }

  if (notificationWindow) {
    try { notificationWindow.close(); } catch(e) {}
  }
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  notificationWindow = new BrowserWindow({
    x: 0, y: 0, width, height,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, hasShadow: false, resizable: false,
    webPreferences: { 
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  notificationWindow.setIgnoreMouseEvents(true);
  
  const overlayPath = path.join(__dirname, 'notification_overlay.html');
  notificationWindow.loadFile(overlayPath, { query: { appName: cleanName } });

  setTimeout(() => { 
    if (notificationWindow) {
      try { notificationWindow.close(); } catch(e) {}
      notificationWindow = null;
    }
  }, 4000);
}

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

ipcMain.on('start-usb-monitoring', (event) => {
    if (usbMonitorProcess) return;
    console.log('[USB] Starting physical USB monitoring...');
    
    // PowerShell script to monitor USB connection via WMI polling
    const psScript = `
        $ErrorActionPreference = 'SilentlyContinue';
        $initial = Get-WmiObject Win32_PnPEntity | Where-Object { $_.DeviceID -match '^USB' } | Select-Object -ExpandProperty DeviceID
        while ($true) {
            Start-Sleep -Seconds 1
            $current = Get-WmiObject Win32_PnPEntity | Where-Object { $_.DeviceID -match '^USB' } | Select-Object -ExpandProperty DeviceID
            $diff_all = Compare-Object $initial $current
            if ($diff_all) {
                $inserted = $diff_all | Where-Object { $_.SideIndicator -eq '=>' }
                if ($inserted) {
                    Write-Host "USB_INSERTED"
                }
                $initial = $current
            }
        }
    `;
    
    usbMonitorProcess = spawn('powershell', ['-NoProfile', '-Command', psScript]);
    
    usbMonitorProcess.stdout.on('data', (data) => {
        if (data.toString().includes('USB_INSERTED')) {
            console.log('[USB] Physical USB Key Inserted!');
            if (mainWindow) mainWindow.webContents.send('usb-inserted');
        }
    });
});

ipcMain.on('stop-usb-monitoring', () => {
    if (usbMonitorProcess) {
        console.log('[USB] Stopping physical USB monitoring...');
        try { usbMonitorProcess.kill(); } catch(e){}
        usbMonitorProcess = null;
    }
});

ipcMain.handle('check-usb-present', async () => {
    return new Promise((resolve) => {
        const psScript = `
            $ErrorActionPreference = 'SilentlyContinue'
            $usbDrives = Get-WmiObject Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' -and $_.MediaType -match 'Removable' -and $_.Size -gt 0 }
            if ($usbDrives) { Write-Output "PRESENT" } else { Write-Output "NOT_PRESENT" }
        `;
        const child = spawn('powershell', ['-NoProfile', '-Command', '-']);
        let output = '';
        child.stdout.on('data', (d) => output += d.toString());
        child.on('close', () => {
            if (output.includes('PRESENT') && !output.includes('NOT_PRESENT')) {
                console.log('[USB] Zen key already plugged in.');
                resolve(true);
            } else {
                console.log('[USB] No removable USB drive detected.');
                resolve(false);
            }
        });
        child.on('error', () => resolve(false));
        child.stdin.write(psScript);
        child.stdin.end();
    });
});

