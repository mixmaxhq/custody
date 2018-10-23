import _ from 'underscore';
import {join as joinPath} from 'path';
import Plugin from '/models/Plugin';
import screen from '/screen';
import STATES from '/models/Process/states';

/**
 * Loads a `Plugin` instance to represent the specified item in the `plugins` array in `.custodyrc.`
 *
 * @param {String|Array} name - An item in the `plugins` array in `.custodyrc`.
 * @param {Object}
 *  @property {String} pluginRoot - The root directory from which plugins are to be loaded.
 *
 * @return {Plugin|null} A `Plugin` instance, or `null` if none could be loaded i.e. `item` was
 *   invalid.
 */
export function loadPlugin(item, { pluginRoot }) {
  let name, opts;

  // Dunno why ESLint messes up re: `opts` here.
  // eslint-disable-next-line prefer-const
  ({name, opts} = parsePlugin(item));

  const custody = generatePluginAPI(name);

  const pluginPath = joinPath(pluginRoot, name);

  let schema;
  try {
    schema = require(pluginPath)(custody, opts);
    screen.debug(`Loaded plugin "${name}"`);
  } catch (e) {
    screen.debug(`Could not load plugin "${name}":`, e);
    return null;
  }

  return new Plugin(name, schema);
}

/**
 * Parses a plugin's name and options from an item in the `plugins` array in `.custodyrc`.
 *
 * @param {String|Array} name - An item in the `plugins` array in `.custodyrc`.
 *
 * @return {Object}
 *  @param {String} name - The name of the plugin.
 *  @param {Object} opts - The plugin's options.
 */
function parsePlugin(item) {
  if (!_.isEmpty(item)) {
    if (_.isString(item)) {
      return { name: item, opts: {} };
    } else if (_.isArray(item)) {
      return { name: item[0], opts: item[1] || {} };
    }
  }
  throw new Error(`Invalid plugin name/option specifier: ${item}`);
}

/**
 * Generates an API representing custody for use by the plugin with the specified name.
 *
 * @param {String} name - The name of a plugin.
 */
function generatePluginAPI(name) {
  return {
    // To be used by plugins to log messages, rather than `console.log`, since that will overwrite
    // the app. Also gives us the opportunity to prefix the logs with the plugin's name to better
    // distinguish the logs.
    debug: (...args) => screen.debug(`[${name}]`, ...args),

    // Process states, so that plugins don't have to hardcode these values.
    PROCESS_STATES: STATES
  };
}
