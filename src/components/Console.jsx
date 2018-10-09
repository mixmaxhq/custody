import _ from 'underscore';
import CommandMenu from '/components/commandMenu/index';
import commands, {addCommandSet, removeCommandSet} from '/components/commandMenu/commands';
import FileLog from './FileLog';
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
  let maintailDescription;
  if (component.state.tailingMainLogfile) {
    maintailDescription = 'switch to/{underline}from{/} maintail';
  } else {
    maintailDescription = 'switch {underline}to{/}/from maintail';
  }

  return [
    ['tab', {
      verb: maintailDescription,
      toggle() {
        component.setState(({ tailingMainLogfile }) => ({ tailingMainLogfile: !tailingMainLogfile }));
      }
    }]
  ];
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

  componentDidMount() {
    this.addCommandSet(COMMAND_SET_NAME, getCommandSet(this));

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
    this.removeCommandSet(COMMAND_SET_NAME);
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
    if (this.state.selectedProcess !== prevState.selectedProcess) {
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
      this.addCommandSet(COMMAND_SET_NAME, getCommandSet(this));
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

  onSelect(process) {
    this.setState({ selectedProcess: process });
  }

  onDeselect() {
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
