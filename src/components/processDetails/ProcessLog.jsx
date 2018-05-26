import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Tail} from 'tail';
import screen, { enableMouse } from '/screen';
import { statSync } from 'fs';

// It might be nice to render the entire log file. However this is probably (?) unnecessary and
// (more to the point) for complex/active services like app, the log file is quite large and, if we
// try to load it all into the `log` component, can take several seconds to render.
// We can probably afford a larger scrollback after the logs have grown though:
// https://github.com/mixmaxhq/custody/issues/49.
const INITIAL_SCROLLBACK = 100 /* lines */;
const SCROLLBACK = 1000 /* lines */;

export default class ProcessLog extends Component {
  componentDidMount() {
    this._isMounted = true;
    // See comment about `mouse` in `render`.
    enableMouse(false);
    this.startTailing();
  }

  componentWillUnmount() {
    this.stopTailing();
    enableMouse(true);
    this._isMounted = false;
  }

  startTailing() {
    // Safety belts.
    if (this.tail) return;

    const { name, logfile } = this.props.process;

    function onTailError(err) {
      screen.debug(`Could not tail ${name}'s logfile ${logfile}:`, err);
    }

    // We need to check that the logfile exists before initializing `Tail` because we can't handle
    // such an error if we let `Tail` emit it: https://github.com/lucagrulla/node-tail/issues/66
    try {
      statSync(logfile);
    } catch (e) {
      if (e.code === 'ENOENT') {
        // This logfile does not exist (has disappeared?) for some reason:
        // https://github.com/mixmaxhq/custody/issues/6 Restart the process to fix.
        this.log.add(`${name}'s logfile is missing. Restarting process to fix…`);
        this.props.process.restart()
          .then(() => {
            if (!this._isMounted) return;
            this.startTailing();
          })
          .catch((err) => {
            if (!this._isMounted) return;
            this.log.add(`Could not restart ${name}: ${err}`);
          });
      } else {
        onTailError(e);
      }
      return;
    }

    // As documented on `INITIAL_SCROLLBACK`, we can't render the entire log file. However, the
    // 'tail' module lacks a `-n`-like option to get the last `INITIAL_SCROLLBACK` lines. So what we
    // do is load the entire file, but wait to render only the last `INITIAL_SCROLLBACK` lines, then
    // start streaming.
    this.tail = new Tail(logfile, { fromBeginning: true });

    let logs = [];
    let initialDataFlushed = false;
    this.tail
      .on('line', (line) => {
        if (initialDataFlushed) {
          this.log.add(line);
        } else {
          logs.push(line);
          if (logs.length > INITIAL_SCROLLBACK) logs.shift();
        }
      })
      .on('historicalDataEnd', () => {
        logs.forEach((line) => this.log.add(line));
        logs = [];
        initialDataFlushed = true;
      })
      .on('error', onTailError);
  }

  stopTailing() {
    if (this.tail) {
      this.tail.unwatch();
      this.tail = null;
    }
  }

  render() {
    return (
      // Unfortunately react-blessed@0.2.1 doesn't support `React.createRef`.
      <log
        ref={(log) => this.log = log}
        {...this.props.layout}
        // Enables 'keypress' events, for the use of `keys`.
        input
        // Pass `keys` to enable the use of the up and down arrow keys to navigate the keyboard.
        // Note that we do _not_ pass `mouse`, because having blessed scroll will a) break native
        // text selection https://github.com/chjj/blessed/issues/263 b) be too fast
        // https://github.com/mixmaxhq/custody/issues/37#issuecomment-390855414. Instead, we disable
        // blessed's mouse handling while this component is mounted to let the terminal take over
        // scrolling.
        keys
        focused={this.props.focused}
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

ProcessLog.propTypes = {
  process: PropTypes.object.isRequired,
  focused: PropTypes.bool,
  layout: PropTypes.object
};

ProcessLog.defaultProps = {
  focused: false
};
