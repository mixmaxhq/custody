import _ from 'underscore';
import fuzzy from 'fuzzy';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { regexLastIndexOf } from '/utils/string';
import xor from 'lodash.xor';

export const HEADERS = ['name', 'state', 'description'];

function filterProcesses(search, processes) {
  return fuzzy.filter(search, processes, {
    pre: '{underline}',
    post: '{/underline}',
    extract: (process) => process.displayName
  }).map((result) => {
    return {
      process: result.original,
      displayName: result.string
    };
  });
}

function processesAreEqual(listA, listB) {
  // ???(jeff): Maybe we should do a field-wise comparison here? Wonder how that would compare in
  // terms of performance and correctness (since we'd be using outdated process objects if we didn't
  // update).
  return _.isEmpty(xor(listA, listB));
}

function tableData(filteredProcesses) {
  if (_.isEmpty(filteredProcesses)) return filteredProcesses;

  return [
    HEADERS,
    ...filteredProcesses.map(({ process, displayName }) => {
      return HEADERS.map((header) => {
        let cellValue;
        switch (header) {
          case 'name':
            cellValue = displayName;
            break;
          // For state and description, prefer information reported by the child process if available.
          case 'state':
          case 'description':
            cellValue = process.effectiveState[header];
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
  constructor(props) {
    super(props);

    this.filterProcesses = memoize(filterProcesses, (a, b) => {
      if (_.isArray(a) && _.isArray(b)) {
        return processesAreEqual(a, b);
      } else {
        return a === b;
      }
    });

    this.state = {
      search: ''
    };
  }

  filteredProcesses(justProcesses = true) {
    const results = this.filterProcesses(this.state.search, this.props.processes);
    if (justProcesses) {
      return _.pluck(results, 'process');
    }
    return results;
  }

  selectBestMatch() {
    const processes = this.filteredProcesses();
    if (this.state.search) {
      const lcSearch = this.state.search.toLowerCase();
      // First look for an exact match.
      const exactMatchIndex = _.findIndex(processes, { name: lcSearch });
      if (exactMatchIndex > -1) return void this.table.select(exactMatchIndex + 1);

      // Then look for a prefix match.
      const prefixMatch = processes.find((process) => process.displayName.startsWith(lcSearch));
      if (prefixMatch) {
        const prefixMatchIndex = _.findIndex(processes, { name: prefixMatch.displayName });
        return void this.table.select(prefixMatchIndex + 1);
      }

      // Finally, look for a whole substring match.
      const substringMatch = processes.find((process) => process.displayName.includes(lcSearch));
      if (substringMatch) {
        const substringMatchIndex = _.findIndex(processes, { name: substringMatch.displayName });
        return void this.table.select(substringMatchIndex + 1);
      }
    }

    if (this.selectedProcess) {
      const processIndex = _.findIndex(processes, { name: this.selectedProcess.name });
      if (processIndex > -1) {
        return void this.table.select(processIndex + 1); // `selected` is 1-indexed since 0 is the headers.
      }
      this.selectedProcess = null;
    }

    // Fall back to selecting the first item.
    return void this.table.select(1);
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
      this.selectedProcess = this.filteredProcesses()[this.table.selected - 1];
    }
  }

  componentDidUpdate() {
    this.selectBestMatch();
  }

  onKeypress(ch, key) {
    // `ch` will only be defined if the key was a single character input vs. e.g. the down arrow.
    // For 'backspace' and 'enter'/'return', `ch` is some kind of control character though, annoyingly.
    // Also on OS X the enter key emits *two* keypresses in a row, one for 'enter' _and_ 'return'!
    if ((key.name === 'backspace') || (key.full === 'C-u' /* Command-Delete */)) {
      this.setState((prevState) => {
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
        return { search: newSearch };
      });

    } else if (key.full === 'escape') {
      this.setState({ search: '' });

    } else if (ch &&
      this.props.shouldHandleKeypress(ch, key) && !_.contains(['enter', 'return'], key.name)) {

      this.setState((prevState) => {
        const newSearch = prevState.search + ch;
        return { search: newSearch };
      });
    }
  }

  onSelect(...args) {
    if (!this.props.onSelect) return;

    // The table is 1-indexed.
    const index = _.last(args);
    this.props.onSelect(this.filteredProcesses()[index - 1]);
  }

  onSelectItem(...args) {
    const index = _.last(args);
    if ((index === 0) && !_.isEmpty(this.filteredProcesses())) {
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
          data={tableData(this.filteredProcesses(false /* justProcesses */))}
          // By default blessed scrolls the table two rows on each wheel event
          // https://github.com/chjj/blessed/pull/183/files#diff-41616b4798f161164091b835a5117734R96
          // which makes it mad hard to select things.
          scrollStep={1}
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
  onSelect: PropTypes.func,
  shouldHandleKeypress: PropTypes.func
};

ProcessTable.defaultProps = {
  shouldHandleKeypress: () => true
};
