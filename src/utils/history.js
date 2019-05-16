import { createMemoryHistory } from 'history';

const history = createMemoryHistory({
  // Don't include any initial entry since we don't include the process table in the history.
  initialEntries: []
});

/* Navigation */

export function listen(listener) {
  return history.listen((location) => {
    listener(parsePath(location.pathname));
  });
}

/**
 * @param {String} process - The name of a process.
 */
export function push({ process }) {
  history.push(formatPath({ process }));
}

/**
 * Note that this will still trigger listeners.
 *
 * @param {String} process - The name of a process.
 */
export function replace({ process }) {
  history.replace(formatPath({ process }));
}

export function currentLocation() {
  // Will return `undefined` to start, since we initialize it with `initialEntries: []`.
  const rawLocation = history.location;
  if (!rawLocation) return null;

  return parsePath(rawLocation.pathname);
}

export function previousLocation() {
  const rawLocation = history.entries[history.index - 1];
  if (!rawLocation) return null;

  return parsePath(rawLocation.pathname);
}

export function canGoBack() {
  return history.canGo(-1);
}

export function goBack() {
  history.goBack();
}

export function nextLocation() {
  const rawLocation = history.entries[history.index + 1];
  if (!rawLocation) return null;

  return parsePath(rawLocation.pathname);
}

export function canGoForward() {
  return history.canGo(1);
}

export function goForward() {
  history.goForward();
}

/* Path formatting and parsing */

function formatPath({ process }) {
  // One way to extend this function for additional sorts of locations: add keys to the arguments
  // object, with each key representing the type of path and expecting only one of the keys to
  // be defined for any call.
  //
  // Let's say we added a key "view", with the signature becoming `{ process, view }`. We would then
  // return `/process/${process}` if `process` was defined, otherwise return `/view/${view}`.
  return `/process/${process}`;
}

function parsePath(path) {
  const components = path.match(/^\/(.+?)\/(.+?)$/);
  if (!components) throw new Error(`path was not formatted using formatPath: "${path}"`);

  return { [components[1]]: components[2] };
}
