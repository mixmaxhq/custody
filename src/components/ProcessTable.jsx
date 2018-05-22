import _ from 'underscore';
import { displayName, effectiveState } from '../utils/process';
import fuzzy from 'fuzzy';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { regexLastIndexOf } from '../utils/string';
import screen from '../screen';

export const HEADERS = ['name', 'state', 'description'];

function getDerivedProcessesFromProps({ processes }) {
  return _.map(processes, (process) => {
    return {
      ...process,
      // Rename the process to mimic `supervisorctl status`.
      displayName: displayName(process)
    };
  });
}

function filterProcesses(search, processes) {
  return fuzzy.filter(search, processes, {
    pre: '{underline}',
    post: '{/underline}',
    extract: (process) => process.displayName
  }).map((result) => {
    return {
      ...result.original,
      // Record the tagged name.
      displayName: result.string
    };
  });
}

function tableData(processes) {
  if (_.isEmpty(processes)) return processes;

  return [
    HEADERS,
    ...processes.map((process) => {
      return HEADERS.map((header) => {
        let cellValue;
        switch (header) {
          case 'name':
            cellValue = process['displayName'];
            break;
          // For state and description, prefer information reported by the child process if available.
          case 'state':
          case 'description':
            cellValue = effectiveState(process)[header];
            break;
          default:
            cellValue = process[header];
            break;
        }
        return cellData(header, cellValue);
      });
    })
  ];
}

function cellData(header, value) {
  switch (header) {
    case 'state':
      if (value !== 'RUNNING') {
        // TODO(jeff): Figure out how to maintain this when the row is selected. Weird that it
        // doesn’t' work like in `ProcessSummary`.
        value = `{red-fg}${value}{/}`;
      }
  }
  return value;
}

export default class ProcessTable extends Component {
  // I don't think that react-blessed@0.2.1 supports `getDerivedStateFromProps`, it doesn't automatically
  // call this. This is too bad since this means we have to derive processes in the constructor and
  // in `componentWillReceiveProps`. But at least we can mimic the upcoming API.
  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      search: prevState.search,
      processes: filterProcesses(prevState.search, getDerivedProcessesFromProps(nextProps))
    };
  }

  constructor(props) {
    super(props);

    this.state = ProcessTable.getDerivedStateFromProps(props, {
      search: '',
      processes: []
    });
  }

  // react-blessed doesn't support `UNSAFE_componentWillReceiveProps` so hopefully this won't stop
  // working in react@17. :\
  componentWillReceiveProps() {
    // ???(jeff): Is `props` equivalent to the argument to `componentWillReceiveProps` here? Which
    // is appropriate to use?
    this.setState((prevState, props) => ProcessTable.getDerivedStateFromProps(props, prevState));
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

  onKeypress(ch, key) {
    // `ch` will only be defined if the key was a single character input vs. e.g. the down arrow.
    // For 'backspace' and 'enter'/'return', `ch` is some kind of control character though, annoyingly.
    // Also on OS X the enter key emits *two* keypresses in a row, one for 'enter' _and_ 'return'!
    if ((key.name === 'backspace') || (key.full === 'C-u' /* Command-Delete */)) {
      this.setState((prevState, props) => {
        // By default slice off the very last character.
        let terminalIndex = -1;
        if (key.meta) {
          // If Option (`meta`) is pressed, clear to the last word boundary like regular OS X text
          // fields do.
          // HACK(jeff): Not sure if this is OS X-specific behavior, also I'm not sure how we'd read
          // Option if I didn't have "Use Option as Meta key" checked in Terminal.app's preferences.

          // Trim to ensure that we skip from e.g. "hello " to "". "hello-" skips to "hello" though,
          // interestingly.
          const search = prevState.search.trim();
          terminalIndex = regexLastIndexOf(search, /\b(?!$)/);
        } else if (key.full === 'C-u') {
          // If Command is pressed, clear the line like regular OS X text fields do.
          // HACK(jeff): Not sure if this is OS X-specific behavior.
          terminalIndex = 0;
        }
        const newSearch = prevState.search.slice(0, terminalIndex);
        return ProcessTable.getDerivedStateFromProps(props, { ...prevState, search: newSearch });
      });

    } else if (key.full === 'escape') {
      this.setState(ProcessTable.getDerivedStateFromProps(this.props, { ...this.state, search: '' }));

    } else if (ch && !_.contains(['enter', 'return'], key.name)) {
      this.setState((prevState, props) => {
        const newSearch = prevState.search + ch;
        return ProcessTable.getDerivedStateFromProps(props, { ...prevState, search: newSearch });
      });
    }
  }

  onSelect(...args) {
    if (!this.props.onSelect) return;

    // The table is 1-indexed.
    const index = _.last(args);
    this.props.onSelect(this.state.processes[index - 1]);
  }

  onSelectItem(...args) {
    const index = _.last(args);
    if ((index === 0) && !_.isEmpty(this.state.processes)) {
      // When using the mouse to scroll, blessed lets the scroll go off the top of the table, as
      // represented by the headers (at position 0) being selected (even though they don't show as
      // selected). Prevent this.
      this.table && this.table.select(1);
    }
  }

  render() {
    return (
      <Fragment>
        <listtable
          // Unfortunately react-blessed@0.2.1 doesn't support `React.createRef`.
          ref={(table) => this.table = table}
          // TODO(jeff): Clicking seems to be (have become?) finicky, sometimes the process details
          // opens and then immediately closes.
          mouse
          keys
          focused
          align='left'
          style={{
            selected: { inverse: true },
            header: { bold: true }
          }}
          tags // Enables cell content to contain color tags.
          data={tableData(this.state.processes)}
          onKeypress={::this.onKeypress}
          // This event handler is called when the user hits Enter or double-clicks on a row.
          onSelect={::this.onSelect}
          // This (undocumented) event handler is called when the scroll position changes using the
          // mouse or up/down arrows.
          onSelectItem={::this.onSelectItem}
        />
        {/* Show the current search query over the table headers. */}
        {!_.isEmpty(this.state.search) && <box height={1}>{this.state.search}</box>}
      </Fragment>
    );
  }
}

ProcessTable.propTypes = {
  processes: PropTypes.array.isRequired,
  onSelect: PropTypes.func
};
