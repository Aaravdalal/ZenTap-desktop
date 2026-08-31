/**
 * Local bridge between ZenTap and the browser extension.
 *
 * A tiny HTTP server on 127.0.0.1 that the extension polls for the block list
 * and posts per-site time back to. When an extension has checked in recently,
 * website blocking is handled in the browser and the system-proxy path is left
 * alone - which is both smoother and removes the failure mode where a crash
 * leaves the machine pointing at a proxy that is no longer running.
 *
 * The server binds to loopback only and ignores requests that don't come from
 * an extension origin. The data it carries (a block list, per-site seconds) is
 * the same data already on disk in this user's profile.
 */
import http from 'http';

export const BRIDGE_PORT = 8791;

/** How long after a check-in the extension still counts as connected. */
const CONNECTED_WINDOW_MS = 90_000;

class ExtensionBridge {
  constructor() {
    this.server = null;
    this.lastSeen = 0;
    this.clients = new Map(); // browser id -> last seen
    this.getState = () => ({ blocking: false, sites: [] });
    this.onUsage = () => {};
    this.onBlocked = () => {};
  }

  /**
   * @param {object} hooks
   * @param {() => {blocking: boolean, sites: string[]}} hooks.getState
   * @param {(host: string, seconds: number) => void} hooks.onUsage
   * @param {(host: string) => void} hooks.onBlocked
   */
  start(hooks = {}) {
    Object.assign(this, hooks);
    if (this.server) return;

    this.server = http.createServer((req, res) => this.handle(req, res));
    this.server.on('error', (err) => {
      console.error('[Bridge] Could not listen on', BRIDGE_PORT, '-', err.message);
      this.server = null;
    });
    this.server.listen(BRIDGE_PORT, '127.0.0.1', () => {
      console.log(`[Bridge] Listening on http://127.0.0.1:${BRIDGE_PORT}`);
    });
  }

  stop() {
    if (this.server) {
      try { this.server.close(); } catch (err) { /* already closing */ }
      this.server = null;
    }
  }

  /** True while a browser extension is actively talking to us. */
  isConnected() {
    return Date.now() - this.lastSeen < CONNECTED_WINDOW_MS;
  }

  /** Browsers that have checked in recently, for the settings screen. */
  connectedBrowsers() {
    const now = Date.now();
    return [...this.clients.entries()]
      .filter(([, seen]) => now - seen < CONNECTED_WINDOW_MS)
      .map(([id]) => id);
  }

  handle(req, res) {
    const origin = req.headers.origin || '';
    const send = (code, body) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'OPTIONS') return send(204, {});

    // Only the extension is meant to reach this; a page in a normal tab has an
    // http(s) origin and is turned away.
    if (origin && !origin.startsWith('chrome-extension://') && !origin.startsWith('moz-extension://')) {
      return send(403, { error: 'forbidden' });
    }

    const url = new URL(req.url, `http://127.0.0.1:${BRIDGE_PORT}`);

    if (req.method === 'GET' && url.pathname === '/v1/state') {
      this.touch(url.searchParams.get('browser'));
      const state = this.getState();
      return send(200, { ok: true, ...state });
    }

    if (req.method === 'POST' && (url.pathname === '/v1/usage' || url.pathname === '/v1/blocked')) {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 64 * 1024) req.destroy();
      });
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch { return send(400, { error: 'bad json' }); }
        this.touch(payload.browser);

        if (url.pathname === '/v1/usage') {
          for (const entry of payload.entries || []) {
            const seconds = Number(entry?.seconds) || 0;
            if (entry?.host && seconds > 0) this.onUsage(String(entry.host), Math.round(seconds));
          }
        } else if (payload.host) {
          this.onBlocked(String(payload.host));
        }
        return send(200, { ok: true });
      });
      return undefined;
    }

    return send(404, { error: 'not found' });
  }

  touch(browser) {
    this.lastSeen = Date.now();
    this.clients.set(browser || 'browser', this.lastSeen);
  }
}

export const extensionBridge = new ExtensionBridge();
