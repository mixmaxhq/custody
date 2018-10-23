import { promisify } from 'promise-callbacks';

const exec = promisify(require('child_process').exec);

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
