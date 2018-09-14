import { clearShutdown, markCleanShutdown } from '/shutdownTracking';
import Console from '/components/Console';
import restartApproachingOOM from '/oomWorkaround';
import ProcessMonitor from '/utils/processMonitor/index';
import React from 'react';
import {render} from 'react-blessed';
import screen from '/screen';

export default function start({ port, notifications }) {
  let stopOOMCheck;

  function teardown() {
    screen.destroy();
    if (stopOOMCheck) stopOOMCheck();
  }

  return new Promise((resolve, reject) => {
    clearShutdown();

    stopOOMCheck = restartApproachingOOM();

    // TODO(jeff): Distinguish between fatal and non-fatal errors.
    const processMonitor = new ProcessMonitor({ supervisor: { port } }).on('error', reject);

    // Load all processes, then render, to avoid a flash as they load in (including probe states).
    processMonitor.start()
      .then(() => {
        function renderApp() {
          render(<Console
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
  })
    .then(teardown)
    .catch((err) => {
      // Make sure to reset the terminal before returning the error, otherwise the client won't be
      // able to print the error to the logs.
      teardown();
      throw err;
    });
}
