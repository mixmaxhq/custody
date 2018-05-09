import Console from './components/Console';
import { promisify } from 'promise-callbacks';
import React from 'react';
import {render} from 'react-blessed';
import screen from './screen';
import supervisord from 'supervisord';

export default function start({ port }) {
  const client = promisify.all(supervisord.connect(`http://localhost:${port}`));

  // Rendering the React app using our screen
  render(<Console client={client}/>, screen);

  screen.key(['escape', 'C-c'], () => process.exit(0));

  // Allow components to lock Esc for use in navigation, but not Ctrl-C (exit) or F12 (debug log).
  screen.ignoreLocked = ['C-c', 'f12'];
}
