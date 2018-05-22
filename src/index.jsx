import cloneDeep from 'lodash.clonedeep';
import Console from './components/Console';
import React from 'react';
import {render} from 'react-blessed';
import screen from './screen';
import ProcessMonitor from './utils/processMonitor';

export default async function start({ port, notifications }) {
  const processMonitor = new ProcessMonitor({ supervisor: { port } }).on('error', (err) => {
    // TODO(jeff): Distinguish between fatal and non-fatal errors.
    console.error(err);
    process.exit(1);
  });

  function renderApp() {
    render(<Console
      // HACK(jeff): Deep-clone the processes so that the console can diff changes. Although I'm not
      // totally sure if this is hacky, like whose responsibility it should be for deep-cloning.
      processes={cloneDeep(processMonitor.processes)}
      notifications={notifications}
    />, screen);
  }

  // Load all processes, then render, to avoid a flash as they load in (including probe states).
  await processMonitor.start();
  renderApp();
  processMonitor.on('update', renderApp);

  screen.key(['C-c'], () => process.exit(0));

  // Don't allow components to lock-out our control keys, Ctrl-C (exit) and F12 (debug log).
  screen.ignoreLocked = ['C-c', 'f12'];
}
