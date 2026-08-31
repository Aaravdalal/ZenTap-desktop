/**
 * ZenTap browser extension - service worker.
 *
 * Two jobs:
 *   1. While a session is running, close any tab that navigates to a site on
 *      the ZenTap block list.
 *   2. Measure how long the active tab spends on each site and report it to
 *      the desktop app, which is the only way to get real per-site time.
 *
 * Time is measured from tab/window/idle events rather than a tick, because an
 * MV3 service worker is unloaded when idle and a short timer would not survive.
 *
 * The toolbar icon is the app icon, and gains a green outline while the
 * extension can see ZenTap. There is no popup - the icon is the whole status.
 */

const APP = 'http://127.0.0.1:8791';
const POLL_ALARM = 'zentap-poll';
const POLL_MINUTES = 0.5;
const RULE_OFFSET = 1000; // dynamic rule ids live above anything static

const BROWSER = navigator.userAgent.includes('Edg/') ? 'edge'
  : navigator.userAgent.includes('Firefox') ? 'firefox'
  : 'chrome';

const ICONS = {
  idle: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  connected: { 16: 'icons/icon-connected-16.png', 32: 'icons/icon-connected-32.png', 48: 'icons/icon-connected-48.png', 128: 'icons/icon-connected-128.png' },
};

/* ------------------------------------------------------------------ state */

/** Where the current stretch of attention started: { host, since }. */
async function getFocus() {
  const { focus } = await chrome.storage.session.get('focus');
  return focus || null;
}

async function setFocus(focus) {
  await chrome.storage.session.set({ focus });
}

/** Seconds not yet reported, keyed by host. */
async function addPending(host, seconds) {
  if (!host || seconds <= 0) return;
  const { pending = {} } = await chrome.storage.local.get('pending');
  pending[host] = (pending[host] || 0) + seconds;
  await chrome.storage.local.set({ pending });
}

/** The sites to close tabs for, and whether a session is actually running. */
async function getRules() {
  const { blocking = false, sites = [] } = await chrome.storage.session.get(['blocking', 'sites']);
  return { blocking, sites };
}

/* ------------------------------------------------------------------ hosts */

function hostOf(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** The block-list entry a host belongs to, matching subdomains too. */
function matchSite(host, sites) {
  if (!host) return null;
  return sites.find((site) => {
    const clean = String(site).toLowerCase().replace(/^www\./, '');
    return host === clean || host.endsWith(`.${clean}`);
  }) || null;
}

/* ------------------------------------------------------- time measurement */

/** Close the open stretch of attention and bank it. */
async function closeStretch() {
  const focus = await getFocus();
  if (!focus) return;
  const seconds = Math.round((Date.now() - focus.since) / 1000);
  // Ignore flicks through tabs, and anything absurd (a machine that slept).
  if (seconds >= 2 && seconds < 3600) await addPending(focus.host, seconds);
  await setFocus(null);
}

/** Start counting against whatever is in front of the user right now. */
async function openStretch() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const host = tab ? hostOf(tab.url) : null;
  await setFocus(host ? { host, since: Date.now() } : null);
}

async function retarget() {
  await closeStretch();
  await openStretch();
}

chrome.tabs.onActivated.addListener(retarget);
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url && tab.active) retarget();
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // Attention left the browser entirely - the desktop app counts that instead.
  if (windowId === chrome.windows.WINDOW_ID_NONE) await closeStretch();
  else await retarget();
});
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'active') await openStretch();
  else await closeStretch();
});

/* --------------------------------------------------------------- blocking */

/** Shut the tab before the page has a chance to draw anything. */
async function closeIfBlocked(tabId, url, frameId) {
  if (frameId !== 0 || tabId < 0) return;
  const { blocking, sites } = await getRules();
  if (!blocking) return;

  const host = hostOf(url);
  const site = matchSite(host, sites);
  if (!site) return;

  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // The tab is already gone.
  }

  fetch(`${APP}/v1/blocked`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browser: BROWSER, host: site }),
  }).catch(() => { /* the app is closed */ });
}

chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, url, frameId }) => {
  closeIfBlocked(tabId, url, frameId);
});
// Single-page apps move between sites without a navigation.
chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url, frameId }) => {
  closeIfBlocked(tabId, url, frameId);
});

/**
 * Belt and braces: stop the request itself as well, so nothing loads in the
 * moment before the tab closes, and so a redirect can't slip past.
 */
async function applyRules(sites, blocking) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const addRules = !blocking ? [] : sites.map((site, i) => ({
    id: RULE_OFFSET + i,
    priority: 1,
    action: { type: 'block' },
    condition: {
      // Matches the domain and every subdomain of it.
      requestDomains: [String(site).replace(/^www\./, '')],
      resourceTypes: ['main_frame'],
    },
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (err) {
    console.warn('[ZenTap] Could not update rules:', err);
  }
}

/* ------------------------------------------------------------------ icon */

async function setConnected(connected) {
  await chrome.storage.session.set({ connected });
  try {
    await chrome.action.setIcon({ path: connected ? ICONS.connected : ICONS.idle });
    await chrome.action.setTitle({ title: connected ? 'ZenTap - connected' : 'ZenTap - app not running' });
  } catch (err) {
    console.warn('[ZenTap] Could not update the toolbar icon:', err);
  }
}

/* ------------------------------------------------------------------ sync */

async function sync() {
  // Bank the time so far, so a long stretch still reports while it continues.
  const focus = await getFocus();
  if (focus) {
    await closeStretch();
    await setFocus({ host: focus.host, since: Date.now() });
  }

  const { pending = {} } = await chrome.storage.local.get('pending');
  const entries = Object.entries(pending).map(([host, seconds]) => ({ host, seconds }));

  let state;
  try {
    const res = await fetch(`${APP}/v1/state?browser=${BROWSER}`);
    state = await res.json();
  } catch {
    // ZenTap isn't running: keep the time for later and stop blocking, so a
    // closed app can never start closing tabs on its own.
    await chrome.storage.session.set({ blocking: false, sites: [] });
    await setConnected(false);
    await applyRules([], false);
    return;
  }

  await chrome.storage.session.set({ blocking: !!state.blocking, sites: state.sites || [] });
  await setConnected(true);

  if (entries.length) {
    try {
      await fetch(`${APP}/v1/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browser: BROWSER, entries }),
      });
      await chrome.storage.local.set({ pending: {} });
    } catch {
      // Keep them; the next sync will try again.
    }
  }

  await applyRules(state.sites || [], state.blocking);
}

chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) sync();
});

chrome.runtime.onStartup.addListener(sync);
chrome.runtime.onInstalled.addListener(sync);

sync();
