import _ from 'underscore';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ProcessDetails from './processDetails';
import ProcessTable from './ProcessTable';

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
  processes: PropTypes.array.isRequired
};
