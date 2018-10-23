import _ from 'underscore';
import memoize from 'memoize-one';
import Log from './ProcessLog';
import {plugins} from '/registry/index';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Restart from '/models/commands/Restart';
import Summary from './ProcessSummary';
import ToggleStopStart from '/models/commands/ToggleStopStart';

const COMMAND_SET_NAME = 'process-details';

const getCommands = (updateCommands) => (process) => {
  return [
    ['r', new Restart(process)],
    ['s', new ToggleStopStart(process)],

    ..._.chain(plugins)
      .invoke('commands', process, updateCommands)
      .flatten(true /* shallow */)
      .value(),

    ['Esc', {
      verb: 'go back',
      toggle() {
        // Nothing to do since we already handle escape in `onElementKeypress` below.
      }
    }]
  ];
};

export default class ProcessDetails extends Component {
  get commands() {
    if (!this.commandGetter) {
      const updateCommands = () => {
        if (!this._isMounted) return;

        // Force the update since the process isn't changing, but the plugin response is.
        this.updateCommands({force: true});
      };
      this.commandGetter = memoize(getCommands(updateCommands));
    }

    return this.commandGetter(this.props.process);
  }

  updateCommands({force = false} = {}) {
    if (force) {
      // Bust our cache.
      this.commandGetter = null;
    }
    this.context.addCommandSet(COMMAND_SET_NAME, this.commands);
  }

  componentDidMount() {
    this._isMounted = true;

    this.updateCommands();

    // The log has to be focused--not our root element--in order to enable keyboard navigation
    // thereof. But then this means that we have to listen for the log's keypress events, using the
    // special bubbling syntax https://github.com/chjj/blessed#event-bubbling, and have to do so
    // manually (ugh): https://github.com/Yomguithereal/react-blessed/issues/61
    this.el.on('element keypress', ::this.onElementKeypress);
  }

  componentDidUpdate(prevProps) {
    // HACK(jeff): This is a bit of a hack because we're assuming (here) that the commands rely
    // on `this.props.process`.
    if (this.props.process !== prevProps.process) {
      this.updateCommands();
    }
  }

  componentWillUnmount() {
    this.context.removeCommandSet(COMMAND_SET_NAME);

    this._isMounted = false;
  }

  onElementKeypress(el, ch, key) {
    if (key.name === 'escape') {
      this.props.onClose();
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
      </box>
    );
  }
}

ProcessDetails.propTypes = {
  process: PropTypes.object.isRequired,
  onClose: PropTypes.func
};

ProcessDetails.contextTypes = {
  addCommandSet: PropTypes.func.isRequired,
  removeCommandSet: PropTypes.func.isRequired
};
