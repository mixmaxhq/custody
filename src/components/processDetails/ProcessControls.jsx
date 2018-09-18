import memoize from 'memoize-one';
import { parseTags } from 'blessed';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Restart from '/models/controls/Restart';
import screen from '/screen';
import ToggleStopStart from '/models/controls/ToggleStopStart';

// Currently, show keyboard shortcuts every time that a user launches custody, then hide them for
// the lifetime of the process (unless the user shows them again). This compensates for the user
// forgetting how to show the keyboard shortcuts. We could persist this using the `storage` APIs
// if we wanted, although loading would be a bit racy because it's async.
let CONTROLS_ARE_HIDDEN = false;

const getControls = (component) => (process, controls) => {
  return new Map([
    ['r', new Restart(process)],
    ['s', new ToggleStopStart(process)],
    ...controls,
    ['/', {
      verb: 'show/hide shortcuts',
      toggle() {
        CONTROLS_ARE_HIDDEN = !CONTROLS_ARE_HIDDEN;
        component.setState({ hidden: CONTROLS_ARE_HIDDEN });
      }
    }]
  ]);
};

export default class ProcessControls extends Component {
  constructor(props) {
    super(props);

    this.controlGetter = memoize(getControls(this));

    this.state = {
      hidden: CONTROLS_ARE_HIDDEN
    };
  }

  onKeypress(ch) {
    const control = this.controls.get(ch);
    if (!control) return;

    const process = this.props.process;

    // `Promise.resolve` the result of `toggle` to support both synchronous and asynchronous actions.
    Promise.resolve(control.toggle()).catch((err) => {
      // HACK(jeff): We don't know for sure that the control manipulates the process.
      // But it's a fair bet.
      screen.debug(`Could not ${control.verb} ${process.name}:`, err);
    });
  }

  get controls() {
    return this.controlGetter(this.props.process, this.props.controls);
  }

  render() {
    if (this.state.hidden) return null;

    let boxContent = [...this.controls].map(([ch, {verb}]) => `'${ch}' to ${verb}`).join('\n');

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

ProcessControls.propTypes = {
  process: PropTypes.object.isRequired,
  controls: PropTypes.array
};
