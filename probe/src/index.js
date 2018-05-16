const mkdirp = require('mkdirp');
const { join: joinPath } = require('path');
const { writeFileSync } = require('fs');

// Keep these values in sync with those inside `ProbeMonitor.js`.
const PROC_DIR = '/usr/local/var/custody/services';
const STATEFILE_EXT = '.statefile';
const STATES = {
  RUNNING: 'RUNNING',
  FATAL: 'FATAL'
};

/**
 * Initializes a probe to report this process' state.
 *
 * @param {String} name - The name of the Supervisor program to which this Node process belongs.
 */
module.exports = function initializeProbe(name) {
  mkdirp.sync(PROC_DIR);

  // Synchronously update the state so that we can do so before the process (potentially) crashes.
  function updateState(state, description = '') {
    const statefile = `${name}${STATEFILE_EXT}`;
    const path = joinPath(PROC_DIR, statefile);
    writeFileSync(path, JSON.stringify({ state, description }));
  }

  // Mark the process as running on startup.
  updateState(STATES.RUNNING);

  process.on('uncaughtException', (err) => {
    updateState(STATES.FATAL, err.message);
  });
};
