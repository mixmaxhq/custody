import _ from 'underscore';
import screen from '/screen';

export default class Plugin {
  constructor(name, schema, opts = {}) {
    this._name = name;
    this._schema = schema;
    this._opts = opts;
  }

  commands(process, setNeedsReload) {
    if (!this._schema.commands) return [];

    // Guard against the plugin calling `setNeedsReload` in an infinite loop.
    let safe = true;
    const setNeedsReloadSafely = () => {
      if (!safe) {
        screen.debug(`Prevented plugin "${this._name}" from reloading \`commands\` in an infinite loop`);
        return;
      }
      safe = false;
      setImmediate(() => safe = true);

      setNeedsReload();
    };

    let commands;
    try {
      commands = this._schema.commands(process, {
        opts: this._opts,
        setNeedsReload: setNeedsReloadSafely
      });

      if (!_.isArray(commands)) {
        throw new Error(`Invalid return value: ${commands}`);
      }
    } catch (e) {
      screen.debug(`Error returning commands from plugin "${this._name}":`, e);
      return [];
    }

    return commands;
  }
}
