import _ from 'underscore';
import { promisify } from 'promise-callbacks';

const exec = promisify(require('child_process').exec);

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

/**
 * Determines the "effective" state and description of a process.
 *
 * Normally this returns the process' own values for this information. However, if the process
 * is running, but a subprocess is not running, then this will return the information for the
 * subprocess since then the top-level process is not actually being effective at doing work.
 *
 * @param {Object} process - The process to analyze.
 *
 * @return {Object}
 *  @param {String} state
 *  @param {String} description
 */
export function effectiveState(process) {
  const immediateState = process.statename;
  const immediateDescription = process.description;
  if (immediateState === STATES.RUNNING) {
    // Defer to child state when the process is running.
    const childState = process.childState;
    const childDescription = process.childDescription;
    if (childState) {
      return { state: childState, description: childDescription };
    }
  }
  return { state: immediateState, description: immediateDescription };
}

/**
 * Determines whether the process has crashed due to a port conflict, and if so, returns the
 * port in question.
 *
 * @param {Object} process - The process to analyze.
 *
 * @return {Int|null} The port in conflict, if any, or `null` if none.
 */
export function detectPortConflict(process) {
  const { state, description } = effectiveState(process);
  if (state === STATES.FATAL) {
    const portString = _.last(description.match(/EADDRINUSE.+?(\d+)/));
    if (portString) return parseInt(portString, 10);
  }
  return null;
}

/**
 * Clears a port conflict by killing the process listening to that port.
 *
 * @param {Int} port - The port to clear.
 *
 * @return {Promise<Error>} A promise that resolves to `undefined` if the port is successfully
 *   cleared, otherwise rejects with the error.
 */
export async function clearPortConflict(port) {
  return exec(`kill -9 $(lsof -ti :${port})`);
}
