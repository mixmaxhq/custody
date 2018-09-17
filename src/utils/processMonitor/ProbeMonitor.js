import EventEmitter from 'events';
import { basename, join as joinPath } from 'path';
import { promisify } from 'promise-callbacks';
import { STATES } from '/models/Process';
import { storagePath } from '/utils/storage';
import { watch } from 'fs';

const { readFile, readdir, unlink } = promisify.methods(require('fs'), ['readFile', 'readdir', 'unlink']);
const mkdirp = promisify(require('mkdirp'));

// Keep these values in sync with those inside `custody-probe`.
const PROC_DIR = storagePath('services');
const STATEFILE_EXT = '.statefile';
export { STATES }; // Re-use process states for the probes.

/**
 * Monitors instances of `custody-probe` to communicate Supervisor subprocess state to our
 * process monitor.
 *
 * See https://github.com/mixmaxhq/custody/wiki/custody-probe for explanation of architecture.
 */
export default class ProbeMonitor extends EventEmitter {
  async start() {
    if (this._started) return;
    this._started = true;

    try {
      await mkdirp(PROC_DIR);

      const procs = await readdir(PROC_DIR);
      await Promise.all(procs.map(::this._onUpdate));

      this._watcher = watch(PROC_DIR, (eventType, filename) => {
        this._onUpdate(filename).catch((err) => this.emit('error', err));
      });
    } finally {
      this._started = false;
    }
  }

  stop() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
    this._started = false;
  }

  async discardProbe(name) {
    const statefile = `${name}${STATEFILE_EXT}`;
    const path = joinPath(PROC_DIR, statefile);
    return unlink(path);
  }

  async _onUpdate(statefile) {
    const name = basename(statefile, STATEFILE_EXT);
    const path = joinPath(PROC_DIR, statefile);
    let state;
    try {
      state = JSON.parse((await readFile(path, 'utf8')).trim());
    } catch (e) {
      // This update was the file being deleted.
      if (e.code === 'ENOENT') return;
    }
    this.emit('update', name, state);
  }
}
