import { join as joinPath } from 'path';
import { promisify } from 'promise-callbacks';
import sanitizeFilename from 'sanitize-filename';
import screen from '/screen';

const { readFile, writeFile } = promisify.methods(require('fs'), ['readFile', 'writeFile']);
const mkdirp = promisify(require('mkdirp'));

// POSIX-only, but no one's using this on Windows yet.
const STORAGE_ROOT_DIR = '/usr/local/var/custody';

/**
 * Returns the absolute path of a file or directory that can be used to store persistent data
 * relating to custody.
 *
 * @param {String} name - The name of the file or directory.
 *
 * @return {String} The path to the file or directory.
 */
export function storagePath(key) {
  return joinPath(STORAGE_ROOT_DIR, sanitizeFilename(key));
}

/**
 * Loads a value from storage, if any.
 *
 * @param {String} key - The key whose value to load from storage.
 *
 * @return {Promise<JSON|null>} The value, or `null` if none exists.
 */
export async function load(key) {
  let val;
  try {
    val = JSON.parse(await readFile(storagePath(key), 'utf8'));
  } catch (e) {
    // The value hasn't been set yet.
    if (e.code === 'ENOENT') {
      val = null;
      return val;
    }
    throw e;
  }
  return val;
}

/**
 * Stores a value for the specified key.
 *
 * @param {String} key - The key to store.
 * @param {JSON} val - The value to store.
 */
export function store(key, val) {
  // Asynchronously persist the current value.
  (async () => {
    try {
      await mkdirp(STORAGE_ROOT_DIR);
    } catch (e) {
      screen.debug('Could not create storage directory:', e);
      return;
    }

    await writeFile(storagePath(key), JSON.stringify(val));
  })().catch((e) => screen.debug(`Could not store ${val} at ${key}:`, e));
}
