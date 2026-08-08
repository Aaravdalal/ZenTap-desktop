/**
 * Internal HTTP/HTTPS Proxy Server for Website Blocking
 * Runs in Electron Main Process - No Admin Required
 * Intercepts HTTP/CONNECT requests and blocks specified domains
 */

const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');
const { EventEmitter } = require('events');

class ProxyServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8080;
    this.blockedDomains = new Set(options.blockedDomains || []);
    this.server = null;
    this.isRunning = false;
    
    // Delay page configuration
    this.delaySeconds = options.delaySeconds || 5;
    this.delayPagePath = options.delayPagePath || null;
  }

  /**
   * Add domain to block list
   */
  addBlockedDomain(domain) {
    const normalized = this.normalizeDomain(domain);
    this.blockedDomains.add(normalized);
    console.log(`[Proxy] Added blocked domain: ${normalized}`);
  }

  /**
   * Remove domain from block list
   */
  removeBlockedDomain(domain) {
    const normalized = this.normalizeDomain(domain);
    this.blockedDomains.delete(normalized);
    console.log(`[Proxy] Removed blocked domain: ${normalized}`);
  }

  /**
   * Update blocked domains list
   */
  setBlockedDomains(domains) {
    this.blockedDomains.clear();
    domains.forEach(d => this.addBlockedDomain(d));
  }

  /**
   * Normalize domain for comparison
   */
  normalizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }

  /**
   * Check if a hostname should be blocked
   */
  isBlocked(hostname) {
    const normalized = this.normalizeDomain(hostname);
    for (const blocked of this.blockedDomains) {
      if (normalized === blocked || normalized.endsWith('.' + blocked)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Start the proxy server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.on('connect', (req, clientSocket, head) => this.handleConnect(req, clientSocket, head));
      this.server.on('error', (err) => this.handleError(err));
      
      this.server.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true;
        console.log(`[Proxy] Server listening on 127.0.0.1:${this.port}`);
        resolve();
      });
      
      this.server.on('listening', () => {});
    });
  }

  /**
   * Stop the proxy server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          console.log('[Proxy] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle regular HTTP requests
   */
  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const hostname = url.hostname.toLowerCase();
    
    console.log(`[Proxy] HTTP Request: ${req.method} ${hostname}${url.pathname}`);
    
    if (this.isBlocked(hostname)) {
      this.serveDelayPage(res, hostname);
      this.emit('blocked', { hostname, url: req.url, type: 'HTTP' });
      return;
    }
    
    // Forward request
    this.forwardRequest(req, res);
  }

  /**
   * Handle HTTPS CONNECT tunneling
   */
  handleConnect(req, clientSocket, head) {
    const { hostname, port } = this.parseHostPort(req.url);
    const hostPort = `${hostname}:${port}`;
    
    console.log(`[Proxy] CONNECT Request: ${hostPort}`);
    
    if (this.isBlocked(hostname)) {
      // Send 200 Connection Established then serve delay page
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      
      // Create a fake HTTPS response with delay page
      this.serveDelayPageToSocket(clientSocket, hostname);
      this.emit('blocked', { hostname, url: hostPort, type: 'HTTPS' });
      return;
    }
    
    // Tunnel the connection
    this.tunnelConnection(req, clientSocket, head, hostname, port);
  }

  /**
   * Parse host:port from CONNECT request
   */
  parseHostPort(url) {
    const [host, port] = url.split(':');
    return { hostname: host, port: parseInt(port) || 443 };
  }

  /**
   * Serve delay page to HTTP response
   */
  serveDelayPage(res, hostname) {
    const html = this.generateDelayPage(hostname);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(html);
  }

  /**
   * Serve delay page to raw socket (for HTTPS)
   */
  serveDelayPageToSocket(socket, hostname) {
    const html = this.generateDelayPage(hostname);
    const response = 
      'HTTP/1.1 200 OK\r\n' +
      'Content-Type: text/html; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(html)}\r\n` +
      'Connection: close\r\n' +
      'Cache-Control: no-cache, no-store, must-revalidate\r\n' +
      'Pragma: no-cache\r\n' +
      'Expires: 0\r\n' +
      '\r\n' +
      html;
    
    socket.write(response);
    socket.end();
  }

  /**
   * Generate delay page HTML
   */
  generateDelayPage(hostname) {
    const delayMs = this.delaySeconds * 1000;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZenTap - Stay Focused</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 40px;
            max-width: 400px;
        }
        .icon { font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .domain { font-size: 18px; color: #a0a0b0; margin-bottom: 30px; font-family: monospace; }
        .timer { font-size: 48px; font-weight: 300; font-variant-numeric: tabular-nums; margin-bottom: 20px; }
        .message { font-size: 14px; color: #888; line-height: 1.6; }
        .progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 20px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #ff6b6b, #ee5a24); border-radius: 2px; width: 0%; transition: width 0.1s linear; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🧘</div>
        <h1>Stay Focused</h1>
        <div class="domain">${this.escapeHtml(hostname)}</div>
        <div class="timer" id="timer">${this.delaySeconds}</div>
        <div class="message">This site is blocked during your focus session.<br>You can continue in <span id="countdown">${this.delaySeconds}</span> seconds.</div>
        <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
    </div>
    <script>
        const delaySeconds = ${this.delaySeconds};
        const timerEl = document.getElementById('timer');
        const countdownEl = document.getElementById('countdown');
        const progressEl = document.getElementById('progress');
        let remaining = delaySeconds;
        
        const interval = setInterval(() => {
            remaining--;
            timerEl.textContent = remaining;
            countdownEl.textContent = remaining;
            progressEl.style.width = ((delaySeconds - remaining) / delaySeconds * 100) + '%';
            
            if (remaining <= 0) {
                clearInterval(interval);
                window.location.reload();
            }
        }, 1000);
    </script>
</body>
</html>`;
  }

  /**
   * Escape HTML for safe injection
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Forward HTTP request to destination
   */
  forwardRequest(req, res) {
    const options = {
      hostname: req.headers.host.split(':')[0],
      port: req.headers.host.split(':')[1] || 80,
      path: req.url,
      method: req.method,
      headers: { ...req.headers }
    };
    
    // Remove proxy-specific headers
    delete options.headers['proxy-connection'];
    delete options.headers['proxy-authorization'];
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('[Proxy] Forward error:', err.message);
      res.writeHead(502);
      res.end('Proxy Error');
    });
    
    req.pipe(proxyReq);
  }

  /**
   * Tunnel HTTPS connection
   */
  tunnelConnection(req, clientSocket, head, hostname, port) {
    const serverSocket = net.connect(port, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });
    
    serverSocket.on('error', (err) => {
      console.error('[Proxy] Tunnel error:', err.message);
      clientSocket.end();
    });
    
    clientSocket.on('error', (err) => {
      serverSocket.end();
    });
  }

  /**
   * Handle server errors
   */
  handleError(err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Proxy] Port ${this.port} already in use`);
    } else {
      console.error('[Proxy] Server error:', err);
    }
    this.emit('error', err);
  }
}

module.exports = { ProxyServer };