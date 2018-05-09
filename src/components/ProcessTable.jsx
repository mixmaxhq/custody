import _ from 'underscore';
import fuzzy from 'fuzzy';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { regexLastIndexOf } from '../utils/string';
import screen from '../screen';

function filterProcesses(search, processes) {
  return fuzzy.filter(search, processes, {
    pre: '{underline}',
    post: '{/underline}',
    extract: (process) => process.name
  }).map((result) => {
    const process = _.clone(result.original);
    // Overwrite the process name with the tagged version.
    process.name = result.string;
    return process;
  });
}

function tableData(processes) {
  if (_.isEmpty(processes)) return processes;

  const headers = _.without(_.keys(processes[0]), 'logfile');
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

export default class ProcessTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      processes: props.processes
    };
  }

  // I don't think that react-blessed@0.2.1 supports `getDerivedStateFromProps`, that wasn't being
  // called. Too bad since this means we have to derive processes in the constructor (since this
  // isn't called with initial props) and here. react-blessed doesn't support
  // `UNSAFE_componentWillReceiveProps` either so hopefully this won't stop working in react@17. :\
  componentWillReceiveProps(nextProps) {
    this.setState({ processes: filterProcesses(this.state.search, nextProps.processes) });
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
        if (!newSearch) {
          // Release Esc.
          screen.grabKeys = false;
        }
        return { search: newSearch, processes: filterProcesses(newSearch, props.processes) };
      });

    } else if (key.full === 'escape') {
      // Release Esc.
      screen.grabKeys = false;
      this.setState({ search: '', processes: this.props.processes });

    } else if (ch && !_.contains(['enter', 'return'], key.name)) {
      this.setState((prevState, props) => {
        const newSearch = prevState.search + ch;
        // Grab Esc to clear the search, instead of quitting the program.
        screen.grabKeys = true;
        return { search: newSearch, processes: filterProcesses(newSearch, props.processes) };
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
