import _ from 'underscore';
import memoize from 'memoize-one';
import { parseTags } from 'blessed';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import screen from '/screen';
import {separatorCommand} from './commands';

// Currently, show the command menu every time that a user launches custody, then hide them for
// the lifetime of the process (unless the user shows them again). This compensates for the user
// forgetting how to show the command menu. We could persist this using the `storage` APIs
// if we wanted, although loading would be a bit racy because it's async.
let COMMANDS_ARE_HIDDEN = false;

const getCommands = (component) => (commands) => {
  const allCommands = [...commands];

  if (!_.isEmpty(allCommands)) {
    allCommands.push(separatorCommand);
  }

  allCommands.push(['/', {
    verb: 'show/hide commands',
    toggle() {
      COMMANDS_ARE_HIDDEN = !COMMANDS_ARE_HIDDEN;
      component.setState({ hidden: COMMANDS_ARE_HIDDEN });
    }
  }]);

  return allCommands;
};

export default class CommandMenu extends Component {
  constructor(props) {
    super(props);

    // Store the commands both as a list and as a map (rather than just enumerating the map when
    // necessary) because the map will not let us enumerate separator commands in their true order,
    // as all separator commands share the same key.
    this.commandGetter = memoize(getCommands(this));
    this.commandMapGetter = memoize((commands) => new Map(commands));

    this.state = {
      hidden: COMMANDS_ARE_HIDDEN
    };
  }

  componentDidUpdate() {
    // The menu should float in front of other components. If we do not reset the z-index when the
    // menu re-renders, it may be hidden behind another component.
    if (this.el) this.el.setFront();
  }

  willHandleKeypress(key) {
    return !!this.commandMap.get(key.full);
  }

  onKeypress(key) {
    const command = this.commandMap.get(key.full);
    if (!command) return;

    // `Promise.resolve` the result of `toggle` to support both synchronous and asynchronous commands.
    Promise.resolve(command.toggle()).catch((err) => {
      screen.debug(`Could not ${command.verb}:`, err);
    });
  }

  get commands() {
    return this.commandGetter(this.context.commands || []);
  }

  get commandMap() {
    return this.commandMapGetter(this.commands);
  }

  render() {
    if (this.state.hidden) return null;

    let boxContent = [...this.commands]
      .map(([ch, {displayName = ch, verb, isSeparator}]) => {
        return isSeparator ? '' : `'${displayName}' to ${verb}`;
      })
      .join('\n');

    // For some reason the `tags` attribute doesn't work on the box.
    boxContent = parseTags(boxContent);

    return (
      <box
        ref={(el) => this.el = el}
        border={{ type: 'line' }}
        shrink // Shrink the border to fit the content.
        top='center'
        left='center'
      >
        {boxContent}
      </box>
    );
  }
}

// react-blessed does not support the new context API introduced with version 16.3 :(
// https://github.com/Yomguithereal/react-blessed/issues/83
CommandMenu.contextTypes = {
  /**
   * @type {CommandList}
   *
   * See `/components/commandMenu/commands` for more information.
   */
  commands: PropTypes.array
};
