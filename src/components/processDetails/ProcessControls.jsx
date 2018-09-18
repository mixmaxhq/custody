import { parseTags } from 'blessed';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Restart from '/models/controls/Restart';
import screen from '/screen';
import ToggleStopStart from '/models/controls/ToggleStopStart';

export default class ProcessControls extends Component {
  // I don't think that react-blessed@0.2.1 supports `getDerivedStateFromProps`, it doesn't automatically
  // call this. This is too bad since this means we have to derive controls in the constructor and
  // in `componentWillReceiveProps`. But at least we can mimic the upcoming API.
  static getDerivedStateFromProps(nextProps) {
    return {
      controls: new Map([
        ['r', new Restart(nextProps.process)],
        ['s', new ToggleStopStart(nextProps.process)],
        ...nextProps.controls
      ])
    };
  }

  constructor(props) {
    super(props);

    this.state = ProcessControls.getDerivedStateFromProps(props);
  }

  // react-blessed doesn't support `UNSAFE_componentWillReceiveProps` so hopefully this won't stop
  // working in react@17. :\
  componentWillReceiveProps(nextProps) {
    this.setState(ProcessControls.getDerivedStateFromProps(nextProps));
  }

  onKeypress(ch) {
    const control = this.state.controls.get(ch);
    if (!control) return;

    // HACK(jeff): We don't know for sure that the control manipulates the process.
    // But it's a fair bet.
    const process = this.props.process;

    // `Promise.resolve` the result of `toggle` to support both synchronous and asynchronous actions.
    Promise.resolve(control.toggle()).catch((err) => {
      screen.debug(`Could not ${control.verb} ${process.name}:`, err);
    });
  }

  render() {
    let boxContent = [...this.state.controls].map(([ch, {verb}]) => `'${ch}' to ${verb}`).join(', ');

    // For some reason the `tags` attribute doesn't work on the box.
    boxContent = parseTags(boxContent);

    return (
      <box
        border={{ type: 'line' }}
        shrink // Shrink the border to fit the content.
        {...this.props.layout}
      >
        {boxContent}
      </box>
    );
  }
}

ProcessControls.propTypes = {
  process: PropTypes.object.isRequired,
  layout: PropTypes.object,
  controls: PropTypes.array
};
