import { statSync, writeFileSync, unlinkSync } from 'fs';
import { storagePath } from '/utils/storage';

const SHUTDOWN_FILE = storagePath('cleanShutdown');

let wasCleanShutdown;

/**
 * @return {Boolean} `true` if `markCleanShutdown` was called before the process last shut down,
 *   `false` otherwise.
 */
export function didShutdownCleanly() {
  if (wasCleanShutdown !== undefined) return wasCleanShutdown;

  try {
    statSync(SHUTDOWN_FILE);
    wasCleanShutdown = true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      // It either wasn't a clean shutdown or custody was last launched before we added shutdown
      // tracking. Either way let's say unclean.
      wasCleanShutdown = false;
      return wasCleanShutdown;
    }
    throw e;
  }
  return wasCleanShutdown;
}

/**
 * Causes `didShutdownCleanly` to return `true` the next time the process is launched.
 */
export function markCleanShutdown() {
  writeFileSync(SHUTDOWN_FILE, '');
}

/**
 * Clears the last-recorded shutdown value to prepare to call `markCleanShutdown` again.
 * `didShutdownCleanly` will continue to return the last-recorded shutdown value for the lifetime of
 * the process.
 */
export function clearShutdown() {
  // Make sure to load the last shutdown before we clear it.
  didShutdownCleanly();

  try {
    unlinkSync(SHUTDOWN_FILE);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // Nothing to do if we didn't record a clean shutdown.
      return;
    }
    throw e;
  }
}
