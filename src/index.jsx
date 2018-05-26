import cloneDeep from 'lodash.clonedeep';
import Console from '/components/Console';
import React from 'react';
import {render} from 'react-blessed';
import screen from '/screen';
import ProcessMonitor from '/utils/processMonitor/index';

export default function start({ port, notifications }) {
  return new Promise((resolve, reject) => {
    // TODO(jeff): Distinguish between fatal and non-fatal errors.
    const processMonitor = new ProcessMonitor({ supervisor: { port } }).on('error', reject);

    // Load all processes, then render, to avoid a flash as they load in (including probe states).
    processMonitor.start()
      .then(() => {
        function renderApp() {
          render(<Console
            // HACK(jeff): Deep-clone the processes so that the console can diff changes. Although I'm not
            // totally sure if this is hacky, like whose responsibility it should be for deep-cloning.
            processes={cloneDeep(processMonitor.processes)}
            notifications={notifications}
          />, screen);
        }
        renderApp();
        processMonitor.on('update', renderApp);
      })
      .catch(reject);

    // Don't allow components to lock-out our control keys, Ctrl-C (exit) and F12 (debug log).
    screen.ignoreLocked = ['C-c', 'f12'];

    screen.key(['C-c'], () => resolve());
  })
    .catch((err) => {
      // Reset the terminal before returning the error, otherwise the client won't be able to print
      // the error to the logs.
      screen.destroy();
      throw err;
    });
}
