/** @jsx h */
import _ from 'underscore';
import { Component, h, Text } from 'ink';
import PropTypes from 'prop-types';
import Table from 'ink-table';

export default class Console extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      status: []
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
      .then((processInfo) => this.setState({ status: status(processInfo) }))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }

  render(props, state) {
    return (
      <Table data={state.status} cell={StatusCell}/>
    );
  }
}

Console.propTypes = {
  client: PropTypes.object.isRequired
};

function status(processInfo) {
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

function StatusCell({ children }) {
  // HACK(jeff): Detect that this is the `state` column by examining the case of the text.
  // TODO(jeff): Use different cells per column.
  const value = children[0];
  const isState = value.toUpperCase() === value;
  if (isState && (value.trim() !== 'RUNNING')) {
    return <Text red>{children}</Text>;
  } else {
    return <Text>{children}</Text>;
  }
}

StatusCell.propTypes = {
  children: PropTypes.any.isRequired
};
