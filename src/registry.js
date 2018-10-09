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

  // Some sort of API object equivalent to the `{types: t}` object provided to Babel plugins. TBD.
  const custody = {
    debug: (...args) => screen.debug(...args)
  };

  plugins = _.map(config.plugins, (name) => {
    let pluginOpts;

    // Dunno why ESLint messes up re: `pluginOpts` here.
    // eslint-disable-next-line prefer-const
    ({name, opts: pluginOpts} = parsePlugin(name));

    const pluginPath = joinPath(pluginRoot, name);
    const schema = require(pluginPath)(custody);
    return new Plugin(name, schema, pluginOpts);
  });
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
