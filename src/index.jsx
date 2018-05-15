import Console from './components/Console';
import React from 'react';
import {render} from 'react-blessed';
import screen from './screen';
import ProcessMonitor from './utils/processMonitor';

function onError(err) {
  // TODO(jeff): Distinguish between fatal and non-fatal errors.
  console.error(err);
  process.exit(1);
}

export default function start({ port }) {
  new ProcessMonitor({ supervisor: { port } })
    .on('update', (processes) => {
      render(<Console processes={processes}/>, screen);
    })
    .on('error', onError)
    .start();

  screen.key(['escape', 'C-c'], () => process.exit(0));

  // Allow components to lock Esc for use in navigation, but not Ctrl-C (exit) or F12 (debug log).
  screen.ignoreLocked = ['C-c', 'f12'];
}
