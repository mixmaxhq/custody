import _ from 'underscore';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ProcessTable from './ProcessTable';
import screen from './screen';

export default class Console extends Component {
  constructor(props) {
    super(props);

    this.state = {
      processes: []
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
      .then((processInfo) => this.setState({ processes: processStatus(processInfo) }))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }

  onSelect(...args) {
    const index = _.last(args);
    screen.debug('selected', index);
  }

  render() {
    return (
      <ProcessTable processes={this.state.processes} onSelect={::this.onSelect}/>
    );
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
      description: proc.description
    };
  });
}


