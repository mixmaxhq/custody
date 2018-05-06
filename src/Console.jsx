import _ from 'underscore';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
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

  render() {
    return (
      <listtable
        mouse
        keys
        focused
        align='left'
        style={{
          item: { fg: 'black' },
          selected: { fg: 'white', bg: 'black' },
          header: { bold: true }
        }}
        tags // Enables cell content to contain color tags.
        data={tableData(this.state.processes)}
        onSelect={ (...args) => screen.debug('selected', args[1]) }
      />
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

function tableData(processes) {
  if (_.isEmpty(processes)) return processes;

  const headers = Object.keys(processes[0]);
  return [
    headers,
    ...processes.map((proc) => {
      return headers.map((header) => cellData(header, proc[header]));
    })
  ];
}

function cellData(header, value) {
  switch (header) {
    case 'state':
      if (value !== 'RUNNING') {
        value = `{red-fg}${value}{/}`;
      }
  }
  return value;
}
