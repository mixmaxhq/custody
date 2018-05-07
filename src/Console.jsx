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

  // I don't think that react-blessed@0.2.1 supports `getSnapshotBeforeUpdate`, that wasn't being
  // called. Luckily I think that it doesn't use async rendering either so not strictly necessary to
  // use the new lifecycle method. react-blessed doesn't support `UNSAFE_componentWillUpdate` either
  // though so hopefully this won't stop working in react@17. :\
  componentWillUpdate() {
    // This will be 0 when the table is empty, 1-indexed thereafter.
    if (this.table.selected) {
      // Maintain the scroll position when the table re-renders. It's not clear to me whether
      // react-blessed's failure to do this out of the box is its fault
      // (https://github.com/Yomguithereal/react-blessed/issues/53 says that it "recreat[es] the
      // tree with each render call") or blessed's fault (since I'm not sure that react-blessed
      // is responsible for rendering the table rows; react-blessed might have no choice but to call
      // `setData` on the table, which might reset all the items).
      this.selectedProcess = this.state.processes[this.table.selected - 1];
    }
  }

  componentDidUpdate() {
    if (this.selectedProcess) {
      const processIndex = _.findIndex(this.state.processes, { name: this.selectedProcess.name });
      if (processIndex > -1) {
        this.table.select(processIndex + 1); // `selected` is 1-indexed since 0 is the headers.
      }
      this.selectedProcess = null;
    }
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

  // This event handler is called when the user hits Enter or double-clicks on a row.
  onSelect(...args) {
    const index = _.last(args);
    screen.debug('selected', index);
  }

  // This (undocumented) event handler is called when the scroll position changes using the mouse
  // or up/down arrows.
  onSelectItem(...args) {
    const index = _.last(args);
    if ((index === 0) && !_.isEmpty(this.state.processes)) {
      // When using the mouse to scroll, blessed lets the scroll go off the top of the table, as
      // represented by the headers (at position 0) being selected (even though they don't show as
      // selected). Prevent this.
      this.table.select(1);
    }
  }

  render() {
    return (
      <listtable
        // Unfortunately react-blessed@0.2.1 doesn't support `React.createRef`.
        ref={(table) => this.table = table}
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
        onSelect={::this.onSelect}
        onSelectItem={::this.onSelectItem}
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
