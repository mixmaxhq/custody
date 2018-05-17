import { effectiveState, STATES } from '../../utils/process';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import screen from '../../screen';

const ACTIONS = new Map([
  ['r', {
    verb: 'restart',
    async handler(process) {
      return process.restart();
    }
  }],
  ['s', {
    verb: 'stop/start',
    async handler(process) {
      if (effectiveState(process).state === STATES.STOPPED) {
        return process.start();
      } else {
        return process.stop();
      }
    }
  }]
]);

export default class ProcessControls extends Component {
  onKeypress(ch) {
    const action = ACTIONS.get(ch);
    if (!action) return;

    const process = this.props.process;
    action.handler(process).catch((err) => {
      screen.debug(`Could not ${action.verb} ${process.name}:`, err);
    });
  }

  render() {
    return (
      <box
        border={{ type: 'line' }}
        shrink // Shrink the border to fit the content.
        {...this.props.layout}
      >
        {[...ACTIONS].map(([ch, {verb}]) => `'${ch}' to ${verb}`).join(', ')}
      </box>
    );
  }
}

ProcessControls.propTypes = {
  process: PropTypes.object.isRequired,
  layout: PropTypes.object
};
