import Controls from './ProcessControls';
import Summary from './ProcessSummary';
import Log from './ProcessLog';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import screen from '../../screen';

export default class ProcessDetails extends Component {
  componentDidMount() {
    // Grab Esc to use in navigation, instead of quitting the program.
    screen.grabKeys = true;

    // The log has to be focused--not our root element--in order to enable keyboard navigation
    // thereof. But then this means that we have to listen for the log's keypress events, using the
    // special bubbling syntax https://github.com/chjj/blessed#event-bubbling, and have to do so
    // manually (ugh): https://github.com/Yomguithereal/react-blessed/issues/61
    this.el.on('element keypress', ::this.onElementKeypress);
  }

  componentWillUnmount() {
    // Release Esc.
    screen.grabKeys = false;
  }

  onElementKeypress(el, ch, key) {
    if (key.name === 'escape') {
      this.props.onClose();
    } else {
      // Forward keypresses to the controls since we have to keep the log focused.
      this.controls.onKeypress(ch, key);
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
          layout={{ top: 1, height: '100%-3' }}
        />
        <Controls
          ref={(controls) => this.controls = controls}
          process={this.props.process}
          layout={{ top: '100%-2' }}
        />
      </box>
    );
  }
}

ProcessDetails.propTypes = {
  process: PropTypes.object.isRequired,
  onClose: PropTypes.func
};
