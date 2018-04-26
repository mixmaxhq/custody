/** @jsx h */
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';
import { h, render } from 'ink';
import Console from './Console';

const client = promisify.all(supervisord.connect('http://localhost:9001'));

// `Table` doesn't unmount synchronously or something, so if we let `ink` automatically unmount
// on exit we'll get an error "Cannot read property 'componentWillUnmount' of null".
// TODO(jeff): Figure out how to suppress this.
render(<Console client={client}/>);
