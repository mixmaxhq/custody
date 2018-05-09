import ipc from 'node-ipc';

ipc.config.id = 'custody';

// TODO(jeff): This is copied from https://github.com/RIAEvangelist/node-ipc/blob/master/example/unixWindowsSocket/basic/world-server.js
// Is it necessary to configure this? What's a good value?
ipc.config.retry = 1500;

ipc.config.silent = true;

// Creates a Unix socket server. Doesn't start serving yet.
ipc.serve();

export default ipc.server;
