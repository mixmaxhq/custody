/**
 * Utilities for managing the command menu's data structure, a list of commands.
 *
 * Commands are added and removed in "sets" using the `addCommandSet` and `removeCommandSet` APIs.
 * The list of commands is available as `commands`.
 *
 * This data is intended to be provided to the command menu through React context, so that different
 * components can add/remove command sets as they appear.
 */

/**
 * @typedef {Object} CommandDescription
 *
 * @property {String=} displayName - The string to use to represent the command trigger in the
 *   command menu. Defaults to the first argument of the `Command` array--specify this key if you
 *   want to override that for some reason.
 * @property {String} verb - A description of what the command does, of the form
 *   "<action> [<subject>]". Examples: 'restart' or "show/hide commands".
 * @property {AsyncFunction|Function} toggle - A function that, when invoked, will perform the
 *   command.
 * @property {Boolean=false} isSeparator - `true` if this command should be rendered as a separator
 *   in the command list rather than a command that performs an action.
 */

/**
 * @typedef {[String, CommandDescription]} Command
 *
 * A command is an array containing two elements:
 *
 *   1. The full name of the key which will trigger the command. Examples: 's' or 'tab'.
 *   2. An object describing the command.
 */

/**
 * @typedef {Array<Command>} CommandList
 */

/**
 * @type {Command}
 *
 * A command that represents a separator in the command list.
 */
export const separatorCommand = ['', { isSeparator: true }];

let commands = [];

const commandSetMap = new Map();

/**
 * Updates the list of commands to reflect the current command sets.
 *
 * @return {CommandList} The new list of commands.
 */
function updateCommands() {
  commands = [...commandSetMap]
    .reverse() // Most recently-added commands first.
    .reduce((commands, [, set], idx) => {
      commands.push(...set);
      if (idx < commandSetMap.size - 1) {
        commands.push(separatorCommand);
      }
      return commands;
    }, []);
  return commands;
}

/**
 * @type {CommandList}
 *
 * The list of commands, a live binding kept up to date by `addCommandSet` and `removeCommandSet`.
 * You should use those APIs to manipulate the list rather than editing it directly.
 */
export default commands;

/**
 * Adds a set of commands to the command list.
 *
 * Commands will be rendered most-recently-added first, by set; and then within the set, in the
 * order in which they appear when passed to this function.
 *
 * If a set was already registered under `name`, this function will replace the old set with the
 * new one.
 *
 * @param {String} name - A name by which to identify the set of commands and remove the commands
 *   later, using `removeCommandSet`.
 * @param {CommandList} commands - The set of commands.
 *
 * @return {CommandList} The new list of commands.
 */
export function addCommandSet(name, commands) {
  commandSetMap.set(name, commands);
  return updateCommands();
}

/**
 * Removes a set of commands from the command list.
 *
 * This function is a no-op if no set was registered for `name`.
 *
 * @param {String} name - The name of a set of commands to remove from the command list.
 *
 * @return {CommandList} The new list of commands.
 */
export function removeCommandSet(name) {
  commandSetMap.delete(name);
  return updateCommands();
}
