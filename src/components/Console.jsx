import _ from 'underscore';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ProcessDetails from './processDetails';
import ProcessTable from './ProcessTable';

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
  }

  componentWillUnmount() {
    clearInterval(this.updateTimer);
  }

  updateStatus() {
    this.props.client.getAllProcessInfo()
      .then((processInfo) => {
        const newProcesses = deriveProcesses(processInfo);
        this.setState((prevState) => {
          const selectedProcess = prevState.selectedProcess && _.findWhere(newProcesses, {
            name: prevState.selectedProcess.name
          });
          return { processes: newProcesses, selectedProcess };
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

function deriveProcesses(processInfo) {
  return _.map(processInfo, (proc) => {
    // Not sure how to sort columns using `ink-table`. I think data keys are enumerated in order of
    // addition.
    return {
      name: (proc.group === proc.name) ? proc.name : `${proc.group}:${proc.name}`,
      state: proc.statename,
      description: proc.description,
      logfile: proc.logfile
    };
  });
}


