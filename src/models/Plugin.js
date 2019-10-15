import _ from 'underscore';
import screen from '/screen';

export default class Plugin {
  constructor(name, schema) {
    this._name = name;
    this._schema = schema;
  }

  update(process) {
    if (!this._schema.update) return;

    try {
      this._schema.update(process);
    } catch (e) {
      screen.debug(`Error updating plugin "${this._name}" for process ${process.name}:`, e);
    }
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
        setNeedsReload: setNeedsReloadSafely
      });

      // Second condition guards against the array being singly-nested.
      if (!_.isArray(commands) || (!_.isEmpty(commands) && !_.isArray(commands[0]))) {
        throw new Error(`Invalid return value: ${commands}`);
      }
    } catch (e) {
      screen.debug(`Error returning commands from plugin "${this._name}":`, e);
      return [];
    }

    return commands;
  }

  log(process, message) {
    if (!this._schema.log) return;

    try {
      this._schema.log(process, message);
    } catch (e) {
      screen.debug(`Error informing plugin "${this._name}" of log message:`, e);
    }
  }
}
