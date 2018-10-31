const { join: joinPath } = require('path');

// Keep this in sync with `src/registry.js`.
const CONFIG_DIR = process.env.CUSTODY_PROC_DIR || '/usr/local/var/custody';
const CONFIG_PATH = joinPath(CONFIG_DIR, '.custodyrc');

module.exports = CONFIG_PATH;
