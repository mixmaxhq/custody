import _ from 'underscore';
import { getBackCommand, getForwardCommand } from '/models/commands/navigation';
import CommandMenu from '/components/commandMenu/index';
import commands, {addCommandSet, removeCommandSet} from '/components/commandMenu/commands';
import FileLog from './FileLog';
import * as history from '/utils/history';
import { promisify } from 'promise-callbacks';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import notifier from 'node-notifier';
import ProcessDetails from './processDetails';
import ProcessTable from './ProcessTable';
import screen from '/screen';
import { didShutdownCleanly } from '/shutdownTracking';
import { STATES } from '/models/Process/index';
import { load, store } from '/utils/storage';

const exec = promisify(require('child_process').exec);

function processHasChangedIdentity(process, prevProcess) {
  // If it's the exact same process, or no process is selected at both points in time, no change.
  if (process === prevProcess) return false;

  // If a process is selected where one wasn't previously selected, or vice versa, change.
  if ((!prevProcess && process) || (prevProcess && !process)) return true;

  // If this is a distinct process (not a new copy with the same name), change.
  return (process.name !== prevProcess.name);
}

function processHasChangedState(prevProps) {
  return (process) => {
    const previousProcess = _.findWhere(prevProps.processes, { name: process.name });

    // New processes don't count as having *changed* state.
    if (!previousProcess) return false;

    const { state: currentState } = process.effectiveState;
    const { state: previousState } = previousProcess.effectiveState;
    return (currentState !== previousState);
  };
}

const COMMAND_SET_NAME = 'console';

function getCommandSet(component) {
  // NOTE: If you reference any new properties of `component.state` below, make sure to call
  // `updateOwnCommandSet` from `componentDidUpdate` if/when that state changes.

  let maintailDescription;
  if (component.state.tailingMainLogfile) {
    maintailDescription = 'switch to/{underline}from{/} maintail';
  } else {
    maintailDescription = 'switch {underline}to{/}/from maintail';
  }

  return _.compact([
    // The navigation commands are for switching between selected processes so only show them if
    // we're currently displaying an individual process.
    !component.state.tailingMainLogfile && getBackCommand(),
    !component.state.tailingMainLogfile && getForwardCommand(),
    ['tab', {
      verb: maintailDescription,
      toggle() {
        component.setState(({ tailingMainLogfile }) => ({ tailingMainLogfile: !tailingMainLogfile }));
      }
    }]
  ]);
}

export default class Console extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tailingMainLogfile: false,
      selectedProcess: null,
      commands
    };
  }

  /**
   * Permit child components to add/remove command sets, and re-render the command menu when they
   * do so.
   */
  getChildContext() {
    return {
      commands: this.state.commands,
      addCommandSet: ::this.addCommandSet,
      removeCommandSet: ::this.removeCommandSet
    };
  }

  addCommandSet(name, commands) {
    this.setState({commands: addCommandSet(name, commands)});
  }

  removeCommandSet(name) {
    this.setState({commands: removeCommandSet(name)});
  }

  updateOwnCommandSet() {
    this.addCommandSet(COMMAND_SET_NAME, getCommandSet(this));
  }

  componentDidMount() {
    this.updateOwnCommandSet();

    this._unlistenToHistory = history.listen(::this.onLocationChange);

    // Our various children have to be focused--not our root element--in order to enable keyboard
    // navigation thereof. But then this means that we have to listen for the children's keypress
    // events, using the special bubbling syntax https://github.com/chjj/blessed#event-bubbling, and
    // have to do so manually (ugh): https://github.com/Yomguithereal/react-blessed/issues/61
    this.el.on('element keypress', ::this.onElementKeypress);

    // Restore the last-selected process when we load, if we didn't cleanly shut down.
    // Perhaps at some later point we will wish to always restore the last-selected process.
    if (didShutdownCleanly()) {
      // If we did shutdown cleanly, clear the selected process so as to not restore it if/when
      // next we crash.
      store('selectedProcess', null);
      return;
    }

    // HACK(jeff): This could theoretically return before the Console had been initialized with any
    // processes. However we wait to render it until we have the processes.
    load('selectedProcess')
      .then((selectedProcessName) => {
        // If the user has already selected a process, don't override that.
        if (this.state.selectedProcess) return;

        // If the user had not selected a process, ignore.
        if (!selectedProcessName) return;

        const selectedProcess = _.findWhere(this.props.processes, {
          name: selectedProcessName
        });
        if (selectedProcess) this.setState({ selectedProcess });
      })
      .catch(() => {
        // Ignore failures to load the selected process, it's a nicety to restore it.
      });
  }

  componentWillUnmount() {
    if (this._unlistenToHistory) {
      this._unlistenToHistory();
      this._unlistenToHistory = null;
    }
    this.removeCommandSet(COMMAND_SET_NAME);
  }

  onLocationChange({ process: processName }) {
    const selectedProcess = _.findWhere(this.props.processes, {
      name: processName
    });

    // This conditional is safety belts--we always assume locations to reference processes for the
    // moment.
    if (selectedProcess) this.setState({ selectedProcess });

    this.updateOwnCommandSet();
  }

  // Whatever keys we handle here, should also be withheld from the process table in
  // `tableShouldHandleKeypress` below.
  onElementKeypress(el, ch, key) {
    // Forward keypresses to the command menu since we have to keep our various children focused.
    this.commandMenu.onKeypress(key);
  }

  tableShouldHandleKeypress(ch, key) {
    return !this.commandMenu.willHandleKeypress(key);
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

  componentDidUpdate(prevProps, prevState) {
    const selectedProcessIsNew = processHasChangedIdentity(
      this.state.selectedProcess,
      prevState.selectedProcess
    );
    if (selectedProcessIsNew) {
      // Only store the selected process if it actually changed, to avoid blowing away the value
      // in response to another change.
      store('selectedProcess', this.state.selectedProcess && this.state.selectedProcess.name);
    }

    if (this.props.notifications) {
      this.props.processes
        .filter(processHasChangedState(prevProps))
        .forEach(::this.notifyOfProcessChange);
    }

    if (this.state.tailingMainLogfile !== prevState.tailingMainLogfile) {
      // Update the commands when state values they reference change.
      this.updateOwnCommandSet();
    }
  }

  notifyOfProcessChange(process) {
    const { state, description } = process.effectiveState;

    // Don't display a notification if the process is starting since it'll immediately transition
    // to another state.
    if (state === STATES.STARTING) return;

    notifier.notify({
      title: `${process.name} is now ${state}`,
      message: description,
      closeLabel: 'Close',
      actions: 'Show'
    }, (err, response) => {
      if (err) {
        screen.debug('Error showing notification:', err, process);
      } else if (response === 'activate') {
        // Activate the Terminal if necessary. We should be able to pass the `activate` option
        // through `notifier.notify` to `terminal-notifier` but it doesn't work for some reason. :\
        exec('open -a Terminal').catch((err) => screen.debug('Could not activate Terminal:', err));

        // Show the logs for the (current version of) the process if it's still running (safety
        // belts--the user may have waited a bit to click this notification).
        process = _.findWhere(this.props.processes, { name: process.name });
        if (process) {
          this.setState({ selectedProcess: process });
        }
      }
    });
  }

  onSelect(newProcess) {
    const newLocation = {
      process: newProcess.name
    };

    // Since we don't represent the process table in the history, we may navigate to the same
    // location twice if the user closes and then reopens the same process. Make sure that we
    // avoid creating a duplicate history item in this case.
    const currentLocation = history.currentLocation();
    let locationIsNew;
    if (!currentLocation) {
      locationIsNew = true;
    } else {
      locationIsNew = newLocation.process !== currentLocation.process;
    }

    // This will set `selectedProcess` via `onLocationChange` whether we `push` OR `replace`.
    if (locationIsNew) {
      history.push(newLocation);
    } else {
      history.replace(newLocation);
    }
  }

  onDeselect() {
    // HACK(jeff): We don't include the process table in the history, allowing the user to navigate
    // directly between selected processes.
    this.setState({ selectedProcess: null });
  }

  render() {
    return (
      <box ref={(el) => this.el = el} >
        {this.state.tailingMainLogfile ?
          <FileLog
            logfile={this.props.mainLogfile}
            focused={true}
          />
          :
          (this.state.selectedProcess ?
            <ProcessDetails
              process={this.state.selectedProcess}
              onClose={::this.onDeselect}
            />
            :
            <ProcessTable
              processes={this.props.processes}
              onSelect={::this.onSelect}
              shouldHandleKeypress={::this.tableShouldHandleKeypress}
            />
          )}
        <CommandMenu
          ref={(menu) => this.commandMenu = menu}
        />
      </box>
    );
  }
}

Console.propTypes = {
  mainLogfile: PropTypes.string.isRequired,
  processes: PropTypes.array.isRequired,
  notifications: PropTypes.bool
};

Console.defaultProps = {
  notifications: false
};

Console.childContextTypes = {
  commands: PropTypes.array,
  addCommandSet: PropTypes.func.isRequired,
  removeCommandSet: PropTypes.func.isRequired
};
