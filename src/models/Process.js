import _ from 'underscore';

/**
 * States of a process' lifecycle.
 */
export const STATES = {
  // The process is starting up.
  STARTING: 'STARTING',

  // The process is running.
  RUNNING: 'RUNNING',

  // The process has been stopped.
  STOPPED: 'STOPPED',

  // The process has exited with an error and will not be restarted.
  FATAL: 'FATAL'
};

export default class Process {
  /**
   * @param {Object} process - A process object returned by `Supervisord#getAllProcessInfo`.
   * @param {Object}
   *  @param {Object} previousProcess - An object representing the process with the same `pid`,
   *    previously returned by `supervisord#getAllProcessInfo`.
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
    this.childState = previousProcess && previousProcess.childState;
    this.childDescription = previousProcess && previousProcess.childDescription;

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
    const immediateState = this.statename;
    const immediateDescription = this.description;
    if (immediateState === STATES.RUNNING) {
      // Defer to child state when the process is running.
      const childState = this.childState;
      const childDescription = this.childDescription;
      if (childState) {
        return { state: childState, description: childDescription };
      }
    }
    return { state: immediateState, description: immediateDescription };
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
