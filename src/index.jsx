/** @jsx h */
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';
import { h, render } from 'ink';
import Console from './Console';

const client = promisify.all(supervisord.connect('http://localhost:9001'));

const unmount = render(<Console client={client}/>);

// HACK(jeff): Suppress error when unmounting "Cannot read property 'componentWillUnmount' of null".
// The keypress listener we use here is copied from that inside `ink`.
process.stdin.removeAllListeners('keypress');
process.stdin.on('keypress', (ch, key) => {
  if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
    try {
      unmount();
    } catch (e) {
      // See comment above.
    }
  }
});
