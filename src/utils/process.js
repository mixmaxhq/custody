export const STATES = {
  RUNNING: 'RUNNING',
  FATAL: 'FATAL'
};

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
  return { state: immediateState, description: immediateDescription};
}
