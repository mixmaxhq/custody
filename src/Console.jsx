import _ from 'underscore';
import Log from './Log';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
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
    // TODO(jeff): Deselect the process if, somehow, it was not found in the process info after
    // updating. Also note that `this.state.selectedProcess` doesn't change after updating, which
    // is important, because (I think) that's what keeps us from re-rendering `Log`.
    this.props.client.getAllProcessInfo()
      .then((processInfo) => this.setState({ processes: processStatus(processInfo) }))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }

  onSelect(...args) {
    // The table is 1-indexed.
    const index = _.last(args);
    this.setState({ selectedProcess: this.state.processes[index - 1] });
  }

  onDeselect() {
    this.setState({ selectedProcess: null });
  }

  render() {
    if (this.state.selectedProcess) {
      return <Log process={this.state.selectedProcess} onClose={::this.onDeselect}/>;
    } else {
      return <ProcessTable processes={this.state.processes} onSelect={::this.onSelect}/>;
    }
  }
}

Console.propTypes = {
  client: PropTypes.object.isRequired
};

function processStatus(processInfo) {
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


