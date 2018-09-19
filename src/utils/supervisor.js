import { getWorkingDirectory } from './process';
import ini from 'ini';
import path from 'path';
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';

const readFile = promisify.method(require('fs'), 'readFile');

/**
 * Creates a promisified client for the supervisord instance listening on the specified port.
 *
 * @param {Int} port - The port on which the supervisord instance is listening.
 *
 * @return {Promisified Supervisord} A promisified supervisord client.
 */
export function createClient(port) {
  // TODO(jeff): Log connection errors here; for some reason this crashes the process without even
  // an uncaught exception.
  return promisify.all(supervisord.connect(`http://localhost:${port}`));
}

/**
 * Determines the path of the main logfile in use by Supervisor.
 *
 * @param {Promisified Supervisord} supervisor - a promisified supervisord client.
 *
 * @return {String} The path of the main logfile.
 */
export async function getMainLogfile(supervisor) {
  // Supervisor does not expose an XML-RPC API for determining the path of the main logfile as of
  // API version 3.0: http://supervisord.org/api.html. To identify the main logfile, we must read it
  // from the configuration file. Supervisor _also_ lacks APIs for returning its full configuration
  // and/or the path of the configuration file, so we identify the configuration file by determining
  // `supervisord`'s working directory, then looking up the configuration file as described at
  // http://supervisord.org/configuration.html#configuration-file.
  const supervisorPid = await supervisor.getPID();
  const supervisorCwd = await getWorkingDirectory(supervisorPid);

  // TODO(jeff): Look up configuration files at the other possible locations (see
  // http://supervisord.org/configuration.html#configuration-file).
  const supervisorConfigFile = path.join(supervisorCwd, 'supervisord.conf');
  const supervisorConfig = ini.parse(await readFile(supervisorConfigFile, 'utf-8'));

  return supervisorConfig.supervisord.logfile;
}
