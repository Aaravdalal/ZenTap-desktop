/**
 * Active Window Detection - Approach 2: ScreenZen Overlay
 * Uses Windows APIs via koffi (no compilation needed) to detect active window
 * Monitors browser windows for blocked domains
 */

const koffi = require('koffi');
const { EventEmitter } = require('events');

// Load Windows libraries
const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');
const psapi = koffi.load('psapi.dll');

// Define Windows types
const HWND = koffi.pointer(koffi.opaque('HWND'));
const DWORD = koffi.alias('DWORD', 'uint32');
const LPWSTR = koffi.pointer(koffi.alias('WCHAR', 'uint16'));
const LPDWORD = koffi.pointer(DWORD);
const HANDLE = koffi.pointer(koffi.opaque('HANDLE'));
const BOOL = koffi.alias('BOOL', 'int32');
const UINT = koffi.alias('UINT', 'uint32');
const LPARAM = koffi.alias('LPARAM', 'intptr');
const WPARAM = koffi.alias('WPARAM', 'uintptr');
const LRESULT = koffi.alias('LRESULT', 'intptr');

// Window enumeration callback
const WNDENUMPROC = koffi.proto('BOOL', [HWND, LPARAM]);

// User32 functions
const GetForegroundWindow = user32.func('GetForegroundWindow', HWND, []);
const GetWindowTextW = user32.func('GetWindowTextW', 'int', [HWND, LPWSTR, 'int']);
const GetWindowTextLengthW = user32.func('GetWindowTextLengthW', 'int', [HWND]);
const GetWindowThreadProcessId = user32.func('GetWindowThreadProcessId', DWORD, [HWND, LPDWORD]);
const IsWindowVisible = user32.func('IsWindowVisible', BOOL, [HWND]);
const EnumWindows = user32.func('EnumWindows', BOOL, [WNDENUMPROC, LPARAM]);
const GetClassNameW = user32.func('GetClassNameW', 'int', [HWND, LPWSTR, 'int']);

// Kernel32 functions
const OpenProcess = kernel32.func('OpenProcess', HANDLE, [DWORD, BOOL, DWORD]);
const CloseHandle = kernel32.func('CloseHandle', BOOL, [HANDLE]);
const GetModuleFileNameExW = psapi.func('GetModuleFileNameExW', DWORD, [HANDLE, HANDLE, LPWSTR, DWORD]);

// Process access rights
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const MAX_PATH = 260;

/**
 * Get window title from HWND
 */
function getWindowTitle(hwnd) {
  try {
    const length = GetWindowTextLengthW(hwnd);
    if (length === 0) return '';
    
    const buffer = koffi.alloc((length + 1) * 2); // WCHAR = 2 bytes
    GetWindowTextW(hwnd, buffer, length + 1);
    return koffi.decode(buffer, 'utf16');
  } catch (e) {
    return '';
  }
}

/**
 * Get window class name from HWND
 */
function getWindowClassName(hwnd) {
  try {
    const buffer = koffi.alloc(256 * 2);
    GetClassNameW(hwnd, buffer, 256);
    return koffi.decode(buffer, 'utf16');
  } catch (e) {
    return '';
  }
}

/**
 * Get process executable name from HWND
 */
function getProcessExeName(hwnd) {
  try {
    const pidBuffer = koffi.alloc(4);
    GetWindowThreadProcessId(hwnd, pidBuffer);
    const pid = koffi.decode(pidBuffer, 'uint32');
    
    if (pid === 0) return '';
    
    const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if (!hProcess || hProcess.isNull()) return '';
    
    const buffer = koffi.alloc(MAX_PATH * 2);
    const result = GetModuleFileNameExW(hProcess, koffi.NULL, buffer, MAX_PATH);
    CloseHandle(hProcess);
    
    if (result === 0) return '';
    
    const fullPath = koffi.decode(buffer, 'utf16');
    return fullPath.split('\\').pop() || '';
  } catch (e) {
    return '';
  }
}

/**
 * Check if a window is a browser window
 */
function isBrowserWindow(hwnd) {
  const exeName = getProcessExeName(hwnd).toLowerCase();
  const browserExes = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe', 'vivaldi.exe'];
  return browserExes.includes(exeName);
}

/**
 * Get active window info
 */
function getActiveWindowInfo() {
  const hwnd = GetForegroundWindow();
  if (!hwnd || hwnd.isNull()) return null;
  
  if (!IsWindowVisible(hwnd)) return null;
  
  const title = getWindowTitle(hwnd);
  const className = getWindowClassName(hwnd);
  const exeName = getProcessExeName(hwnd);
  const isBrowser = isBrowserWindow(hwnd);
  
  return {
    hwnd: hwnd.toString(),
    title,
    className,
    exeName,
    isBrowser,
    timestamp: Date.now()
  };
}

/**
 * Active Window Monitor Class
 */
class ActiveWindowMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pollInterval = options.pollInterval || 500; // ms
    this.blockedKeywords = new Set(options.blockedKeywords || []);
    this.lastWindowInfo = null;
    this.intervalId = null;
    this.isRunning = false;
    
    // Browser process names to watch
    this.browserProcesses = new Set([
      'chrome.exe', 'msedge.exe', 'firefox.exe', 
      'brave.exe', 'opera.exe', 'vivaldi.exe'
    ]);
  }

  /**
   * Add blocked keyword/domain
   */
  addBlockedKeyword(keyword) {
    this.blockedKeywords.add(keyword.toLowerCase());
  }

  /**
   * Remove blocked keyword
   */
  removeBlockedKeyword(keyword) {
    this.blockedKeywords.delete(keyword.toLowerCase());
  }

  /**
   * Set blocked keywords list
   */
  setBlockedKeywords(keywords) {
    this.blockedKeywords.clear();
    keywords.forEach(k => this.addBlockedKeyword(k));
  }

  /**
   * Check if window title/URL contains blocked keyword
   */
  checkForBlockedContent(windowInfo) {
    if (!windowInfo || !windowInfo.isBrowser) return null;
    
    const title = windowInfo.title.toLowerCase();
    
    for (const keyword of this.blockedKeywords) {
      if (title.includes(keyword.toLowerCase())) {
        return {
          keyword,
          title: windowInfo.title,
          exeName: windowInfo.exeName,
          hwnd: windowInfo.hwnd
        };
      }
    }
    return null;
  }

  /**
   * Poll for active window changes
   */
  poll() {
    const windowInfo = getActiveWindowInfo();
    
    // Check if window changed
    if (windowInfo && this.lastWindowInfo) {
      if (windowInfo.hwnd !== this.lastWindowInfo.hwnd) {
        this.emit('window-changed', windowInfo, this.lastWindowInfo);
      }
    }
    
    // Check for blocked content
    if (windowInfo) {
      const match = this.checkForBlockedContent(windowInfo);
      if (match) {
        this.emit('blocked-detected', match, windowInfo);
      }
    }
    
    this.lastWindowInfo = windowInfo;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.poll(); // Initial check
    this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    console.log('[WindowMonitor] Started monitoring active windows');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[WindowMonitor] Stopped monitoring');
  }

  /**
   * Get current active window info
   */
  getCurrentWindow() {
    return getActiveWindowInfo();
  }

  /**
   * Get all visible browser windows
   */
  getAllBrowserWindows() {
    const windows = [];
    
    const callback = koffi.register((hwnd, lParam) => {
      if (IsWindowVisible(hwnd)) {
        const title = getWindowTitle(hwnd);
        const exeName = getProcessExeName(hwnd);
        if (this.browserProcesses.has(exeName.toLowerCase()) && title) {
          windows.push({ hwnd: hwnd.toString(), title, exeName });
        }
      }
      return true; // Continue enumeration
    }, WNDENUMPROC);
    
    EnumWindows(callback, 0);
    koffi.unregister(callback);
    
    return windows;
  }
}

module.exports = {
  ActiveWindowMonitor,
  getActiveWindowInfo,
  getWindowTitle,
  getProcessExeName,
  isBrowserWindow
};