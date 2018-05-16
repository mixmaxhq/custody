import Console from './components/Console';
import React from 'react';
import {render} from 'react-blessed';
import screen from './screen';
import ProcessMonitor from './utils/processMonitor';

export default async function start({ port }) {
  const processMonitor = new ProcessMonitor({ supervisor: { port } }).on('error', (err) => {
    // TODO(jeff): Distinguish between fatal and non-fatal errors.
    console.error(err);
    process.exit(1);
  });

  function renderApp() {
    render(<Console processes={processMonitor.processes}/>, screen);
  }

  // Load all processes, then render, to avoid a flash as they load in (including probe states).
  await processMonitor.start();
  renderApp();
  processMonitor.on('update', renderApp);

  screen.key(['escape', 'C-c'], () => process.exit(0));

  // Allow components to lock Esc for use in navigation, but not Ctrl-C (exit) or F12 (debug log).
  screen.ignoreLocked = ['C-c', 'f12'];
}
