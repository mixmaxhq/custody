import _ from 'underscore';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ProcessDetails from './processDetails';
import processServer from '../processServer';
import ProcessTable from './ProcessTable';
import screen from '../screen';

export default class Console extends Component {
  constructor(props) {
    super(props);

    this.state = {
      processes: [],
      selectedProcess: null
    };
  }

  componentDidMount() {
    // Not sure what a good update interval is here.
    this.updateTimer = setInterval(() => this.updateStatus(), 1000);
    processServer.start();
    this.listenForStateChanges();
  }

  componentWillUnmount() {
    clearInterval(this.updateTimer);
    processServer.stop();
  }

  listenForStateChanges() {
    if (this.listeningForStateChanges) return;

    // TODO(jeff): I feel like this should be in a model somewhere.
    ['restart', 'crash'].forEach((event) => {
      processServer.on(event, (data) => {
        this.setState((prevState) => {
          // TODO(jeff): Would be cooler to look up the process by its PID (if the event passed that),
          // since then the client would require less configuration / wouldn't have to match the
          // supervisor names.
          const process = _.findWhere(prevState.processes, { name: data.id });
          // We shouldn't hit this error because we wait until we've retrieved the processes to
          // start listening.
          if (process) {
            if (event === 'restart') {
              // TODO(jeff): Also clear these values if the process exits cleanly e.g. we stop the
              // service in supervisor.
              delete process.childState;
              delete process.childDescription;
            } else if (event === 'crash') {
              // TODO(jeff): Determine best label here. This matches Supervisor when Supervisor
              // gives up restarting e.g. "exited too quickly".
              process.childState = 'FATAL';
              process.childDescription = data.description;
            }
          } else {
            screen.debug(`Received message "${event}" from unknown process "${data.id}"; ` +
              'is it controlled by Supervisor?');
          }
          // Update both `selectedProcess` and `processes` as appropriate.
          return { processes: prevState.processes, selectedProcess: prevState.selectedProcess };
        });
      });
    });

    this.listeningForStateChanges = true;
  }

  updateStatus() {
    this.props.client.getAllProcessInfo()
      .then((processInfo) => {
        const newProcesses = deriveProcesses(processInfo, this.state.processes);
        this.setState((prevState) => {
          const selectedProcess = prevState.selectedProcess && _.findWhere(newProcesses, {
            name: prevState.selectedProcess.name
          });
          return { processes: newProcesses, selectedProcess };
        }, () => {
          // Start listening for state changes now that we've retrieved the processes (and can
          // thus apply the change).
          this.listenForStateChanges();
        });
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
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
          processes={this.state.processes}
          onSelect={::this.onSelect}
        />
    );
  }
}

Console.propTypes = {
  client: PropTypes.object.isRequired
};

function deriveProcesses(processInfo, currentProcesses) {
  return _.map(processInfo, (proc) => {
    const name = (proc.group === proc.name) ? proc.name : `${proc.group}:${proc.name}`;
    const currentProcess = _.findWhere(currentProcesses, { name });

    // These keys will be enumerated (in table rows) in order of addition.
    return {
      name,
      state: proc.statename,
      description: proc.description,
      logfile: proc.logfile,
      ..._.pick(currentProcess, 'childState', 'childDescription')
    };
  });
}


