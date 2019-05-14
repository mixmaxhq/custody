import * as history from '/utils/history';

export function getBackCommand() {
  const previousLocation = history.previousLocation();
  if (!previousLocation) return null;

  const { process: previousProcessName } = history.parsePath(previousLocation.pathname);

  // This conditional is safety belts--we always assume locations to reference processes for the
  // moment.
  if (!previousProcessName) return null;

  return ['left', {
    displayName: '←',
    verb: `switch to "${previousProcessName}"`,
    toggle() {
      history.goBack();
    }
  }];
}

export function getForwardCommand() {
  const nextLocation = history.nextLocation();
  if (!nextLocation) return null;

  const { process: nextProcessName } = history.parsePath(nextLocation.pathname);

  // This conditional is safety belts--we always assume locations to reference processes for the
  // moment.
  if (!nextProcessName) return null;

  return ['right', {
    displayName: '→',
    verb: `switch to "${nextProcessName}"`,
    toggle() {
      history.goForward();
    }
  }];
}
