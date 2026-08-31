/**
 * Per-app / per-site usage tracking.
 *
 * A single long-lived PowerShell child reports the foreground window's process
 * name and title on a fixed tick (the same pattern the app blocker and the USB
 * monitor already use, so no native module is needed). Each tick that the
 * machine is not idle credits the tick length to that process, and - when the
 * foreground window is a browser - to any watched site whose name appears in
 * the window title.
 *
 * Browser titles are the only URL signal available without a browser
 * extension, so site numbers are approximate: they cover watched keywords that
 * show up in the tab title. See getSiteAccuracyNote().
 */
import { app, powerMonitor } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const TICK_SECONDS = 5;
const IDLE_LIMIT_SECONDS = 60;
const KEEP_DAYS = 30;

const BROWSERS = new Set(['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'arc', 'zen']);

const PS_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class ZenTapFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$parentId = [int]$args[0]
while ($true) {
  # Never outlive ZenTap, even if it was force-killed.
  if ($parentId -gt 0 -and -not (Get-Process -Id $parentId -ErrorAction SilentlyContinue)) { break }
  $hwnd = [ZenTapFg]::GetForegroundWindow()
  $title = ''
  $name = ''
  if ($hwnd -ne [IntPtr]::Zero) {
    $sb = New-Object System.Text.StringBuilder 1024
    [void][ZenTapFg]::GetWindowText($hwnd, $sb, 1024)
    $title = $sb.ToString()
    $procId = 0
    [void][ZenTapFg]::GetWindowThreadProcessId($hwnd, [ref]$procId)
    if ($procId -ne 0) {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($proc) { $name = $proc.ProcessName }
    }
  }
  Write-Output ("$name|$title")
  Start-Sleep -Seconds ${TICK_SECONDS}
}
`;

/** "YYYY-MM-DD" in local time, which is how a user thinks about "today". */
function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday-first list of the seven day keys in the week containing `date`. */
export function weekKeys(date = new Date()) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKey(d);
  });
}

/** "youtube.com" / "https://youtube.com/feed" -> "youtube" */
export function siteToken(keyword) {
  return String(keyword || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('.')[0]
    .trim();
}

/** "C:\\...\\Chrome.exe" / "Google Chrome" -> "chrome" */
export function processKey(name) {
  return String(name || '')
    .toLowerCase()
    .split(/[\\/]/)
    .pop()
    .replace(/\.exe$/, '')
    .trim();
}

class UsageTracker {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'zentap_usage.json');
    this.data = { days: {} };
    this.child = null;
    this.watchedSites = [];
    this.blockedKeys = [];
    this.isBlocking = false;
    this.saveTimer = null;
    this.onChange = null;
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        if (parsed && typeof parsed === 'object' && parsed.days) this.data = parsed;
      }
    } catch (err) {
      console.error('[Usage] Load failed:', err);
    }
    this.prune();
  }

  prune() {
    const keys = Object.keys(this.data.days).sort();
    while (keys.length > KEEP_DAYS) delete this.data.days[keys.shift()];
  }

  save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.data));
    } catch (err) {
      console.error('[Usage] Save failed:', err);
    }
  }

  /** Batches writes: the tracker touches the file on every tick otherwise. */
  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 10000);
  }

  today() {
    const key = dayKey();
    if (!this.data.days[key]) {
      this.data.days[key] = { apps: {}, sites: {}, blocks: {}, blocked: {}, total: 0 };
      this.prune();
    }
    const day = this.data.days[key];
    // Older files predate some of these buckets.
    day.apps ??= {};
    day.sites ??= {};
    day.blocks ??= {};
    day.blocked ??= {};
    day.total ??= 0;
    return day;
  }

  start() {
    if (this.child) return;
    const scriptPath = path.join(app.getPath('userData'), 'zentap_usage_probe.ps1');
    try {
      fs.writeFileSync(scriptPath, PS_SCRIPT, 'utf8');
      this.child = spawn('powershell', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
        String(process.pid),
      ], { windowsHide: true });
    } catch (err) {
      console.error('[Usage] Could not start the foreground probe:', err);
      this.child = null;
      return;
    }

    let buffer = '';
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) this.tick(line);
      }
    });
    this.child.on('error', (err) => console.error('[Usage] Probe error:', err));
    this.child.on('exit', (code) => {
      console.log('[Usage] Probe exited with', code);
      this.child = null;
    });
    console.log('[Usage] Foreground probe started');
  }

  stop() {
    if (this.child) {
      try { this.child.kill(); } catch (err) { /* already gone */ }
      this.child = null;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.save();
  }

  /** One probe line: "<processName>|<window title>". */
  tick(line) {
    const sep = line.indexOf('|');
    const proc = processKey(sep === -1 ? line : line.slice(0, sep));
    const title = (sep === -1 ? '' : line.slice(sep + 1)).toLowerCase();

    // Time in front of an idle machine is not usage.
    if (powerMonitor.getSystemIdleTime() >= IDLE_LIMIT_SECONDS) return;

    const day = this.today();

    if (proc) {
      day.apps[proc] = (day.apps[proc] || 0) + TICK_SECONDS;
      day.total += TICK_SECONDS;
    }

    if (proc && BROWSERS.has(proc) && title) {
      for (const site of this.watchedSites) {
        const token = siteToken(site);
        if (token && title.includes(token)) {
          day.sites[site] = (day.sites[site] || 0) + TICK_SECONDS;
        }
      }
    }

    // A running session keeps everything on the block list unreachable, so the
    // whole tick counts as time blocked for each of those items.
    if (this.isBlocking) {
      for (const key of this.blockedKeys) {
        day.blocked[key] = (day.blocked[key] || 0) + TICK_SECONDS;
      }
    }

    this.scheduleSave();
    this.onChange?.();
  }

  /** Sites worth matching against browser titles (the user's block list). */
  setWatchedSites(sites) {
    this.watchedSites = (sites || [])
      .map((s) => (typeof s === 'string' ? s : s?.keyword))
      .filter(Boolean);
  }

  /** Keys (process names and site keywords) currently held behind a session. */
  setBlocking(active, keys = []) {
    this.isBlocking = active;
    this.blockedKeys = active ? keys.filter(Boolean) : [];
  }

  /**
   * Exact per-site time from the browser extension. A real hostname is filed
   * under the block-list keyword it belongs to, so extension time and
   * title-matched time land in the same bucket.
   */
  recordSiteSeconds(host, seconds) {
    if (!host || !(seconds > 0)) return;
    const clean = String(host).toLowerCase().replace(/^www\./, '');
    const token = siteToken(clean);
    const watched = this.watchedSites.find((s) => siteToken(s) === token);
    const day = this.today();
    const key = watched || clean;
    day.sites[key] = (day.sites[key] || 0) + seconds;
    this.scheduleSave();
    this.onChange?.();
  }

  /** One "you were stopped from opening this" event. */
  recordBlockEvent(key) {
    if (!key) return;
    const day = this.today();
    day.blocks[key] = (day.blocks[key] || 0) + 1;
    this.scheduleSave();
    this.onChange?.();
  }

  /** Active minutes so far today - what the Home and Profile screens show. */
  todayMinutes() {
    return Math.round((this.dayFor(dayKey()).total || 0) / 60);
  }

  dayFor(key) {
    return this.data.days[key] || { apps: {}, sites: {}, blocks: {}, blocked: {}, total: 0 };
  }

  /**
   * Everything the statistics screens need, for the current week.
   * `apps` / `sites` are the caller's block lists, already keyed.
   */
  summary({ apps = [], sites = [] } = {}) {
    const keys = weekKeys();
    const days = keys.map((k) => this.dayFor(k));

    const series = (bucket, key) => days.map((d) => d[bucket]?.[key] || 0);
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    const build = (entries, bucket) =>
      entries.map(({ key, name, icon }) => {
        const daily = series(bucket, key);
        const blockedDaily = series('blocked', key);
        return {
          key,
          name,
          icon,
          daily,
          seconds: daily[(new Date().getDay() + 6) % 7],
          weekSeconds: sum(daily),
          blockedSeconds: series('blocked', key)[(new Date().getDay() + 6) % 7],
          blockedWeekSeconds: sum(blockedDaily),
          blockEvents: sum(series('blocks', key)),
        };
      });

    return {
      days: keys,
      weekly: days.map((d) => Math.round((d.total || 0) / 60)),
      todayTotal: days[(new Date().getDay() + 6) % 7]?.total || 0,
      apps: build(apps, 'apps'),
      sites: build(sites, 'sites'),
      siteAccuracy: getSiteAccuracyNote(),
    };
  }
}

export function getSiteAccuracyNote() {
  return 'Site time is read from browser window titles, so it only covers sites on your block list.';
}

export const usageTracker = new UsageTracker();
