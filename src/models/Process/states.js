/**
 * States of a process' lifecycle.
 */
export default {
  // The process is starting up.
  STARTING: 'STARTING',

  // The process is running.
  RUNNING: 'RUNNING',

  // The process has been stopped.
  STOPPED: 'STOPPED',

  // The process has exited with an error and will not be restarted.
  FATAL: 'FATAL'
};
