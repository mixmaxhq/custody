import CommandMenu from '/components/CommandMenu';
import memoize from 'memoize-one';
import Log from './ProcessLog';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Restart from '/models/commands/Restart';
import Summary from './ProcessSummary';
import ToggleStopStart from '/models/commands/ToggleStopStart';

function getCommands(process) {
  return [
    ['r', new Restart(process)],
    ['s', new ToggleStopStart(process)],
    ['Esc', {
      verb: 'go back',
      toggle() {
        // Nothing to do since we already handle escape in `onElementKeypress` below.
      }
    }]
  ];
}

export default class ProcessDetails extends Component {
  constructor(props) {
    super(props);

    this.commandGetter = memoize(getCommands);
  }

  get commands() {
    return this.commandGetter(this.props.process);
  }

  componentDidMount() {
    // The log has to be focused--not our root element--in order to enable keyboard navigation
    // thereof. But then this means that we have to listen for the log's keypress events, using the
    // special bubbling syntax https://github.com/chjj/blessed#event-bubbling, and have to do so
    // manually (ugh): https://github.com/Yomguithereal/react-blessed/issues/61
    this.el.on('element keypress', ::this.onElementKeypress);
  }

  onElementKeypress(el, ch, key) {
    if (key.name === 'escape') {
      this.props.onClose();
    } else {
      // Forward keypresses to the command menu since we have to keep the log focused.
      this.commandMenu.onKeypress(ch, key);
    }
  }

  render() {
    return (
      <box ref={(el) => this.el = el} >
        <Summary process={this.props.process} />
        <Log
          process={this.props.process}
          focused
          /* HACK(jeff): `top` === the `height` of `Summary`. */
          layout={{ top: 1 }}
        />
        <CommandMenu
          ref={(menu) => this.commandMenu = menu}
          commands={this.commands}
        />
      </box>
    );
  }
}

ProcessDetails.propTypes = {
  process: PropTypes.object.isRequired,
  onClose: PropTypes.func
};
