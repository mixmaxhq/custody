import Console from './Console';
import { promisify } from 'promise-callbacks';
import supervisord from 'supervisord';
import React from 'react';
import {render} from 'react-blessed';
import screen from './screen';

const client = promisify.all(supervisord.connect('http://localhost:9001'));

// Rendering the React app using our screen
render(<Console client={client}/>, screen);

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
