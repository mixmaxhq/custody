import EventEmitter from 'events';
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';

export default class ProcessMonitor extends EventEmitter {
  constructor({ supervisor: { port, pollInterval = 1000 } }) {
    super();

    this._started = false;
    this._processes = [];
    this._pollInterval = pollInterval;

    // TODO(jeff): Log connection errors here; for some reason this crashes the process without even
    // an uncaught exception.
    this._supervisor = promisify.all(supervisord.connect(`http://localhost:${port}`));
  }

  start() {
    this.stop();
    this._started = true;

    // Poll Supervisor for updates to the processes in addition to the probes (or only, in case
    // the user's not using probes.)
    this._updateTimer = setInterval(() => {
      this._updateProcesses().catch((err) => this.emit('error', err));
    }, this._pollInterval);
  }

  // Must not be called while `start` is in progress.
  stop() {
    clearInterval(this._updateTimer);
    this._processes = [];

    this._started = false;
  }

  async _updateProcesses() {
    this._processes = await this._supervisor.getAllProcessInfo();

    if (!this._started) {
      // We were stopped after the update timer last fired but before the process fetch finished.
      return;
    }

    this.emit('update', this._processes);
  }
}
