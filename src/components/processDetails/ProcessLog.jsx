import _ from 'underscore';
import FileLog from '/components/FileLog';
import { plugins } from '/registry/index';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import screen from '/screen';
import {statSync} from 'fs';

export default class ProcessLog extends Component {
  constructor(props) {
    super(props);

    this.state = {
      logfileIsLoaded: false
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadLogfile();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  loadLogfile() {
    const { name, logfile } = this.props.process;

    // Make sure that the process' logfile exists for the benefit of `FileLog`.
    try {
      statSync(logfile);
    } catch (e) {
      if (e.code === 'ENOENT') {
        // This logfile does not exist (has disappeared?) for some reason:
        // https://github.com/mixmaxhq/custody/issues/6 Restart the process to fix.
        screen.debug(`${name}'s logfile is missing. Restarting process to fix…`);
        this.props.process.restart()
          .then(() => {
            if (!this._isMounted) return;
            this.loadLogfile();
          })
          .catch((err) => {
            if (!this._isMounted) return;
            screen.debug(`Could not restart ${name}: ${err}`);
          });
      } else {
        screen.debug(`Could not tail ${name}'s logfile ${logfile}:`, e);
      }
      return;
    }

    this.setState({ logfileIsLoaded: true });
  }

  onMessage(message) {
    _.invoke(plugins, 'log', this.props.process, message);
  }

  render() {
    if (!this.state.logfileIsLoaded) return null;

    return (
      <FileLog
        logfile={this.props.process.logfile}
        focused={this.props.focused}
        layout={this.props.layout}
        onMessage={::this.onMessage}
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
