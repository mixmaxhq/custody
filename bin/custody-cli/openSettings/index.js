const { join: joinPath } = require('path');
const opn = require('opn');
const { promisify } = require('promise-callbacks');
const readlineSync = require('readline-sync');

const copyFile = promisify.method(require('fs'), 'copyFile');
const fileExists = promisify(require('fs').access);
const mkdirp = promisify(require('mkdirp'));

// Keep this in sync with `src/registry.js`.
const CONFIG_DIR = process.env.CUSTODY_PROC_DIR || '/usr/local/var/custody';
const CONFIG_PATH = joinPath(CONFIG_DIR, '.custodyrc');

const TEMPLATE_CONFIG_PATH = joinPath(__dirname, '.custodyrc.tmpl');

module.exports = async function() {
  if (!await initializeConfig()) return;

  return opn(CONFIG_PATH, {
    // Don't wait for the editor to close.
    wait: false
  });
};

/**
 * Creates a default .custodyrc at the expected configuration path if one does not exist
 * and the user indicates that they would like to create one.
 *
 * @return {Promise<Boolean>} `true` if the configuration already existed or was successfully
 *   created, `false` if the configuration did not exist and the user declined to create one.
 */
async function initializeConfig() {
  let configExists = false;
  try {
    await fileExists(CONFIG_PATH);
    configExists = true;
  } catch (e) {
    // Nothing to do.
  }
  if (configExists) return true;

  let prompt = `No .custodyrc found at ${CONFIG_DIR}. Create one at that location?`;
  if (!process.env.CUSTODY_PROC_DIR) {
    prompt += ' (To change this destination, set the `CUSTODY_PROC_DIR` environment variable.)';
  }
  if (!readlineSync.keyInYN(prompt)) return false;

  console.log('Creating .custodyrc…');
  await mkdirp(CONFIG_DIR);
  await copyFile(TEMPLATE_CONFIG_PATH, CONFIG_PATH);

  return true;
}
