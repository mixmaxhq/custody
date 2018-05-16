/**
 * States of a process' lifecycle.
 */
export const STATES = {
  // The process is running.
  RUNNING: 'RUNNING',

  // The process has exited with an error and will not be restarted.
  FATAL: 'FATAL'
};

/**
 * Determines the "effective" state and description of a process.
 *
 * Normally this returns the process' own values for this information. However, if the process
 * is running, but a subprocess is not running, then this will return the information for the
 * subprocess since then the top-level process is not actually being effective at doing work.
 *
 * @param {Object} process - The process to analyze.
 *
 * @return {Object}
 *  @param {String} state
 *  @param {String} description
 */
export function effectiveState(process) {
  const immediateState = process.statename;
  const immediateDescription = process.description;
  if (immediateState === STATES.RUNNING) {
    // Defer to child state when the process is running.
    const childState = process.childState;
    const childDescription = process.childDescription;
    if (childState) {
      return { state: childState, description: childDescription };
    }
  }
  return { state: immediateState, description: immediateDescription };
}
