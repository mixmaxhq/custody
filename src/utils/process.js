import _ from 'underscore';
import { promisify } from 'promise-callbacks';
import STATES from '/models/Process/states';

const exec = promisify(require('child_process').exec);

/**
 * Determines whether the process has crashed due to a port conflict, and if so, returns the
 * port in question.
 *
 * @param {Process} process - The process to analyze.
 *
 * @return {Int|null} The port in conflict, if any, or `null` if none.
 */
export function detectPortConflict(process) {
  const { state, description } = process.effectiveState;
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

/**
 * Determines the working directory of the specified process.
 *
 * @param {Int} pid - A process ID.
 *
 * @return {Promise<String>} The working directory of the process.
 */
export async function getWorkingDirectory(pid) {
  // https://unix.stackexchange.com/a/94365
  // https://unix.stackexchange.com/a/255806
  return (await exec(`lsof -a -Fn -p ${pid} -d cwd | sed -n 3p | cut -c 2-`)).trim();
}
