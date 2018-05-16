import _ from 'underscore';
import { effectiveState } from '../utils/process';
import { promisify } from 'promise-callbacks';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import notifier from 'node-notifier';
import ProcessDetails from './processDetails';
import ProcessTable from './ProcessTable';
import screen from '../screen';

const exec = promisify(require('child_process').exec);

function processHasChangedState(prevProps) {
  return (process) => {
    const previousProcess = _.findWhere(prevProps.processes, { name: process.name });

    // New processes don't count as having *changed* state.
    if (!previousProcess) return false;

    const { state: currentState } = effectiveState(process);
    const { state: previousState } = effectiveState(previousProcess);
    return (currentState !== previousState);
  };
}

export default class Console extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedProcess: null
    };
  }

  // I don't think that react-blessed@0.2.1 supports `getDerivedStateFromProps`, that wasn't being
  // called. react-blessed doesn't support `UNSAFE_componentWillReceiveProps` either so hopefully
  // this won't stop working in react@17. :\
  componentWillReceiveProps() {
    // ???(jeff): Is `props` equivalent to the argument to `componentWillReceiveProps` here? Which
    // is appropriate to use?
    this.setState((prevState, props) => {
      const selectedProcess = prevState.selectedProcess && _.findWhere(props.processes, {
        name: prevState.selectedProcess.name
      });
      return { selectedProcess };
    });
  }

  componentDidUpdate(prevProps) {
    if (!this.props.notifications) return;

    this.props.processes.filter(processHasChangedState(prevProps)).forEach((process) => {
      const { state, description } = effectiveState(process);
      notifier.notify({
        title: `${process.name} is now ${state}`,
        message: description,
        closeLabel: 'Close',
        actions: 'Show'
      }, (err, response) => {
        if (err) {
          screen.debug('Error showing notification', err);
        } else if (response === 'activate') {
          // Activate the Terminal if necessary. We should be able to pass the `activate` option
          // through `notifier.notify` to `terminal-notifier` but it doesn't work for some reason. :\
          exec('open -a Terminal').catch((err) => screen.debug('Could not activate Terminal:', err));

          // Show the logs for the (current version of) the process if it's still running (safety
          // belts--the user may have waited a bit to click this notification).
          process = _.findWhere(this.props.processes, { name: process.name });
          if (process) {
            this.setState({ selectedProcess: process });
          }
        }
      });
    });
  }

  onSelect(process) {
    this.setState({ selectedProcess: process });
  }

  onDeselect() {
    this.setState({ selectedProcess: null });
  }

  render() {
    return (
      this.state.selectedProcess ?
        <ProcessDetails
          process={this.state.selectedProcess}
          onClose={::this.onDeselect}
        /> :
        <ProcessTable
          processes={this.props.processes}
          onSelect={::this.onSelect}
        />
    );
  }
}

Console.propTypes = {
  processes: PropTypes.array.isRequired,
  notifications: PropTypes.bool
};

Console.defaultProps = {
  notifications: false
};
