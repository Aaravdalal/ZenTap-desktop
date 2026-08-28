/**
 * Internal HTTP/HTTPS Proxy Server for Website Blocking
 * Runs in Electron Main Process - No Admin Required
 * Intercepts HTTP/CONNECT requests and blocks specified domains
 */

import http from 'http';
import net from 'net';
import { EventEmitter } from 'events';

class ProxyServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8080;
    this.blockedDomains = new Set(options.blockedDomains || []);
    this.server = null;
    this.isRunning = false;
    this.activeSockets = new Set();
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

      // Track every raw connection ourselves so stop() can force-close them.
      // closeAllConnections() doesn't reliably reach a socket once it's been
      // hijacked for CONNECT tunneling, so relying on it (or on server.close()
      // alone) can leave "stop blocking" hanging on a real browser's
      // long-lived connections (push/notification channels, keep-alives).
      this.server.on('connection', (socket) => {
        this.activeSockets.add(socket);
        socket.on('close', () => this.activeSockets.delete(socket));
      });

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
        for (const socket of this.activeSockets) {
          socket.destroy();
        }
        this.activeSockets.clear();
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
      // Don't serve any page in the browser tab - just kill the connection so
      // the browser shows its own "can't reach this site" state. The Electron
      // notification overlay (main.js, triggered by the 'blocked' event) is
      // what actually tells the user their site was blocked.
      req.socket.destroy();
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
      // Immediately terminate the connection - no page, just closed, same as
      // the HTTP path. The overlay (main.js) handles user-facing feedback.
      clientSocket.destroy();
      this.emit('blocked', { hostname: hostname, url: hostPort, type: 'HTTPS' });
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
      clientSocket.destroy();
    });

    clientSocket.on('error', () => {
      serverSocket.destroy();
    });

    // When stop() force-destroys the tracked incoming socket, make sure the
    // outbound half of the tunnel (not tracked by the server itself) dies
    // with it instead of lingering.
    clientSocket.on('close', () => {
      serverSocket.destroy();
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

export { ProxyServer };