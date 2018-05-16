import _ from 'underscore';
import { detectPortConflict, clearPortConflict } from '../process';
import EventEmitter from 'events';
import ProbeMonitor, { STATES } from './ProbeMonitor';
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';
import screen from '../../screen';

export default class ProcessMonitor extends EventEmitter {
  constructor({
    supervisor: {
      port,
      pollInterval = 1000,
      fixPortConflicts = true
    }
  }) {
    super();

    this._started = false;
    this._processes = [];
    this._pollInterval = pollInterval;
    this._fixPortConflicts = fixPortConflicts;

    // TODO(jeff): Log connection errors here; for some reason this crashes the process without even
    // an uncaught exception.
    this._supervisor = promisify.all(supervisord.connect(`http://localhost:${port}`));

    this._probeMonitor = new ProbeMonitor()
      .on('update', ::this._onProcessUpdate)
      .on('error', (err) => screen.debug('Error monitoring process states:', err));
  }

  get processes() {
    return this._processes;
  }

  async start() {
    this.stop();
    this._started = true;

    // Wait until we fetch our processes for the first time to start the probe monitor so that we
    // can merge the process states.
    await this._updateProcesses();
    await this._probeMonitor.start();

    // Poll Supervisor for updates to the processes in addition to the probes (or only, in case
    // the user's not using probes.)
    this._updateTimer = setInterval(() => {
      this._updateProcesses().catch((err) => this.emit('error', err));
    }, this._pollInterval);
  }

  // Must not be called while `start` is in progress.
  stop() {
    clearInterval(this._updateTimer);
    if (this._probeMonitor) this._probeMonitor.stop();
    this._processes = [];

    this._started = false;
  }

  async _updateProcesses() {
    // Note that this coercees `pid` to a string but that appears alright.
    const previousProcessesById = _.indexBy(this._processes, 'pid');
    this._processes = await this._supervisor.getAllProcessInfo();

    if (!this._started) {
      // We were stopped after the update timer last fired but before the process fetch finished.
      return;
    }

    // Merge child state.
    this._processes.forEach((process) => {
      const previousProcess = previousProcessesById[process.pid];
      process.childState = previousProcess && previousProcess.childState;
      process.childDescription = previousProcess && previousProcess.childDescription;
    });

    this.emit('update', this._processes);
  }

  _onProcessUpdate(name, { state, description }) {
    const process = _.findWhere(this._processes, { name });

    if (!process) {
      // `supervisord.conf` might have changed to remove this service. Clean up the statefile.
      this._probeMonitor.discardProbe(name).catch((err) => {
        screen.debug('Could not discard probe:', err);
      });
      return;
    }

    // Update the process' state with that from the probe.
    if (state === STATES.RUNNING) {
      delete process.childState;
      delete process.childDescription;
    } else {
      process.childState = state;
      process.childDescription = description;
    }

    this.emit('update', this._processes);

    // TODO(jeff): Detect/fix port conflicts suffered by top-level Supervisor processes,
    // i.e. call this in `_updateProcesses` too. Just not sure if/how Supervisor reports such errors.
    this._fixPortConflictIfNecessary(process).catch((err) => {
      screen.debug(`Could not fix port conflict for ${name}:`, err);
    });
  }

  async _fixPortConflictIfNecessary(process) {
    if (!this._fixPortConflicts) return;

    const name = process.name;
    const conflictingPort = detectPortConflict(process);
    if (!conflictingPort) return;

    screen.debug(`Clearing conflict on port ${conflictingPort} used by ${name}`);
    await clearPortConflict(conflictingPort);

    screen.debug('Port conflict cleared. Restarting', name);
    // There's no "restartProcess" API apparently, boo.
    await this._supervisor.stopProcess(name);
    await this._supervisor.startProcess(name);
  }
}
