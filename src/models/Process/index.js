import _ from 'underscore';
import {getWorkingDirectory} from '/utils/process';

/**
 * States of a process' lifecycle.
 *
 * Re-exported from another module to avoid a circular dependency between this and
 * `/utils/process`.
 * TODO(jeff): Move back here once we factor port-conflict detection into a plugin:
 * https://github.com/mixmaxhq/custody/issues/63
 */
import STATES from './states';
export { STATES };

export default class Process {
  /**
   * @param {Object} process - A process object returned by `Supervisord#getAllProcessInfo`.
   * @param {Object}
   *  @param {Process} previousProcess - An object representing the process with the same `pid`,
   *    with properties previously derived from `supervisord#getAllProcessInfo`.
   *  @param {Supervisord} supervisor - A supervisor client.
   */
  constructor(process, { previousProcess = null, supervisor } = {}) {
    _.extend(this, _.pick(process, [
      'pid',
      'name',
      'group',
      'statename',
      'description',
      'logfile'
    ]));

    // Merge child state.
    this.child = previousProcess && previousProcess.child;

    this._supervisor = supervisor;
  }

  /**
   * Determines the "effective" state and description of a process.
   *
   * Normally this returns the process' own values for this information. However, if the process
   * is running, but a subprocess is not running, then this will return the information for the
   * subprocess since then the top-level process is not actually being effective at doing work.
   *
   * @return {Object}
   *  @param {String} state
   *  @param {String} description
   */
  get effectiveState() {
    let state = this.statename;
    let description = this.description;
    if ((state === STATES.RUNNING) && this.child) {
      // Defer to child state when the process is running.
      state = this.child.state;
      // Fall back to the parent description if the child is running.
      if (this.child.description || (state !== STATES.RUNNING)) {
        description = this.child.description;
      }
    }
    return { state, description };
  }

  /**
   * Returns a name for the process that mimics that shown by `supervisorctl status`, incorporating
   * both the process' name and its group (if any).
   *
   * @param {Object} process - The process.
   *
   * @return {String} The display name.
   */
  get displayName() {
    return (this.group === this.name) ? this.name : `${this.group}:${this.name}`;
  }

  /**
   * @param {Process} process
   * @return {String} The name of the process with which to communicate with `supervisord`.
   */
  get daemonName() {
    return (this.group === this.name) ? this.name : `${this.group}:${this.name}`;
  }

  /**
   * @return {Promise<String>} The working directory of the process.
   */
  async getWorkingDirectory() {
    return getWorkingDirectory(this.pid);
  }

  async start() {
    return this._supervisor.startProcess(this.daemonName);
  }

  async stop() {
    return this._supervisor.stopProcess(this.daemonName);
  }

  async restart() {
    // There's no "restartProcess" API apparently, boo.
    try {
      await this.stop();
    } catch (e) {
      // Simpler to just try to stop than to check if it is running.
      if (e.faultString !== 'NOT_RUNNING') throw e;
    }
    await this.start();
  }
}
