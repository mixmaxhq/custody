import _ from 'underscore';
import {join as joinPath} from 'path';
import Plugin from '/models/Plugin';
import {promisify} from 'promise-callbacks';
import screen from '/screen';
import {storagePath} from '/utils/storage';

const npmRoot = promisify(require('npm-root'));
const readFile = promisify.method(require('fs'), 'readFile');

export let plugins = [];

export async function loadPlugins() {
  let config;
  try {
    config = JSON.parse(await readFile(storagePath('.custodyrc'), 'utf8'));
  } catch (e) {
    // Ignore errors due to there simply being no config.
    if (e.code !== 'ENOENT') {
      screen.debug('Could not load config:', e);
    }
  }
  if (!config || _.isEmpty(config.plugins)) return;


  const pluginRoot = await npmRoot({global: true});

  plugins = _.compact(_.map(config.plugins, (name) => {
    return loadPlugin(name, {pluginRoot});
  }));
}

function loadPlugin(name, {pluginRoot}) {
  let opts;

  // Dunno why ESLint messes up re: `opts` here.
  // eslint-disable-next-line prefer-const
  ({name, opts} = parsePlugin(name));

  // Some sort of API object equivalent to the `{types: t}` object provided to Babel plugins. TBD.
  const custody = {
    debug: (...args) => screen.debug(`[${name}]`, ...args)
  };

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

function parsePlugin(name) {
  if (!_.isEmpty(name)) {
    if (_.isString(name)) {
      return { name, opts: {} };
    } else if (_.isArray(name)) {
      return { name: name[0], opts: name[1] || {} };
    }
  }
  throw new Error(`Invalid plugin name/option specifier: ${name}`);
}
