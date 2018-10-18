import _ from 'underscore';
import { detectPortConflict, clearPortConflict } from '/utils/process';
import EventEmitter from 'events';
import ProbeMonitor from './ProbeMonitor';
import Process from '/models/Process/index';
import screen from '/screen';

export default class ProcessMonitor extends EventEmitter {
  constructor({
    supervisor: {
      client,
      pollInterval = 1000
    },
    fixPortConflicts = true
  }) {
    super();

    this._started = false;
    this._processes = [];
    this._pollInterval = pollInterval;
    this._fixPortConflicts = fixPortConflicts;

    this._supervisor = client;

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
    const processes = await this._supervisor.getAllProcessInfo();

    if (!this._started) {
      // We were stopped after the update timer last fired but before the process fetch finished.
      return;
    }

    const previousProcessesById = _.indexBy(this._processes, 'pid');
    this._processes = processes.map((process) => {
      const previousProcess = previousProcessesById[process.pid];
      return new Process(process, {
        previousProcess,
        supervisor: this._supervisor
      });
    });

    this.emit('update', this._processes);
  }

  _onProcessUpdate(name, child) {
    const process = _.findWhere(this._processes, { name });

    if (!process) {
      // `supervisord.conf` might have changed to remove this service. Clean up the statefile.
      this._probeMonitor.discardProbe(name).catch((err) => {
        screen.debug('Could not discard probe:', err);
      });
      return;
    }

    // Update the process' state with that from the probe.
    process.child = child;

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
    await process.restart();
  }
}
