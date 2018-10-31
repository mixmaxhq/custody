import { clearShutdown, markCleanShutdown } from '/shutdownTracking';
import { createClient as createSupervisor, getMainLogfile } from '/utils/supervisor';
import Console from '/components/Console';
import {loadPlugins} from '/registry/index';
import restartApproachingOOM from '/oomWorkaround';
import ProcessMonitor from '/utils/processMonitor/index';
import React from 'react';
import screen, { initialize as initializeScreen } from '/screen';

export default async function start({ port, notifications }) {
  // We wait to `require` this until `start` is called because it does something on load that
  // prevents the process from naturally exiting (i.e. if the user does something else with the
  // `custody-cli` binary than running this).
  const { render } = require('react-blessed');

  let stopOOMCheck;

  function teardown() {
    screen.destroy();
    if (stopOOMCheck) stopOOMCheck();
  }

  try {
    clearShutdown();

    // Make sure to initialize the screen before using almost other API in this project since any
    // of them may log to the screen's debug window.
    initializeScreen();

    await loadPlugins();

    stopOOMCheck = restartApproachingOOM();

    const supervisor = createSupervisor(port);
    const mainLogfile = await getMainLogfile(supervisor);

    await new Promise((resolve, reject) => {
      // TODO(jeff): Distinguish between fatal and non-fatal errors.
      const processMonitor = new ProcessMonitor({ supervisor: { client: supervisor } }).on('error', reject);

      // Load all processes, then render, to avoid a flash as they load in (including probe states).
      processMonitor.start()
        .then(() => {
          function renderApp() {
            render(<Console
              mainLogfile={mainLogfile}
              processes={processMonitor.processes}
              notifications={notifications}
            />, screen);
          }
          renderApp();
          processMonitor.on('update', renderApp);
        })
        .catch(reject);

      // Don't allow components to lock-out our control keys, Ctrl-C (exit) and F12 (debug log).
      screen.ignoreLocked = ['C-c', 'f12'];

      screen.key(['C-c'], () => {
        markCleanShutdown();
        resolve();
      });
    });
  } finally {
    // Note that it's important that this resets the terminal before returning the error, otherwise
    // the client won't be able to print the error to the logs.
    teardown();
  }
}
