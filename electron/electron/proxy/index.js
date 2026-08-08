/**
 * Proxy Module - Approach 1: User-Level Proxy (HKCU)
 * Main entry point for website blocking via system proxy
 */

const { WebsiteBlockerProxy, getBlockerInstance, resetBlockerInstance } = require('./websiteBlockerProxy');
const { ProxyServer } = require('./proxyServer');
const { enableProxy, disableProxy, getProxySettings, isProxyEnabled, REGISTRY_PATH } = require('./registryProxy');

module.exports = {
  WebsiteBlockerProxy,
  getBlockerInstance,
  resetBlockerInstance,
  ProxyServer,
  enableProxy,
  disableProxy,
  getProxySettings,
  isProxyEnabled,
  REGISTRY_PATH
};