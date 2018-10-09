import { clearShutdown, markCleanShutdown } from '/shutdownTracking';
import { createClient as createSupervisor, getMainLogfile } from '/utils/supervisor';
import Console from '/components/Console';
import {loadPlugins} from '/registry';
import restartApproachingOOM from '/oomWorkaround';
import ProcessMonitor from '/utils/processMonitor/index';
import React from 'react';
import {render} from 'react-blessed';
import screen from '/screen';

export default async function start({ port, notifications }) {
  let stopOOMCheck;

  function teardown() {
    screen.destroy();
    if (stopOOMCheck) stopOOMCheck();
  }

  try {
    clearShutdown();

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
