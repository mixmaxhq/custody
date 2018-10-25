import _ from 'underscore';
import { loadPlugin } from './utils';
import { promisify } from 'promise-callbacks';
import screen from '/screen';
import { storagePath } from '/utils/storage';

const npmRoot = promisify(require('npm-root'));
const readFile = promisify.method(require('fs'), 'readFile');

// Keep this in sync with `bin/custody-cli/openSettings.js`.
const CONFIG_PATH = storagePath('.custodyrc');

export let plugins = [];

export async function loadPlugins() {
  let config;
  try {
    config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
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
