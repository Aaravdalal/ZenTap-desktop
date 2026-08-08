/**
 * Overlay Module - Approach 2: ScreenZen Overlay
 * Main entry point for active window detection and overlay display
 */

const { ScreenZenOverlay } = require('./screenZenOverlay');
const { ActiveWindowMonitor, getActiveWindowInfo } = require('./windowMonitor');

module.exports = {
  ScreenZenOverlay,
  ActiveWindowMonitor,
  getActiveWindowInfo
};