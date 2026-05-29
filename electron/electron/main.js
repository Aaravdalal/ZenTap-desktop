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
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true 
    },
    title: "ZenTap For Windows",
    icon: path.join(__dirname, '../public/z_icon.png')
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

  mainWindow.on('close', () => {
    console.log('Main window is closing...');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('Main window fully closed.');
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
    console.log("Calling loadUsage()...");
    await loadUsage();
    console.log("loadUsage() completed. Calling startUsageTracking() [skipped]...");
    // startUsageTracking();
    console.log("startUsageTracking() completed. Calling discoverApps()...");
    discoveryPromise = discoverApps();
    console.log("discoverApps() returned. Calling createWindow()...");
    createWindow();
    console.log("createWindow() completed successfully.");

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
                }
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
      const keywords = web.map(w => {
          let k = (w.keyword || w).toString().split('.')[0].replace(/'/g, "''");
          return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
      }).filter(k => k.length > 0);
      
      const pattern = keywords.join('|');

    if (pattern.length > 0) {
      const webScript = "[Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; " +
        "[Reflection.Assembly]::LoadWithPartialName('UIAutomationClient') | Out-Null; " +
        "Add-Type -TypeDefinition @' " +
        "using System; " +
        "using System.Runtime.InteropServices; " +
        "using System.Text; " +
        "public class WinApi { " +
        "  [DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam); " +
        "  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); " +
        "  [DllImport(\"user32.dll\")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount); " +
        "  [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); " +
        "  [DllImport(\"user32.dll\")] public static extern void GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); " +
        "} " +
        "'@; " +
        "while($true) { " +
        "  Write-Output \"DEBUG: HEARTBEAT - SCANNING\"; " +
        "  [WinApi]::EnumWindows({ " +
        "    param($hWnd, $lParam) " +
        "    $sb = New-Object System.Text.StringBuilder 256; " +
        "    if ([WinApi]::GetWindowText($hWnd, $sb, $sb.Capacity) -gt 0) { " +
        "      $title = $sb.ToString(); " +
        "      $matched = $false; " +
        "      if ($title -match '" + pattern + "') { $matched = $true; Write-Output \"DEBUG: Match Title: $title\"; } " +
        "      if (-not $matched) { " +
        "        try { " +
        "          $element = [System.Windows.Automation.AutomationElement]::FromHandle($hWnd); " +
        "          if ($element) { " +
        "            $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.AutomationControlType]::Edit); " +
        "            $bar = $element.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition); " +
        "            if ($bar) { " +
        "              $url = $bar.GetCurrentPropertyValue([System.Windows.Automation.ValuePattern]::ValueProperty); " +
        "              if ($url -match '" + pattern + "') { $matched = $true; Write-Output \"DEBUG: Match URL: $url\"; } " +
        "            } " +
        "          } " +
        "        } catch {} " +
        "      } " +
        "      if ($matched) { " +
        "        [WinApi]::SetForegroundWindow($hWnd) | Out-Null; " +
        "        Start-Sleep -Milliseconds 250; " +
        "        [System.Windows.Forms.SendKeys]::SendWait('^{w}'); " +
        "        Write-Output \"Blocked: $title\"; " +
        "      } " +
        "    } " +
        "    return $true; " +
        "  }, 0) | Out-Null; " +
        "  Start-Sleep -Milliseconds 400 " +
        "}";
 
       try {
           console.log('[WebBlock] Spawning PowerShell with pattern:', pattern);
           webBlockingProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', webScript]);
           
           webBlockingProcess.stdout.on('data', (data) => {
               console.log('[WebBlock STDOUT]:', data.toString().trim());
               const names = data.toString().trim().split(/\r?\n/).filter(Boolean);
               for (const name of names) {
                   const trimmed = name.trim();
                   if (!recentlyBlocked.has(trimmed) && mainWindow) {
                       recentlyBlocked.add(trimmed);
                       mainWindow.webContents.send('app-blocked', trimmed + ' (restricted site)');
                       setTimeout(() => recentlyBlocked.delete(trimmed), 5000);
                   }
               }
           });

           webBlockingProcess.stderr.on('data', (data) => {
               console.error('[WebBlock STDERR]:', data.toString().trim());
           });

           webBlockingProcess.on('exit', (code) => {
               console.log('[WebBlock] Process exited with code:', code);
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
