/**
 * IPC Module - Main entry point
 */

const { IPC_CHANNELS, setupAllIpc } = require('./blockingIpc');

module.exports = {
  IPC_CHANNELS,
  setupAllIpc
};