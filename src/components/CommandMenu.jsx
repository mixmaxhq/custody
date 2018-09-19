import memoize from 'memoize-one';
import { parseTags } from 'blessed';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import screen from '/screen';

// Currently, show the command menu every time that a user launches custody, then hide them for
// the lifetime of the process (unless the user shows them again). This compensates for the user
// forgetting how to show the command menu. We could persist this using the `storage` APIs
// if we wanted, although loading would be a bit racy because it's async.
let COMMANDS_ARE_HIDDEN = false;

const getCommands = (component) => (commands) => {
  return new Map([
    ...commands,
    ['/', {
      verb: 'show/hide commands',
      toggle() {
        COMMANDS_ARE_HIDDEN = !COMMANDS_ARE_HIDDEN;
        component.setState({ hidden: COMMANDS_ARE_HIDDEN });
      }
    }]
  ]);
};

export default class CommandMenu extends Component {
  constructor(props) {
    super(props);

    this.commandGetter = memoize(getCommands(this));

    this.state = {
      hidden: COMMANDS_ARE_HIDDEN
    };
  }

  onKeypress(ch) {
    const command = this.commands.get(ch);
    if (!command) return;

    // `Promise.resolve` the result of `toggle` to support both synchronous and asynchronous commands.
    Promise.resolve(command.toggle()).catch((err) => {
      screen.debug(`Could not ${command.verb}:`, err);
    });
  }

  get commands() {
    return this.commandGetter(this.props.commands);
  }

  render() {
    if (this.state.hidden) return null;

    let boxContent = [...this.commands].map(([ch, {verb}]) => `'${ch}' to ${verb}`).join('\n');

    // For some reason the `tags` attribute doesn't work on the box.
    boxContent = parseTags(boxContent);

    return (
      <box
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

CommandMenu.propTypes = {
  commands: PropTypes.array
};
