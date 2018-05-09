import PropTypes from 'prop-types';
import React, {Component} from 'react';
import screen from '../screen';
import {Tail} from 'tail';

// It might be nice to render the entire log file. However this is probably (?) unnecessary and
// (more to the point) for complex/active services like app, the log file is quite large and, if we
// try to load it all into the `log` component, can take several seconds to render.
const SCROLLBACK = 100 /* lines */;

export default class Log extends Component {
  componentDidMount() {
    // Grab Esc to use in navigation, instead of quitting the program.
    screen.grabKeys = true;

    this.startTailing();
  }

  componentWillUnmount() {
    this.stopTailing();

    // Release Esc.
    screen.grabKeys = false;
  }

  startTailing() {
    // Safety belts.
    if (this.tail) return;

    // As documented on `SCROLLBACK`, we can't render the entire log file. However, the 'tail'
    // module lacks a `-n`-like option to get the last `SCROLLBACK` lines. So what we do is load the
    // entire file, but wait to render only the last `SCROLLBACK` lines, then start streaming.
    this.tail = new Tail(this.props.process.logfile, { fromBeginning: true });

    let logs = [];
    let initialDataFlushed = false;
    this.tail.on('line', (line) => {
      if (initialDataFlushed) {
        this.log.add(line);
      } else {
        logs.push(line);
        if (logs.length > SCROLLBACK) logs.shift();
      }
    });
    this.tail.on('historicalDataEnd', () => {
      logs.forEach((line) => this.log.add(line));
      logs = [];
      initialDataFlushed = true;
    });
  }

  stopTailing() {
    this.tail.unwatch();
  }

  onKeypress(ch, key) {
    if (key.name === 'escape') {
      this.props.onClose();
    }
  }

  render() {
    return (
      // Unfortunately react-blessed@0.2.1 doesn't support `React.createRef`.
      <log
        ref={(log) => this.log = log}
        input // Enables 'keypress'.
        mouse // This and `keys` enable the user to navigate the logs.
        keys
        focused
        onKeypress={::this.onKeypress}
        scrollback={SCROLLBACK}
        // TODO(jeff): Enable pinning to the bottom of the logs. Possible using the `scrollOnInput`
        // prop, just requires us to give the user a keyboard shortcut to do so. Not totally sure
        // this is necessary though since the component will follow the logs if the user is scrolled
        // to the bottom--sounds like enabling this would only jump the user to the end if they had
        // scrolled away.
      />
    );
  }
}

Log.propTypes = {
  process: PropTypes.object.isRequired,
  onClose: PropTypes.func
};
